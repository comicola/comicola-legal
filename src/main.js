/**
 * UI controller for Comicola Legal
 * Handles input, formatting, debouncing, and rendering results.
 * Supports Mode 1 (freelance only) and Mode 2 (fulltime salary + freelance).
 */

import { compare, compareMode2 } from './calculator.js';

// ─── NUMBER FORMATTING ───────────────────────────────────────────────────────

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + '\u00a0₫';
}

function formatNumber(amount) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount));
}

function parseVND(str) {
  return parseInt(str.replace(/\D/g, ''), 10) || 0;
}

// ─── DOM REFERENCES ──────────────────────────────────────────────────────────

const inputSection  = document.getElementById('input-section');
const compactBar    = document.getElementById('compact-bar');
const compactRevenue = document.getElementById('compact-revenue');
const compactMeta    = document.getElementById('compact-meta');

// Mode toggle
const modeBtns      = document.querySelectorAll('.mode-btn');
const mode1Inputs   = document.getElementById('mode1-inputs');
const mode2Inputs   = document.getElementById('mode2-inputs');

// Mode 1
const revenueInput  = document.getElementById('revenue-input');

// Mode 2
const salaryInput   = document.getElementById('salary-input');
const freelanceInput = document.getElementById('freelance-input');

// Shared
const depMinus      = document.getElementById('dep-minus');
const depPlus       = document.getElementById('dep-plus');
const depCount      = document.getElementById('dep-count');
const emptyState    = document.getElementById('empty-state');
const resultsEl     = document.getElementById('results');

// Cards
const cardPit       = document.getElementById('card-pit');
const cardHkd       = document.getElementById('card-hkd');
const cardPitTitle  = document.getElementById('card-pit-title');
const cardHkdTitle  = document.getElementById('card-hkd-title');
const pitDetails    = document.getElementById('pit-details');
const pitTotalTax   = document.getElementById('pit-total-tax');
const pitNetLabel   = document.getElementById('pit-net-label');
const pitNetIncome  = document.getElementById('pit-net-income');
const pitEffRate    = document.getElementById('pit-effective-rate');
const pitWinnerBadge = document.getElementById('pit-winner-badge');
const pitTotalRow   = document.getElementById('pit-total-row');
const hkdDetails    = document.getElementById('hkd-details');
const hkdTotalTax   = document.getElementById('hkd-total-tax');
const hkdNetLabel   = document.getElementById('hkd-net-label');
const hkdNetIncome  = document.getElementById('hkd-net-income');
const hkdEffRate    = document.getElementById('hkd-effective-rate');
const hkdWinnerBadge = document.getElementById('hkd-winner-badge');
const hkdTotalRow   = document.getElementById('hkd-total-row');
const hkdWarning    = document.getElementById('hkd-warning');
const verdictBanner    = document.getElementById('verdict-banner');
const cashflowSection  = document.getElementById('cashflow-section');

// ─── STATE ───────────────────────────────────────────────────────────────────

let currentMode       = 'mode1';
let annualRevenue     = 0;         // mode 1
let monthlySalary     = 20_000_000; // mode 2 (persisted, default 20M)
let annualFreelance   = 0;          // mode 2 (persisted)
let numberOfDependents = 0;
let debounceTimer     = null;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Build a single detail row.
 * @param {string} label
 * @param {string|number} value
 * @param {'normal'|'deduction'|'subtotal'} type
 * @param {boolean} isNegative
 */
function makeDetailRow(label, value, type = 'normal', isNegative = false) {
  const row = document.createElement('div');
  row.className = 'detail-row' + (type !== 'normal' ? ` ${type}` : '');

  const labelEl = document.createElement('span');
  labelEl.className = 'label';
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.className = 'value';
  const formatted = typeof value === 'number' ? formatVND(value) : value;
  valueEl.textContent = isNegative ? '−\u202f' + formatted : formatted;

  row.appendChild(labelEl);
  row.appendChild(valueEl);
  return row;
}

/** Build a bold section header row inside a card (used for Mode 2 Card B). */
function makeSectionHeader(text) {
  const el = document.createElement('div');
  el.className = 'card-section-header';
  el.textContent = text;
  return el;
}

/** Re-trigger entry animation on a card element. */
function reAnimateCard(el) {
  el.style.animation = 'none';
  el.style.opacity = '0';
  void el.offsetHeight;
  el.style.animation = '';
}

/** Format a live input field with Vietnamese thousand separators, preserving cursor. */
function reformatInput(inputEl) {
  const raw = parseVND(inputEl.value);
  if (raw > 0) {
    const formatted = formatNumber(raw);
    if (inputEl.value !== formatted) {
      const selStart = inputEl.selectionStart;
      const prevLen  = inputEl.value.length;
      inputEl.value  = formatted;
      const newLen   = formatted.length;
      const newPos   = Math.max(0, selStart + (newLen - prevLen));
      inputEl.setSelectionRange(newPos, newPos);
    }
  } else if (inputEl.value.replace(/\D/g, '') === '') {
    inputEl.value = '';
  }
}

// ─── VERDICT BANNER RESET ────────────────────────────────────────────────────

function resetVerdict() {
  verdictBanner.className = '';
  verdictBanner.style.animation = 'none';
  void verdictBanner.offsetHeight;
  verdictBanner.style.animation = '';
}

// ─── WINNER BADGE HELPERS ────────────────────────────────────────────────────

function applyWinnerState(card, badge, totalRowEl, isWinner) {
  badge.style.display = isWinner ? '' : 'none';
  card.classList.toggle('winner', isWinner);
  totalRowEl.querySelector('.total-value').classList.toggle('winner-row', isWinner);
}

// ─── RENDER: MODE 1 (freelance only — original behavior) ─────────────────────

function renderMode1() {
  if (annualRevenue <= 0) {
    emptyState.style.display = '';
    resultsEl.style.display  = 'none';
    return;
  }

  const { pit, hkd, savings, winner } = compare(annualRevenue, numberOfDependents);

  emptyState.style.display = 'none';
  resultsEl.style.display  = '';
  reAnimateCard(cardPit);
  reAnimateCard(cardHkd);

  // ── Card A: PIT ───────────────────────────────────────────────────────────
  cardPitTitle.textContent = 'Đóng thuế TNCN cá nhân';
  pitNetLabel.textContent  = 'Thu nhập thực nhận';
  pitDetails.innerHTML = '';
  pitDetails.appendChild(makeDetailRow('Thu nhập tháng', pit.monthlyGross));

  // BHXH note — freelancers have no HĐLĐ, so no BHXH deduction applies
  const bhxhNote = document.createElement('p');
  bhxhNote.style.cssText = 'font-size:0.75rem;color:rgba(26,31,54,0.5);line-height:1.5;padding:0.25rem 0;';
  bhxhNote.textContent = 'ℹ️ Freelancer không có HĐLĐ → không đóng BHXH bắt buộc, không được trừ BHXH khi tính thuế';
  pitDetails.appendChild(bhxhNote);

  pitDetails.appendChild(makeDetailRow('Giảm trừ bản thân', pit.personalDeduction, 'deduction', true));
  if (numberOfDependents > 0) {
    pitDetails.appendChild(makeDetailRow(
      `Giảm trừ NPT (${numberOfDependents} người × 6,2 tr)`,
      pit.dependentDeductionTotal, 'deduction', true,
    ));
  }
  pitDetails.appendChild(makeDetailRow('Thu nhập tính thuế/tháng', pit.taxableMonthly, 'subtotal'));
  pitDetails.appendChild(makeDetailRow('Thuế TNCN/tháng', pit.monthlyTax));

  pitTotalTax.textContent  = formatVND(pit.annualTax);
  pitNetIncome.textContent = formatVND(pit.netIncome);
  pitEffRate.textContent   = pit.effectiveRate.toFixed(1) + '%';
  applyWinnerState(cardPit, pitWinnerBadge, pitTotalRow, winner === 'pit');

  // ── Card B: HKD ─────────────────────────────────────────────────────────
  cardHkdTitle.textContent = 'Thành lập Hộ Kinh Doanh';
  hkdNetLabel.textContent  = 'Thu nhập sau thuế';
  hkdDetails.innerHTML = '';
  hkdDetails.appendChild(makeDetailRow('Doanh thu năm', hkd.annualRevenue));

  if (hkd.isExempt) {
    const exemptEl = document.createElement('div');
    exemptEl.style.cssText = 'text-align:center;padding:0.5rem 0;';
    exemptEl.innerHTML = '<span class="exempt-badge">✓ Miễn thuế hoàn toàn</span>';
    hkdDetails.appendChild(exemptEl);
    const noteEl = document.createElement('p');
    noteEl.style.cssText = 'font-size:0.8125rem;color:rgba(26,31,54,0.6);margin-top:0.5rem;line-height:1.5;';
    noteEl.textContent = 'Doanh thu ≤ 500 triệu không phải nộp bất kỳ loại thuế nào (Điều 4, Nghị định 68/2026).';
    hkdDetails.appendChild(noteEl);
  } else {
    hkdDetails.appendChild(makeDetailRow('Ngưỡng miễn thuế', 500_000_000, 'deduction', true));
    hkdDetails.appendChild(makeDetailRow('Doanh thu tính thuế TNCN', hkd.taxableRevenuePIT, 'subtotal'));
    hkdDetails.appendChild(makeDetailRow('Thuế TNCN (2% × doanh thu vượt)', hkd.hkdPIT));
    hkdDetails.appendChild(makeDetailRow('Thuế GTGT (5% × toàn bộ doanh thu)', hkd.hkdVAT));
  }

  hkdTotalTax.textContent  = formatVND(hkd.totalTax);
  hkdNetIncome.textContent = formatVND(hkd.netIncome);
  hkdEffRate.textContent   = hkd.effectiveRate.toFixed(1) + '%';
  applyWinnerState(cardHkd, hkdWinnerBadge, hkdTotalRow, winner === 'hkd');
  hkdWarning.style.display = hkd.isHighRevenue ? '' : 'none';

  // ── Verdict ────────────────────────────────────────────────────────────────
  resetVerdict();
  if (hkd.isExempt) {
    verdictBanner.className = 'verdict-tie';
    verdictBanner.innerHTML = `
      <div style="font-size:1.5rem;margin-bottom:0.375rem;">✅</div>
      <p style="font-size:1rem;font-weight:700;color:#065f46;margin-bottom:0.25rem;">
        Với mức doanh thu này, bạn không cần đóng thuế nếu thành lập HKD
      </p>
      <p style="font-size:0.875rem;color:rgba(6,95,70,0.75);">
        Doanh thu ≤ 500 triệu được miễn toàn bộ thuế HKD — bạn chỉ nộp thuế TNCN nếu đăng ký theo hình thức cá nhân.
      </p>`;
  } else if (winner === 'tie') {
    verdictBanner.className = 'verdict-tie';
    verdictBanner.innerHTML = `
      <div style="font-size:1.5rem;margin-bottom:0.375rem;">⚖️</div>
      <p style="font-size:1rem;font-weight:700;color:#065f46;">Hai phương án gần tương đương nhau</p>
      <p style="font-size:0.875rem;color:rgba(6,95,70,0.75);margin-top:0.25rem;">
        Chênh lệch dưới 100.000 ₫ — hãy cân nhắc yếu tố khác như thủ tục hành chính.
      </p>`;
  } else if (winner === 'hkd') {
    verdictBanner.className = 'verdict-hkd';
    verdictBanner.innerHTML = `
      <div style="font-size:1.5rem;margin-bottom:0.375rem;">🏆</div>
      <p style="font-size:1rem;font-weight:700;color:var(--color-navy);margin-bottom:0.25rem;">Thành lập HKD giúp bạn tiết kiệm</p>
      <p style="font-size:1.5rem;font-weight:800;color:var(--color-gold);margin:0.25rem 0;">${formatVND(savings)}/năm</p>
      <p style="font-size:0.875rem;color:rgba(26,31,54,0.65);">so với đóng thuế TNCN cá nhân</p>`;
  } else {
    verdictBanner.className = 'verdict-pit';
    verdictBanner.innerHTML = `
      <div style="font-size:1.5rem;margin-bottom:0.375rem;">🏆</div>
      <p style="font-size:1rem;font-weight:700;color:var(--color-navy);margin-bottom:0.25rem;">Đóng thuế TNCN cá nhân giúp bạn tiết kiệm</p>
      <p style="font-size:1.5rem;font-weight:800;color:var(--color-navy);margin:0.25rem 0;">${formatVND(savings)}/năm</p>
      <p style="font-size:0.875rem;color:rgba(26,31,54,0.65);">so với thành lập Hộ Kinh Doanh</p>`;
  }

  // ── Cash Flow Timeline ────────────────────────────────────────────────────
  const totalWithheld = annualRevenue * 0.10;
  renderCashFlow({
    mode: 'mode1',
    freelanceRevenue: annualRevenue,
    totalWithheld,
    actualTaxNoHKD: pit.annualTax,
    refundOrOwe:    totalWithheld - pit.annualTax,
    totalHKDTax:    hkd.totalTax,
    hkdPIT:         hkd.hkdPIT,
    hkdVAT:         hkd.hkdVAT,
    isExempt:       hkd.isExempt,
  });
}

// ─── RENDER: MODE 2 (fulltime salary + freelance) ────────────────────────────

function renderMode2() {
  const hasInput = monthlySalary > 0 || annualFreelance > 0;

  if (!hasInput) {
    emptyState.style.display = '';
    resultsEl.style.display  = 'none';
    return;
  }

  const { colA, colB, savings, winner } = compareMode2(monthlySalary, annualFreelance, numberOfDependents);

  emptyState.style.display = 'none';
  resultsEl.style.display  = '';
  reAnimateCard(cardPit);
  reAnimateCard(cardHkd);

  // ── Card A: "Không lập HKD" ───────────────────────────────────────────────
  cardPitTitle.textContent = 'Không lập HKD — Gộp tất cả làm TNCN';
  pitNetLabel.textContent  = 'Thu nhập thực nhận';
  pitDetails.innerHTML = '';

  // Income breakdown
  pitDetails.appendChild(makeSectionHeader('Thu nhập'));
  pitDetails.appendChild(makeDetailRow(`Lương fulltime (${formatNumber(monthlySalary)} × 12)`, colA.annualSalary));
  pitDetails.appendChild(makeDetailRow('Thu nhập freelance', colA.annualFreelance));
  pitDetails.appendChild(makeDetailRow('Tổng thu nhập năm', colA.totalAnnualIncome, 'subtotal'));

  // Deductions
  pitDetails.appendChild(makeSectionHeader('Các khoản trừ'));
  pitDetails.appendChild(makeDetailRow('BHXH (10,5% × lương)', colA.annualBHXH, 'deduction', true));
  pitDetails.appendChild(makeDetailRow('Giảm trừ bản thân (15,5 tr × 12)', colA.personalDeduction * 12, 'deduction', true));
  if (numberOfDependents > 0) {
    pitDetails.appendChild(makeDetailRow(
      `Giảm trừ NPT (${numberOfDependents} người × 6,2 tr × 12)`,
      colA.dependentDeductionTotal * 12, 'deduction', true,
    ));
  }

  // Tax calculation
  pitDetails.appendChild(makeSectionHeader('Tính thuế (lũy tiến gộp)'));
  pitDetails.appendChild(makeDetailRow('Thu nhập tính thuế/tháng', colA.monthlyTaxableA, 'subtotal'));
  pitDetails.appendChild(makeDetailRow('Thuế TNCN/tháng', colA.monthlyTaxA));

  // 10% withholding note
  if (annualFreelance > 0) {
    const noteEl = document.createElement('div');
    noteEl.className = 'withholding-note';
    const refund = colA.refundOrOwed >= 0;
    const amount = Math.abs(colA.refundOrOwed);
    noteEl.innerHTML = `
      <div style="margin-top:0.625rem;padding:0.625rem 0.875rem;background:${refund ? '#f0fdf4' : '#fffbeb'};border:1px solid ${refund ? '#86efac' : '#fcd34d'};border-radius:0.625rem;font-size:0.8125rem;line-height:1.6;">
        <strong>📌 Khấu trừ 10% tại nguồn (freelance):</strong> ${formatVND(colA.withheld10Pct)}<br>
        Thuế thực tế phần freelance: ${formatVND(colA.taxOnFreelance)}<br>
        → Khi quyết toán bạn sẽ <strong style="color:${refund ? '#059669' : '#b45309'};">${refund ? 'được hoàn' : 'phải nộp thêm'} ${formatVND(amount)}</strong>
      </div>`;
    pitDetails.appendChild(noteEl);
  }

  pitTotalTax.textContent  = formatVND(colA.annualTaxA);
  pitNetIncome.textContent = formatVND(colA.netIncomeA);
  pitEffRate.textContent   = colA.effectiveRateA.toFixed(1) + '%';
  applyWinnerState(cardPit, pitWinnerBadge, pitTotalRow, winner === 'noHkd');

  // ── Card B: "Lập HKD cho phần freelance" ─────────────────────────────────
  cardHkdTitle.textContent = 'Lập HKD cho phần freelance';
  hkdNetLabel.textContent  = 'Thu nhập sau thuế';
  hkdDetails.innerHTML = '';

  // Income summary
  hkdDetails.appendChild(makeSectionHeader('Thu nhập'));
  hkdDetails.appendChild(makeDetailRow(`Lương fulltime (${formatNumber(monthlySalary)} × 12)`, colB.annualSalary));
  hkdDetails.appendChild(makeDetailRow('Doanh thu HKD (freelance)', colB.annualFreelance));
  hkdDetails.appendChild(makeDetailRow('Tổng', colB.totalAnnualIncome, 'subtotal'));

  // Part 1: salary progressive tax
  hkdDetails.appendChild(makeSectionHeader('Phần 1 — Thuế lương (lũy tiến)'));
  hkdDetails.appendChild(makeDetailRow('Lương/tháng', colB.monthlySalary));
  hkdDetails.appendChild(makeDetailRow('BHXH (10,5%)', colB.monthlyBHXH, 'deduction', true));
  hkdDetails.appendChild(makeDetailRow('Giảm trừ bản thân', colB.personalDeduction, 'deduction', true));
  if (numberOfDependents > 0) {
    hkdDetails.appendChild(makeDetailRow(
      `Giảm trừ NPT (${numberOfDependents} người × 6,2 tr)`,
      colB.dependentDeductionTotal, 'deduction', true,
    ));
  }
  hkdDetails.appendChild(makeDetailRow('Thu nhập tính thuế/tháng', colB.monthlyTaxableSalary, 'subtotal'));
  hkdDetails.appendChild(makeDetailRow('Thuế lương/năm', colB.annualTaxSalary));

  // Part 2: HKD on freelance
  hkdDetails.appendChild(makeSectionHeader('Phần 2 — Thuế HKD (dịch vụ minh họa)'));
  if (annualFreelance === 0) {
    const noHkdEl = document.createElement('p');
    noHkdEl.style.cssText = 'font-size:0.8125rem;color:rgba(26,31,54,0.55);padding:0.25rem 0;';
    noHkdEl.textContent = 'Không có thu nhập HKD';
    hkdDetails.appendChild(noHkdEl);
  } else if (colB.isExempt) {
    hkdDetails.appendChild(makeDetailRow('Doanh thu freelance', colB.annualFreelance));
    const exemptEl = document.createElement('div');
    exemptEl.style.cssText = 'text-align:center;padding:0.375rem 0;';
    exemptEl.innerHTML = '<span class="exempt-badge">✓ Miễn thuế hoàn toàn (≤ 500 tr)</span>';
    hkdDetails.appendChild(exemptEl);
    const noteEl = document.createElement('p');
    noteEl.style.cssText = 'font-size:0.75rem;color:rgba(26,31,54,0.55);line-height:1.5;';
    noteEl.textContent = 'Doanh thu freelance ≤ 500 triệu → không nộp bất kỳ loại thuế HKD nào.';
    hkdDetails.appendChild(noteEl);
  } else {
    hkdDetails.appendChild(makeDetailRow('Doanh thu freelance', colB.annualFreelance));
    hkdDetails.appendChild(makeDetailRow('Ngưỡng miễn thuế', 500_000_000, 'deduction', true));
    hkdDetails.appendChild(makeDetailRow('Thuế TNCN HKD (2% × vượt ngưỡng)', colB.hkdPIT));
    hkdDetails.appendChild(makeDetailRow('Thuế GTGT (5% × toàn bộ doanh thu)', colB.hkdVAT));
    hkdDetails.appendChild(makeDetailRow('Thuế HKD/năm', colB.totalHKDTax, 'subtotal'));
  }

  hkdTotalTax.textContent  = formatVND(colB.annualTaxB);
  hkdNetIncome.textContent = formatVND(colB.netIncomeB);
  hkdEffRate.textContent   = colB.effectiveRateB.toFixed(1) + '%';
  applyWinnerState(cardHkd, hkdWinnerBadge, hkdTotalRow, winner === 'hkd');

  // Show >3B warning if freelance is high
  hkdWarning.style.display = colB.isHighRevenue ? '' : 'none';
  if (colB.isHighRevenue) {
    hkdWarning.textContent = '⚠️ Với doanh thu HKD trên 3 tỷ, bắt buộc tính thuế theo phương pháp thu nhập (doanh thu − chi phí) với thuế suất 17%. Công cụ này dùng phương pháp tỷ lệ % để tham khảo.';
  }

  // ── Verdict ────────────────────────────────────────────────────────────────
  resetVerdict();
  if (colB.isExempt && annualFreelance > 0) {
    verdictBanner.className = 'verdict-hkd';
    verdictBanner.innerHTML = `
      <div style="font-size:1.5rem;margin-bottom:0.375rem;">✨</div>
      <p style="font-size:1rem;font-weight:700;color:var(--color-navy);margin-bottom:0.25rem;">
        Doanh thu freelance ≤ 500 triệu → Lập HKD = miễn thuế hoàn toàn phần freelance!
      </p>
      <p style="font-size:0.875rem;color:rgba(26,31,54,0.65);">
        Bạn chỉ đóng thuế trên phần lương fulltime — tiết kiệm <strong>${formatVND(savings)}</strong>/năm so với không lập HKD.
      </p>`;
  } else if (winner === 'tie') {
    verdictBanner.className = 'verdict-tie';
    verdictBanner.innerHTML = `
      <div style="font-size:1.5rem;margin-bottom:0.375rem;">⚖️</div>
      <p style="font-size:1rem;font-weight:700;color:#065f46;">Hai phương án gần tương đương nhau</p>
      <p style="font-size:0.875rem;color:rgba(6,95,70,0.75);margin-top:0.25rem;">
        Chênh lệch dưới 100.000 ₫ — hãy cân nhắc yếu tố hành chính khi lập HKD.
      </p>`;
  } else if (winner === 'hkd') {
    verdictBanner.className = 'verdict-hkd';
    verdictBanner.innerHTML = `
      <div style="font-size:1.5rem;margin-bottom:0.375rem;">🏆</div>
      <p style="font-size:1rem;font-weight:700;color:var(--color-navy);margin-bottom:0.25rem;">
        Lập HKD giúp bạn tiết kiệm
      </p>
      <p style="font-size:1.5rem;font-weight:800;color:var(--color-gold);margin:0.25rem 0;">${formatVND(savings)}/năm</p>
      <p style="font-size:0.875rem;color:rgba(26,31,54,0.65);">
        vì thu nhập freelance không bị cộng dồn vào bậc thuế cao
      </p>`;
  } else {
    verdictBanner.className = 'verdict-pit';
    verdictBanner.innerHTML = `
      <div style="font-size:1.5rem;margin-bottom:0.375rem;">💡</div>
      <p style="font-size:1rem;font-weight:700;color:var(--color-navy);margin-bottom:0.25rem;">
        Với mức thu nhập này, không lập HKD lại có lợi hơn
      </p>
      <p style="font-size:1.5rem;font-weight:800;color:var(--color-navy);margin:0.25rem 0;">${formatVND(savings)}/năm</p>
      <p style="font-size:0.875rem;color:rgba(26,31,54,0.65);">
        Hãy cân nhắc thêm chi phí và thủ tục hành chính khi lập HKD.
      </p>`;
  }

  // ── Cash Flow Timeline (freelance portion only) ───────────────────────────
  renderCashFlow({
    mode: 'mode2',
    freelanceRevenue: annualFreelance,
    totalWithheld:   colA.withheld10Pct,
    actualTaxNoHKD:  colA.taxOnFreelance,
    refundOrOwe:     colA.refundOrOwed,
    totalHKDTax:     colB.totalHKDTax,
    hkdPIT:          colB.hkdPIT,
    hkdVAT:          colB.hkdVAT,
    isExempt:        colB.isExempt,
  });
}

// ─── CASH FLOW TIMELINE ──────────────────────────────────────────────────────

/**
 * Render the cash flow timeline section.
 *
 * @param {object} p
 *   mode             - 'mode1' | 'mode2'
 *   freelanceRevenue - annual freelance income (Mode 1: total; Mode 2: freelance portion)
 *   totalWithheld    - 10% of freelanceRevenue (what clients keep)
 *   actualTaxNoHKD   - actual PIT on freelance income (Mode 1: pit.annualTax; Mode 2: colA.taxOnFreelance)
 *   refundOrOwe      - totalWithheld − actualTaxNoHKD (positive = refund, negative = owe more)
 *   totalHKDTax      - total HKD tax (PIT 2% + VAT 5%)
 *   hkdPIT           - HKD PIT component
 *   hkdVAT           - HKD VAT component
 *   isExempt         - freelanceRevenue ≤ 500M
 */
function renderCashFlow(p) {
  if (p.freelanceRevenue <= 0) {
    cashflowSection.style.display = 'none';
    return;
  }

  cashflowSection.style.display = '';

  const qRev        = p.freelanceRevenue / 4;
  const qWithheld   = qRev * 0.10;
  const qReceived_A = qRev * 0.90;
  const qTax_HKD    = p.totalHKDTax / 4;
  const refundPos   = p.refundOrOwe >= 0;
  const refundAbs   = Math.abs(p.refundOrOwe);

  // Cash flow advantage: how much MORE cash HKD artist has access to during the year
  // = total withheld (not taken) − HKD taxes paid throughout year
  const cfAdvantage = p.totalWithheld - p.totalHKDTax;

  const QUARTERS = [
    { label: 'Q1 — Tháng 1-3',   deadline: '30/4/2026' },
    { label: 'Q2 — Tháng 4-6',   deadline: '31/7/2026' },
    { label: 'Q3 — Tháng 7-9',   deadline: '31/10/2026' },
    { label: 'Q4 — Tháng 10-12', deadline: '31/1/2027' },
  ];

  // ── Card A: No HKD rows ───────────────────────────────────────────────────
  const rowsA = QUARTERS.map(q => `
    <div class="cf-qrow">
      <span class="cf-qlabel">${q.label}</span>
      <div class="cf-qamounts">
        <span class="cf-inflow">+${formatVND(qReceived_A)}</span>
        <span class="cf-outflow cf-withheld">−${formatVND(qWithheld)} bị giữ lại</span>
      </div>
    </div>`).join('');

  const finalizationRow = `
    <div class="cf-qrow cf-finalization">
      <span class="cf-qlabel">Tháng 4/2027 — Quyết toán thuế</span>
      <div class="cf-qamounts">
        <span class="${refundPos ? 'cf-refund' : 'cf-owe'}">
          ${refundPos
            ? `+${formatVND(refundAbs)} hoàn thuế (chờ 6–40 ngày)`
            : `−${formatVND(refundAbs)} phải nộp thêm (!)`}
        </span>
      </div>
    </div>`;

  const netA = p.freelanceRevenue - p.actualTaxNoHKD;

  // ── Card B: HKD rows ──────────────────────────────────────────────────────
  const rowsB = QUARTERS.map(q => `
    <div class="cf-qrow">
      <span class="cf-qlabel">${q.label}</span>
      <div class="cf-qamounts">
        <span class="cf-inflow">+${formatVND(qRev)} (nhận full)</span>
        ${p.isExempt
          ? '<span class="cf-exempt-tag">✓ Không nộp thuế</span>'
          : `<span class="cf-outflow cf-tax">−${formatVND(qTax_HKD)} thuế (trước ${q.deadline})</span>`}
      </div>
    </div>`).join('');

  const netB = p.freelanceRevenue - p.totalHKDTax;

  // ── Advantage callout text ────────────────────────────────────────────────
  let advantageHtml = '';
  if (p.isExempt) {
    advantageHtml = `
      <div class="cf-advantage">
        <span class="cf-advantage-icon">✨</span>
        <p>Với HKD, bạn <strong>không bị khấu trừ ${formatVND(p.totalWithheld)}</strong> trong năm.
        Toàn bộ tiền nằm trong tay bạn — không cần chờ hoàn thuế.</p>
      </div>`;
  } else if (cfAdvantage > 0) {
    advantageHtml = `
      <div class="cf-advantage">
        <span class="cf-advantage-icon">⚡</span>
        <p>Với HKD, bạn có thêm <strong>${formatVND(cfAdvantage)}</strong> xoay vòng trong năm,
        thay vì bị giữ lại và phải chờ hoàn thuế vào tháng 4 năm sau.</p>
      </div>`;
  } else if (!refundPos) {
    // No HKD case where artist owes more at finalization — extra powerful
    advantageHtml = `
      <div class="cf-advantage">
        <span class="cf-advantage-icon">⚠️</span>
        <p>Không có HKD: bạn bị giữ <strong>${formatVND(p.totalWithheld)}</strong> trong năm,
        rồi còn phải <strong>nộp thêm ${formatVND(refundAbs)}</strong> lúc quyết toán vì thu nhập
        cộng dồn đẩy vào bậc thuế cao hơn. HKD giúp bạn tránh hoàn toàn tình huống này.</p>
      </div>`;
  }

  const mode2Note = p.mode === 'mode2'
    ? '<p class="cf-mode2-note">📌 Chỉ hiển thị phần freelance — dòng tiền lương fulltime giống nhau ở cả hai phương án</p>'
    : '';

  cashflowSection.innerHTML = `
    <div class="cf-header">
      <h3 class="cf-title font-display">💸 So sánh dòng tiền thực tế trong năm</h3>
      <p class="cf-subtitle-text">Tiền của bạn vào — ra như thế nào trong suốt năm 2026${p.mode === 'mode2' ? ' (phần thu nhập freelance)' : ''}</p>
    </div>
    ${mode2Note}
    <div class="cf-grid">

      <div class="cf-card cf-card--noHKD">
        <div class="cf-card-label">
          <span class="cf-dot cf-dot--red"></span>
          Không có HKD — Bị khấu trừ 10%
        </div>
        <div class="cf-timeline">
          ${rowsA}
          ${finalizationRow}
        </div>
        <div class="cf-card-total">
          <div class="cf-total-row">
            <span>Nhận trong 2026</span>
            <span class="cf-inflow">${formatVND(p.freelanceRevenue - p.totalWithheld)}</span>
          </div>
          <div class="cf-total-row">
            <span>${refundPos ? 'Hoàn thuế (Apr 2027)' : 'Nộp thêm (Apr 2027)'}</span>
            <span class="${refundPos ? 'cf-refund' : 'cf-owe'}">${refundPos ? '+' : '−'}${formatVND(refundAbs)}</span>
          </div>
          <div class="cf-total-row cf-total-final">
            <span>Ròng sau tất cả</span>
            <span>${formatVND(netA)}</span>
          </div>
        </div>
      </div>

      <div class="cf-card cf-card--HKD">
        <div class="cf-card-label">
          <span class="cf-dot cf-dot--gold"></span>
          Có HKD — Nhận full, đóng sau
        </div>
        <div class="cf-timeline">
          ${rowsB}
        </div>
        <div class="cf-card-total">
          <div class="cf-total-row">
            <span>Nhận trong 2026</span>
            <span class="cf-inflow">${formatVND(p.freelanceRevenue)}</span>
          </div>
          <div class="cf-total-row">
            <span>Tổng thuế HKD cả năm</span>
            <span class="cf-outflow cf-tax">${p.isExempt ? '0 ₫' : '−' + formatVND(p.totalHKDTax)}</span>
          </div>
          ${!p.isExempt ? `
          <div class="cf-total-row" style="font-size:0.75rem;opacity:0.7;">
            <span>Trong đó: TNCN 2% + GTGT 5%</span>
            <span>${formatVND(p.hkdPIT)} + ${formatVND(p.hkdVAT)}</span>
          </div>` : ''}
          <div class="cf-total-row cf-total-final">
            <span>Ròng sau tất cả</span>
            <span>${formatVND(netB)}</span>
          </div>
        </div>
      </div>

    </div>
    ${advantageHtml}`;
}

// ─── MAIN RENDER DISPATCHER ───────────────────────────────────────────────────

function renderResults() {
  if (currentMode === 'mode1') {
    renderMode1();
  } else {
    renderMode2();
  }
}

// ─── DEBOUNCED CALCULATION ───────────────────────────────────────────────────

function scheduleCalculation() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(renderResults, 300);
}

// ─── COMPACT BAR ─────────────────────────────────────────────────────────────

/** Build one compact chip span. */
function makeChip(icon, value, dimmed = false) {
  return `<span class="compact-chip${dimmed ? ' compact-chip--dim' : ''}">${icon}\u00a0<strong>${value}</strong></span>`;
}

/** Update the compact summary bar with current values for the active mode. */
function updateCompactBar() {
  if (currentMode === 'mode1') {
    const rev = annualRevenue > 0 ? formatVND(annualRevenue) : '—';
    const dep = numberOfDependents > 0 ? `${numberOfDependents} NPT` : '';
    compactRevenue.innerHTML = makeChip('📊', rev);
    compactMeta.innerHTML    = dep ? makeChip('👨‍👩‍👧', dep) : '';
  } else {
    const sal  = monthlySalary > 0  ? formatVND(monthlySalary)  : '—';
    const free = annualFreelance > 0 ? formatVND(annualFreelance) : '—';
    const dep  = numberOfDependents > 0 ? `${numberOfDependents} NPT` : '0 NPT';
    compactRevenue.innerHTML =
      makeChip('💼', sal) +
      makeChip('🎨', free) +
      makeChip('👨‍👩‍👧', dep, numberOfDependents === 0);
    compactMeta.innerHTML = '';
  }
}

/** Expand back to full form when compact bar is tapped. */
function expandInputSection() {
  inputSection.classList.remove('collapsed');
  compactBar.setAttribute('aria-expanded', 'false');
  // Focus the primary input for the active mode
  const focusTarget = currentMode === 'mode1' ? revenueInput : salaryInput;
  focusTarget.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

compactBar.addEventListener('click', expandInputSection);
compactBar.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); expandInputSection(); }
});

// ─── STICKY INPUT SECTION ────────────────────────────────────────────────────
// Sticky only in Mode 1 (single small field). In Mode 2 the inputs are tall
// and sticking them blocks the results area, making the page unusable.

// Collapse threshold: how many px to scroll before shrinking (mode 1 only)
const COLLAPSE_THRESHOLD = 80;

function applyStickyForMode(mode) {
  // Both modes are sticky — they both collapse on scroll
  inputSection.style.position = 'sticky';
  inputSection.style.top      = '0';
  inputSection.style.zIndex   = '20';
  // Always start expanded when switching modes
  inputSection.classList.remove('collapsed');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function handleScroll() {
  if (window.scrollY > COLLAPSE_THRESHOLD) {
    updateCompactBar();
    inputSection.classList.add('collapsed');
    compactBar.setAttribute('aria-expanded', 'true');
  } else {
    inputSection.classList.remove('collapsed');
    compactBar.setAttribute('aria-expanded', 'false');
  }
}

window.addEventListener('scroll', handleScroll, { passive: true });

// ─── MODE TOGGLE ─────────────────────────────────────────────────────────────

modeBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const newMode = btn.dataset.mode;
    if (newMode === currentMode) return;

    currentMode = newMode;
    applyStickyForMode(newMode);

    // Update toggle button states
    modeBtns.forEach(b => {
      b.classList.toggle('active', b.dataset.mode === newMode);
      b.setAttribute('aria-selected', String(b.dataset.mode === newMode));
    });

    // Show/hide input panels
    if (newMode === 'mode1') {
      mode1Inputs.style.display = '';
      mode2Inputs.style.display = 'none';
      // Populate salary default on first entry to mode2
    } else {
      mode1Inputs.style.display = 'none';
      mode2Inputs.style.display = 'flex';
      // Pre-fill salary input with persisted value
      if (salaryInput.value === '') {
        salaryInput.value = formatNumber(monthlySalary);
      }
    }

    scheduleCalculation();
  });
});

// ─── INPUT HANDLING: MODE 1 (revenue) ────────────────────────────────────────

revenueInput.addEventListener('input', (e) => {
  annualRevenue = parseVND(e.target.value);
  reformatInput(e.target);
  document.querySelectorAll('.quick-pick[data-target="revenue"]').forEach(b => b.classList.remove('active'));
  updateCompactBar();
  scheduleCalculation();
});

// ─── INPUT HANDLING: MODE 2 ───────────────────────────────────────────────────

salaryInput.addEventListener('input', (e) => {
  monthlySalary = parseVND(e.target.value);
  reformatInput(e.target);
  document.querySelectorAll('.quick-pick[data-target="salary"]').forEach(b => b.classList.remove('active'));
  updateCompactBar();
  scheduleCalculation();
});

freelanceInput.addEventListener('input', (e) => {
  annualFreelance = parseVND(e.target.value);
  reformatInput(e.target);
  document.querySelectorAll('.quick-pick[data-target="freelance"]').forEach(b => b.classList.remove('active'));
  updateCompactBar();
  scheduleCalculation();
});

// ─── QUICK-PICK BUTTONS ───────────────────────────────────────────────────────

document.querySelectorAll('.quick-pick').forEach(btn => {
  btn.addEventListener('click', () => {
    const value  = parseInt(btn.dataset.value, 10);
    const target = btn.dataset.target;

    if (target === 'revenue') {
      annualRevenue = value;
      revenueInput.value = formatNumber(value);
      updateCompactBar();
    } else if (target === 'salary') {
      monthlySalary = value;
      salaryInput.value = formatNumber(value);
      updateCompactBar();
    } else if (target === 'freelance') {
      annualFreelance = value;
      freelanceInput.value = formatNumber(value);
      updateCompactBar();
    }

    // Highlight only within same target group
    document.querySelectorAll(`.quick-pick[data-target="${target}"]`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    scheduleCalculation();
  });
});

// ─── DEPENDENT STEPPER ───────────────────────────────────────────────────────

function updateDepStepper() {
  depCount.textContent = numberOfDependents;
  depMinus.disabled = numberOfDependents <= 0;
  depPlus.disabled  = numberOfDependents >= 10;
  updateCompactBar();
  scheduleCalculation();
}

depMinus.addEventListener('click', () => {
  if (numberOfDependents > 0) { numberOfDependents--; updateDepStepper(); }
});

depPlus.addEventListener('click', () => {
  if (numberOfDependents < 10) { numberOfDependents++; updateDepStepper(); }
});

// ─── FAQ ACCORDION ───────────────────────────────────────────────────────────

document.querySelectorAll('.faq-trigger').forEach(trigger => {
  trigger.addEventListener('click', () => {
    const expanded  = trigger.getAttribute('aria-expanded') === 'true';
    const contentId = trigger.getAttribute('aria-controls');
    const content   = document.getElementById(contentId);

    // Collapse all others
    document.querySelectorAll('.faq-trigger').forEach(t => {
      if (t !== trigger) {
        t.setAttribute('aria-expanded', 'false');
        const c = document.getElementById(t.getAttribute('aria-controls'));
        if (c) c.classList.remove('open');
      }
    });

    const isNowOpen = !expanded;
    trigger.setAttribute('aria-expanded', String(isNowOpen));
    if (content) content.classList.toggle('open', isNowOpen);
  });
});

// ─── INITIAL STATE ───────────────────────────────────────────────────────────

emptyState.style.display = '';
resultsEl.style.display  = 'none';
depMinus.disabled        = true;

// Apply initial sticky state (mode1 = sticky)
applyStickyForMode(currentMode);

// Pre-fill salary input for mode 2
salaryInput.value = formatNumber(monthlySalary);
