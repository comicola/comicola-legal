# PROMPT: Build "Comicola Legal" — Vietnamese Tax Comparison Landing Page

## Project Overview

Build a mobile-first, single-page landing page called **"Comicola Legal"** deployed on **Cloudflare Pages/Workers** at domain `legal.comico.la`.

The page helps Vietnamese freelance illustrators compare two tax options for 2026:
- **Option A**: Pay Personal Income Tax (Thuế TNCN) as an individual
- **Option B**: Register a Household Business (Hộ Kinh Doanh - HKD) and pay business taxes

Users input their **expected annual revenue for 2026** and **number of dependents**, then see a side-by-side comparison showing which option saves more money.

---

## Tech Stack & Deployment

- **Framework**: Astro, Next.js (static export), or plain HTML/CSS/JS — choose what deploys cleanest on Cloudflare Pages
- **Styling**: Tailwind CSS v4 or vanilla CSS — mobile-first, must look great on iPhone SE through iPad
- **Deployment target**: Cloudflare Pages (static site) — no server-side logic needed, all calculations run client-side in JS
- **Domain**: `legal.comico.la` (configure via `wrangler.toml` or Cloudflare dashboard)
- **Language**: Vietnamese UI, code comments in English

---

## Design Direction

**Aesthetic**: Clean, editorial, trustworthy — like a fintech app meets a legal document. NOT generic SaaS.

- **Palette**: Deep navy (#1a1f36) + warm gold/amber accent (#f5a623) + clean white backgrounds. Subtle paper-like texture.
- **Typography**: Use Google Fonts — pick something like `Be Vietnam Pro` (designed specifically for Vietnamese) for body text, paired with a distinctive display font like `Playfair Display` or `Fraunces` for headings. CRITICAL: must support full Vietnamese diacritics (ắ, ầ, ổ, ử, ễ, etc.)
- **Layout**: Single column on mobile, max-width ~640px centered. Cards stack vertically on mobile, side-by-side on tablet+.
- **Interactions**: Smooth number input with VNĐ formatting (e.g., "500,000,000"), instant calculation as user types (debounced), animated result cards that slide in.
- **Mobile UX**: Large touch targets (min 44px), sticky input section at top, results scroll below. Number input should trigger numeric keyboard on mobile (`inputmode="numeric"`).

---

## Page Structure (Top to Bottom)

### 1. Header
```
Logo: "Comicola Legal" (text logo, stylized)
Tagline: "Công cụ so sánh thuế dành cho họa sĩ tự do"
(Tax comparison tool for freelance illustrators)
Subtitle: "Cập nhật theo Luật Thuế TNCN 2025 & Nghị định 68/2026/NĐ-CP"
(Updated per PIT Law 2025 & Decree 68/2026)
```

### 2. Input Section (sticky on mobile)
```
Field 1: "Doanh thu dự kiến năm 2026" (Expected revenue 2026)
- Number input with VNĐ formatting
- Placeholder: "Ví dụ: 600,000,000"
- Show quick-pick buttons: 300tr, 500tr, 800tr, 1 tỷ, 1.5 tỷ, 2 tỷ

Field 2: "Số người phụ thuộc" (Number of dependents)
- Stepper buttons: [−] 0 [+] (range: 0–10)
- Below: brief explanation text: "Con dưới 18 tuổi, con đang đi học, cha mẹ hết tuổi lao động..."
```

### 3. Results Section — Two Cards Side by Side

**Card A: "Đóng thuế TNCN cá nhân" (Personal Income Tax)**
```
- Thu nhập tháng (Monthly income): xxx VNĐ
- BHXH (10.5%): −xxx VNĐ
- Giảm trừ bản thân: −15,500,000 VNĐ
- Giảm trừ NPT: −xxx VNĐ
- Thu nhập tính thuế: xxx VNĐ
- Thuế TNCN/tháng: xxx VNĐ
- ═══════════════
- TỔNG THUẾ NĂM: xxx VNĐ (highlighted, large)
- THU NHẬP THỰC NHẬN: xxx VNĐ
- Thuế suất thực tế: xx.x%
```

**Card B: "Thành lập Hộ kinh doanh" (Household Business)**
```
- Doanh thu năm: xxx VNĐ
- Ngưỡng miễn thuế: 500,000,000 VNĐ
- Doanh thu tính thuế TNCN: xxx VNĐ
- Thuế TNCN (2%): xxx VNĐ
- Thuế GTGT (5%): xxx VNĐ
- ═══════════════
- TỔNG THUẾ NĂM: xxx VNĐ (highlighted, large)
- THU NHẬP SAU THUẾ: xxx VNĐ
- Thuế suất thực tế: xx.x%
```

### 4. Verdict Banner
```
If HKD saves more:
  "🏆 Thành lập HKD giúp bạn tiết kiệm [xxx] VNĐ/năm so với đóng thuế TNCN"

If PIT saves more:
  "🏆 Đóng thuế TNCN cá nhân giúp bạn tiết kiệm [xxx] VNĐ/năm so với thành lập HKD"

If equal or revenue ≤ 500M:
  "Với mức doanh thu này, bạn không cần đóng thuế nếu thành lập HKD"
```

### 5. Educational Section
```
Collapsible FAQ/explainers:
- "Biểu thuế lũy tiến 5 bậc 2026 là gì?"
- "Nghị định 68/2026 quy định gì cho HKD?"
- "Ngành vẽ minh họa thuộc nhóm thuế nào?"
```

### 6. Footer
```
Disclaimer: "Công cụ này chỉ mang tính tham khảo, không thay thế tư vấn thuế chuyên nghiệp.
Các công thức tính dựa trên Luật Thuế TNCN 2025 (số 109/2025/QH15),
Nghị quyết 110/2025/UBTVQH15, và Nghị định 68/2026/NĐ-CP."
© 2026 Comicola Legal
```

---

## TAX CALCULATION FORMULAS — IMPLEMENT EXACTLY

### ═══ OPTION A: Personal Income Tax (Thuế TNCN từ tiền lương, tiền công) ═══

**Legal basis**: Luật Thuế TNCN 2025 (số 109/2025/QH15), Nghị quyết 110/2025/UBTVQH15

**Assumption**: User's annual revenue = gross salary income (tiền lương trước thuế)

```javascript
// Step 1: Monthly gross income
const monthlyGross = annualRevenue / 12;

// Step 2: Social insurance deduction (BHXH + BHYT + BHTN = 10.5%)
// Capped at salary ceiling of 46,800,000 VNĐ/month (20x base salary 2,340,000)
// But BHXH contribution cap = 36,000,000 VNĐ/month for BHXH portion
// Simplified: 10.5% of min(monthlyGross, 46800000)
const bhxhBase = Math.min(monthlyGross, 46800000);
const bhxhDeduction = bhxhBase * 0.105;

// Step 3: Personal deduction (giảm trừ gia cảnh)
// Per Nghị quyết 110/2025/UBTVQH15, effective from tax year 2026:
const personalDeduction = 15500000; // 15.5 million/month for taxpayer
const dependentDeduction = 6200000; // 6.2 million/month per dependent
const totalDeduction = personalDeduction + (dependentDeduction * numberOfDependents);

// Step 4: Taxable income per month
const taxableIncome = Math.max(0, monthlyGross - bhxhDeduction - totalDeduction);

// Step 5: Progressive tax calculation — NEW 5-BRACKET TABLE (2026)
// Per Điều 9, Luật Thuế TNCN 2025 (Luật số 109/2025/QH15)
// Effective from tax year 2026 (kỳ tính thuế năm 2026)
//
// | Bracket | Taxable Income/Month (VNĐ)      | Rate |
// |---------|----------------------------------|------|
// | 1       | Up to 10,000,000                 |  5%  |
// | 2       | Over 10,000,000 to 30,000,000    | 10%  |
// | 3       | Over 30,000,000 to 60,000,000    | 20%  |
// | 4       | Over 60,000,000 to 100,000,000   | 30%  |
// | 5       | Over 100,000,000                 | 35%  |

function calculateProgressiveTax(taxableMonthly) {
  if (taxableMonthly <= 0) return 0;

  let tax = 0;
  const brackets = [
    { limit: 10000000,  rate: 0.05 },
    { limit: 30000000,  rate: 0.10 },
    { limit: 60000000,  rate: 0.20 },
    { limit: 100000000, rate: 0.30 },
    { limit: Infinity,  rate: 0.35 },
  ];

  let previousLimit = 0;
  for (const bracket of brackets) {
    if (taxableMonthly <= previousLimit) break;
    const taxableInBracket = Math.min(taxableMonthly, bracket.limit) - previousLimit;
    tax += Math.max(0, taxableInBracket) * bracket.rate;
    previousLimit = bracket.limit;
  }

  return tax;
}

const monthlyTax = calculateProgressiveTax(taxableIncome);
const annualTax_PIT = monthlyTax * 12;
const netIncome_PIT = annualRevenue - (bhxhDeduction * 12) - annualTax_PIT;
const effectiveRate_PIT = annualRevenue > 0 ? (annualTax_PIT / annualRevenue * 100) : 0;
```

### ═══ OPTION B: Household Business Tax (Thuế Hộ Kinh Doanh) ═══

**Legal basis**: Nghị định 68/2026/NĐ-CP (effective 05/03/2026), Điều 7 Luật Thuế TNCN 2025, Luật Thuế GTGT 2024 (số 48/2024/QH15)

**Industry**: Illustration services = "Dịch vụ" (Services category)

**Method**: Tỷ lệ % trên doanh thu (percentage on revenue) — simplest method for freelancers with revenue 500M–3B who can't easily prove expenses.

```javascript
// Tax-free threshold: 500,000,000 VNĐ/year
// Per Điều 4 Nghị định 68/2026/NĐ-CP:
// "cá nhân kinh doanh có mức doanh thu năm từ 500 triệu đồng trở xuống
//  không phải nộp thuế thu nhập cá nhân"
const HKD_THRESHOLD = 500000000;

// === PIT for HKD (Thuế TNCN hộ kinh doanh) ===
// Per Điều 7 khoản 3 Luật Thuế TNCN 2025:
// For "Dịch vụ, xây dựng không bao thầu nguyên vật liệu": thuế suất 2%
// Illustration = dịch vụ → 2%
//
// Formula: Thuế TNCN = (Doanh thu − 500 triệu) × 2%
// Only applies when doanh thu > 500 triệu
const PIT_RATE_SERVICE = 0.02; // 2% for services

let hkdPIT = 0;
if (annualRevenue > HKD_THRESHOLD) {
  hkdPIT = (annualRevenue - HKD_THRESHOLD) * PIT_RATE_SERVICE;
}

// === VAT for HKD (Thuế GTGT hộ kinh doanh) ===
// Per Điều 12 khoản 2 điểm c Luật Thuế GTGT 2024:
// "Dịch vụ, xây dựng không bao thầu nguyên vật liệu: 5%"
// VAT is calculated on FULL revenue (not minus 500M threshold)
// Only applies when revenue > 500M
const VAT_RATE_SERVICE = 0.05; // 5% for services

let hkdVAT = 0;
if (annualRevenue > HKD_THRESHOLD) {
  hkdVAT = annualRevenue * VAT_RATE_SERVICE;
}

// === Total HKD tax ===
const totalTax_HKD = hkdPIT + hkdVAT;
const netIncome_HKD = annualRevenue - totalTax_HKD;
const effectiveRate_HKD = annualRevenue > 0 ? (totalTax_HKD / annualRevenue * 100) : 0;

// === Comparison ===
const savings = annualTax_PIT - totalTax_HKD; // positive = HKD saves money
```

### ═══ IMPORTANT NOTES ON THE TAX FORMULAS ═══

**Search these sources to verify formulas before implementing:**

1. **Biểu thuế lũy tiến 5 bậc 2026**: Search "biểu thuế TNCN lũy tiến 5 bậc 2026 Luật 109/2025" — Confirm the 5 brackets: 5%, 10%, 20%, 30%, 35% with thresholds 10M, 30M, 60M, 100M
2. **Giảm trừ gia cảnh 2026**: Search "Nghị quyết 110/2025/UBTVQH15 giảm trừ gia cảnh" — Confirm 15.5M/month personal, 6.2M/month per dependent
3. **Nghị định 68/2026 hộ kinh doanh**: Search "Nghị định 68/2026/NĐ-CP thuế hộ kinh doanh dịch vụ" — Confirm 500M threshold, 2% PIT rate for services
4. **Thuế GTGT hộ kinh doanh dịch vụ**: Search "Điều 12 Luật Thuế GTGT 2024 tỷ lệ dịch vụ" — Confirm 5% VAT for services
5. **BHXH rate 2026**: Search "tỷ lệ đóng BHXH người lao động 2026" — Confirm 10.5% employee contribution (8% BHXH + 1.5% BHYT + 1% BHTN)
6. **Mức trần đóng BHXH 2026**: Search "mức trần lương đóng BHXH 2026 lương cơ sở" — Confirm the salary cap

**Edge cases to handle:**
- Revenue = 0 → show "Nhập doanh thu để xem kết quả"
- Revenue ≤ 500M → HKD card shows "Miễn thuế hoàn toàn" (fully exempt)
- Revenue > 3 tỷ → Show a note on HKD card: "Với doanh thu trên 3 tỷ, bạn bắt buộc phải tính thuế TNCN theo phương pháp thu nhập (doanh thu − chi phí). Công cụ này sử dụng phương pháp tỷ lệ % để tham khảo."
- Negative taxable income → Tax = 0
- Very high numbers → Format properly with Vietnamese locale (dấu chấm phân cách hàng nghìn)

---

## NUMBER FORMATTING

```javascript
// Vietnamese number format: 1.000.000.000 (dots as thousand separators)
function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' ₫';
}

// Input parsing: strip non-digits, parse as integer
function parseVND(inputString) {
  return parseInt(inputString.replace(/\D/g, ''), 10) || 0;
}
```

---

## CLOUDFLARE PAGES DEPLOYMENT

```bash
# If using plain HTML/JS:
# Just put files in a folder and deploy

# wrangler.toml (if needed)
name = "comicola-legal"
compatibility_date = "2024-01-01"

[site]
bucket = "./dist"  # or "./out" or "./build" depending on framework

# Deploy command:
npx wrangler pages deploy ./dist --project-name=comicola-legal

# Custom domain setup:
# In Cloudflare Dashboard → Pages → comicola-legal → Custom domains → Add: legal.comico.la
# Make sure comico.la DNS is managed by Cloudflare
# Add CNAME record: legal → comicola-legal.pages.dev
```

---

## RESPONSIVE BREAKPOINTS

```css
/* Mobile first */
/* Default: single column, full width */

/* Tablet: 768px+ */
@media (min-width: 768px) {
  /* Two-column layout for comparison cards */
  /* Input section no longer sticky */
}

/* Desktop: 1024px+ */
@media (min-width: 1024px) {
  /* Max-width container ~960px */
  /* More generous spacing */
}
```

---

## ACCESSIBILITY & PERFORMANCE

- All text must have sufficient contrast ratio (WCAG AA minimum)
- Input labels must be associated with inputs (`<label for="...">`)
- Results should be announced to screen readers when they change (`aria-live="polite"`)
- No external API calls — everything runs client-side
- Total page weight should be under 200KB (excluding fonts)
- Lighthouse score target: 95+ on Performance, 100 on Accessibility

---

## FILES TO CREATE

```
/
├── index.html          (or src/pages/index.astro)
├── styles.css          (or Tailwind config)
├── calculator.js       (tax calculation logic, well-commented)
├── wrangler.toml       (Cloudflare config)
├── package.json        (if using a build tool)
└── README.md           (setup instructions)
```

---

## TESTING SCENARIOS

Verify these manually after building:

| Revenue (VNĐ) | NPT | Expected PIT Tax/year | Expected HKD Tax/year | Winner |
|----------------|-----|----------------------|----------------------|--------|
| 300,000,000    | 0   | ~0 (below threshold) | 0 (below 500M)      | Tie    |
| 500,000,000    | 0   | ~2,940,000           | 0 (at threshold)    | HKD    |
| 600,000,000    | 0   | ~6,540,000           | 32,000,000           | PIT    |
| 600,000,000    | 2   | ~1,500,000           | 32,000,000           | PIT    |
| 1,000,000,000  | 0   | ~29,940,000          | 60,000,000           | PIT    |
| 1,000,000,000  | 2   | ~21,060,000          | 60,000,000           | PIT    |
| 2,000,000,000  | 0   | ~100,000,000+        | 130,000,000          | Depends|

> ⚠️ The test values above are APPROXIMATIONS. Calculate exact values with the formulas and verify they make sense. The BHXH cap and progressive brackets will affect exact numbers.

---

## SUMMARY OF LEGAL REFERENCES

| Document | Content | Effective Date |
|----------|---------|---------------|
| Luật Thuế TNCN 2025 (số 109/2025/QH15) | New 5-bracket progressive tax, HKD tax rates | Tax year 2026 (01/01/2026) |
| Nghị quyết 110/2025/UBTVQH15 | Personal deduction 15.5M, dependent 6.2M | 01/01/2026 |
| Nghị định 68/2026/NĐ-CP | HKD tax policy, 500M threshold, calculation methods | 05/03/2026 |
| Luật Thuế GTGT 2024 (số 48/2024/QH15) | VAT rates for HKD by industry | 01/01/2026 |
| Nghị quyết 198/2025/QH15 | Abolish thuế khoán, lệ phí môn bài for HKD | 01/01/2026 |

---

## FINAL CHECKLIST

- [ ] Vietnamese diacritics render correctly everywhere
- [ ] Numbers format with Vietnamese locale (dots, not commas)
- [ ] Calculation updates instantly as user types (with debounce ~300ms)
- [ ] Mobile: numeric keyboard opens for revenue input
- [ ] Mobile: cards stack vertically, readable without horizontal scroll
- [ ] Disclaimer is visible and clear
- [ ] All tax formulas match the legal references above
- [ ] Deployed successfully to Cloudflare Pages
- [ ] Custom domain `legal.comico.la` resolves correctly
- [ ] Page loads in under 2 seconds on 3G
- [ ] No console errors
