/**
 * Tax calculation engine for Comicola Legal
 * Vietnamese tax comparison tool for freelance illustrators, 2026
 *
 * Legal basis:
 *   - Luật Thuế TNCN 2025 (số 109/2025/QH15)
 *   - Nghị quyết 110/2025/UBTVQH15 (personal/dependent deductions)
 *   - Nghị định 68/2026/NĐ-CP (HKD tax policy)
 *   - Luật Thuế GTGT 2024 (số 48/2024/QH15)
 *   - Nghị quyết 198/2025/QH15 (abolish thuế khoán, lệ phí môn bài)
 */

// ─── OPTION A CONSTANTS ─────────────────────────────────────────────────────

// BHXH contribution cap: 20x base salary 2,340,000 = 46,800,000 VNĐ/month
const BHXH_CAP = 46_800_000;

// Employee contribution rate: 8% BHXH + 1.5% BHYT + 1% BHTN = 10.5%
const BHXH_RATE = 0.105;

// Personal deductions per Nghị quyết 110/2025/UBTVQH15 (effective 01/01/2026)
const PERSONAL_DEDUCTION = 15_500_000; // 15.5 million/month for taxpayer
const DEPENDENT_DEDUCTION = 6_200_000; // 6.2 million/month per dependent

// Progressive tax brackets — Điều 9, Luật Thuế TNCN 2025 (effective 2026)
// Reduced from 7 brackets to 5 brackets
const TAX_BRACKETS = [
  { limit: 10_000_000,  rate: 0.05 }, // Up to 10M → 5%
  { limit: 30_000_000,  rate: 0.10 }, // 10M–30M  → 10%
  { limit: 60_000_000,  rate: 0.20 }, // 30M–60M  → 20%
  { limit: 100_000_000, rate: 0.30 }, // 60M–100M → 30%
  { limit: Infinity,    rate: 0.35 }, // Over 100M → 35%
];

// ─── OPTION B CONSTANTS ─────────────────────────────────────────────────────

// Tax-free threshold per Điều 4, Nghị định 68/2026/NĐ-CP
const HKD_THRESHOLD = 500_000_000;

// PIT rate for services (dịch vụ) per Điều 7 khoản 3, Luật Thuế TNCN 2025
// Illustration = "dịch vụ" → 2%
const PIT_RATE_SERVICE = 0.02;

// VAT rate for services per Điều 12 khoản 2 điểm c, Luật Thuế GTGT 2024
// "Dịch vụ, xây dựng không bao thầu nguyên vật liệu: 5%"
const VAT_RATE_SERVICE = 0.05;

// Revenue threshold above which HKD must switch to income-based method
const HKD_HIGH_THRESHOLD = 3_000_000_000;

// ─── PROGRESSIVE TAX CALCULATION ────────────────────────────────────────────

/**
 * Calculate progressive income tax on monthly taxable income.
 * Each portion of income is taxed only at its bracket rate (lũy tiến từng phần).
 *
 * @param {number} taxableMonthly - Monthly taxable income in VNĐ
 * @returns {number} Monthly tax amount in VNĐ
 */
function calculateProgressiveTax(taxableMonthly) {
  if (taxableMonthly <= 0) return 0;

  let tax = 0;
  let previousLimit = 0;

  for (const bracket of TAX_BRACKETS) {
    if (taxableMonthly <= previousLimit) break;
    const taxableInBracket = Math.min(taxableMonthly, bracket.limit) - previousLimit;
    tax += Math.max(0, taxableInBracket) * bracket.rate;
    previousLimit = bracket.limit;
  }

  return tax;
}

// ─── OPTION A: PERSONAL INCOME TAX ──────────────────────────────────────────

/**
 * Calculate Personal Income Tax (Thuế TNCN từ tiền lương, tiền công).
 * Assumption: annual revenue = gross salary income.
 *
 * @param {number} annualRevenue - Expected annual revenue in VNĐ
 * @param {number} numberOfDependents - Number of qualifying dependents (0–10)
 * @returns {object} Detailed breakdown of PIT calculation
 */
export function calculatePIT(annualRevenue, numberOfDependents) {
  // Step 1: Monthly gross income
  const monthlyGross = annualRevenue / 12;

  // Step 2: BHXH deduction (capped at 46.8M/month)
  const bhxhBase = Math.min(monthlyGross, BHXH_CAP);
  const bhxhMonthly = bhxhBase * BHXH_RATE;
  const bhxhAnnual = bhxhMonthly * 12;

  // Step 3: Personal + dependent deductions
  const dependentDeductionTotal = DEPENDENT_DEDUCTION * numberOfDependents;
  const totalMonthlyDeduction = PERSONAL_DEDUCTION + dependentDeductionTotal;

  // Step 4: Monthly taxable income
  const taxableMonthly = Math.max(0, monthlyGross - bhxhMonthly - totalMonthlyDeduction);

  // Step 5: Apply progressive tax brackets
  const monthlyTax = calculateProgressiveTax(taxableMonthly);
  const annualTax = monthlyTax * 12;

  // Net income: revenue minus BHXH minus PIT
  const netIncome = annualRevenue - bhxhAnnual - annualTax;

  // Effective tax rate (PIT only, not counting BHXH)
  const effectiveRate = annualRevenue > 0 ? (annualTax / annualRevenue) * 100 : 0;

  return {
    monthlyGross,
    bhxhBase,
    bhxhMonthly,
    bhxhAnnual,
    personalDeduction: PERSONAL_DEDUCTION,
    dependentDeductionTotal,
    totalMonthlyDeduction,
    taxableMonthly,
    monthlyTax,
    annualTax,
    netIncome,
    effectiveRate,
  };
}

// ─── OPTION B: HOUSEHOLD BUSINESS TAX ───────────────────────────────────────

/**
 * Calculate Household Business taxes (Thuế Hộ Kinh Doanh).
 * Method: Tỷ lệ % trên doanh thu (percentage of revenue).
 * Industry: Illustration services = "Dịch vụ"
 *
 * @param {number} annualRevenue - Expected annual revenue in VNĐ
 * @returns {object} Detailed breakdown of HKD tax calculation
 */
export function calculateHKD(annualRevenue) {
  const isExempt = annualRevenue <= HKD_THRESHOLD;
  const isHighRevenue = annualRevenue > HKD_HIGH_THRESHOLD;

  let hkdPIT = 0;
  let hkdVAT = 0;

  if (!isExempt) {
    // PIT: 2% on revenue exceeding 500M threshold
    hkdPIT = (annualRevenue - HKD_THRESHOLD) * PIT_RATE_SERVICE;

    // VAT: 5% on full revenue (no threshold deduction)
    hkdVAT = annualRevenue * VAT_RATE_SERVICE;
  }

  const totalTax = hkdPIT + hkdVAT;
  const netIncome = annualRevenue - totalTax;
  const effectiveRate = annualRevenue > 0 ? (totalTax / annualRevenue) * 100 : 0;

  return {
    annualRevenue,
    threshold: HKD_THRESHOLD,
    taxableRevenuePIT: Math.max(0, annualRevenue - HKD_THRESHOLD),
    hkdPIT,
    hkdVAT,
    totalTax,
    netIncome,
    effectiveRate,
    isExempt,
    isHighRevenue,
  };
}

// ─── MODE 2: COMBINED SALARY + FREELANCE COMPARISON ─────────────────────────

/**
 * Mode 2: Compare Column A ("Không lập HKD" — all income combined as progressive PIT)
 *         vs Column B ("Lập HKD cho freelance" — salary taxed progressively, freelance through HKD).
 *
 * Key rules:
 *   - BHXH is only on salary (never on freelance)
 *   - Personal + dependent deductions are applied only ONCE (at the salary level in Col B,
 *     across total income in Col A)
 *   - Freelance income in Col A is STACKED on top of salary before progressive tax
 *   - HKD does NOT receive personal/dependent deductions
 *
 * @param {number} monthlySalary       - Gross fulltime salary per month (VNĐ)
 * @param {number} annualFreelance     - Total freelance revenue for the year (VNĐ)
 * @param {number} numberOfDependents  - Number of qualifying dependents (0–10)
 * @returns {{ colA: object, colB: object, savings: number, winner: 'hkd'|'noHkd'|'tie' }}
 */
export function compareMode2(monthlySalary, annualFreelance, numberOfDependents) {
  const annualSalary = monthlySalary * 12;
  const totalAnnualIncome = annualSalary + annualFreelance;

  // BHXH — only on fulltime salary (never on freelance income)
  // Per BHXH law: contributions only apply to labor contract income
  const bhxhBase = Math.min(monthlySalary, BHXH_CAP);
  const monthlyBHXH = bhxhBase * BHXH_RATE;
  const annualBHXH = monthlyBHXH * 12;

  const dependentDeductionTotal = DEPENDENT_DEDUCTION * numberOfDependents;
  const totalMonthlyDeduction = PERSONAL_DEDUCTION + dependentDeductionTotal;

  // ── Column A: All income combined (Không lập HKD) ───────────────────────
  // Freelance added to salary, then ALL income taxed progressively together.
  // At year-end finalization: (total annual / 12) − BHXH − deductions → progressive tax.

  const monthlyTotalIncome = totalAnnualIncome / 12;
  const monthlyTaxableA = Math.max(0, monthlyTotalIncome - monthlyBHXH - totalMonthlyDeduction);
  const monthlyTaxA = calculateProgressiveTax(monthlyTaxableA);
  const annualTaxA = monthlyTaxA * 12;

  // 10% withholding: clients already withheld this on each freelance payment ≥ 2M
  // (Điều 25, Thông tư 111/2013/TT-BTC — contracts under 3 months)
  const withheld10Pct = annualFreelance * 0.10;

  // Tax attributable to freelance = total tax − what salary alone would cost
  const monthlyTaxSalaryAlone = calculateProgressiveTax(
    Math.max(0, monthlySalary - monthlyBHXH - totalMonthlyDeduction)
  );
  const annualTaxSalaryAlone = monthlyTaxSalaryAlone * 12;
  const taxOnFreelance = annualTaxA - annualTaxSalaryAlone;

  // refundOrOwed > 0 means client over-withheld → user gets REFUND
  // refundOrOwed < 0 means client under-withheld → user OWES MORE
  const refundOrOwed = withheld10Pct - taxOnFreelance;

  const netIncomeA = totalAnnualIncome - annualBHXH - annualTaxA;
  const effectiveRateA = totalAnnualIncome > 0 ? (annualTaxA / totalAnnualIncome) * 100 : 0;

  const colA = {
    annualSalary,
    annualFreelance,
    totalAnnualIncome,
    monthlyTotalIncome,
    monthlyBHXH,
    annualBHXH,
    personalDeduction: PERSONAL_DEDUCTION,
    dependentDeductionTotal,
    totalMonthlyDeduction,
    monthlyTaxableA,
    monthlyTaxA,
    annualTaxA,
    withheld10Pct,
    taxOnFreelance,
    refundOrOwed,
    netIncomeA,
    effectiveRateA,
  };

  // ── Column B: Split — salary progressive + HKD on freelance ─────────────
  // Personal/dependent deductions are applied ONLY to salary (once, not twice).
  // HKD does not get personal deductions.

  const monthlyTaxableSalary = Math.max(0, monthlySalary - monthlyBHXH - totalMonthlyDeduction);
  const monthlyTaxSalary = calculateProgressiveTax(monthlyTaxableSalary);
  const annualTaxSalary = monthlyTaxSalary * 12;

  // HKD on freelance revenue
  const isExempt = annualFreelance <= HKD_THRESHOLD;
  const isHighRevenue = annualFreelance > HKD_HIGH_THRESHOLD;
  let hkdPIT = 0;
  let hkdVAT = 0;
  if (!isExempt) {
    hkdPIT = (annualFreelance - HKD_THRESHOLD) * PIT_RATE_SERVICE;
    hkdVAT = annualFreelance * VAT_RATE_SERVICE;
  }
  const totalHKDTax = hkdPIT + hkdVAT;

  const annualTaxB = annualTaxSalary + totalHKDTax;
  const netIncomeB = totalAnnualIncome - annualBHXH - annualTaxB;
  const effectiveRateB = totalAnnualIncome > 0 ? (annualTaxB / totalAnnualIncome) * 100 : 0;

  const colB = {
    annualSalary,
    annualFreelance,
    totalAnnualIncome,
    monthlySalary,
    monthlyBHXH,
    annualBHXH,
    personalDeduction: PERSONAL_DEDUCTION,
    dependentDeductionTotal,
    totalMonthlyDeduction,
    monthlyTaxableSalary,
    monthlyTaxSalary,
    annualTaxSalary,
    isExempt,
    isHighRevenue,
    hkdPIT,
    hkdVAT,
    totalHKDTax,
    annualTaxB,
    netIncomeB,
    effectiveRateB,
  };

  // Comparison
  const rawSavings = annualTaxA - annualTaxB;
  let winner;
  if (isExempt && annualFreelance > 0) {
    winner = 'hkd'; // freelance fully exempt → always worth it
  } else if (Math.abs(rawSavings) < 100_000) {
    winner = 'tie';
  } else if (rawSavings > 0) {
    winner = 'hkd';
  } else {
    winner = 'noHkd';
  }

  return { colA, colB, savings: Math.abs(rawSavings), winner };
}

// ─── COMPARISON ──────────────────────────────────────────────────────────────

/**
 * Compare both tax options and return the full result object.
 *
 * @param {number} annualRevenue
 * @param {number} numberOfDependents
 * @returns {{ pit: object, hkd: object, savings: number, winner: 'pit'|'hkd'|'tie' }}
 */
export function compare(annualRevenue, numberOfDependents) {
  const pit = calculatePIT(annualRevenue, numberOfDependents);
  const hkd = calculateHKD(annualRevenue);

  // savings > 0 means HKD pays less (HKD wins)
  const savings = pit.annualTax - hkd.totalTax;

  let winner;
  if (hkd.isExempt) {
    winner = 'hkd'; // HKD is fully exempt, PIT still applies
  } else if (Math.abs(savings) < 100_000) {
    winner = 'tie';
  } else if (savings > 0) {
    winner = 'hkd';
  } else {
    winner = 'pit';
  }

  return { pit, hkd, savings: Math.abs(savings), winner };
}
