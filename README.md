# Comicola Legal

Công cụ so sánh thuế TNCN và Hộ Kinh Doanh dành cho họa sĩ tự do Việt Nam, năm 2026.

**Stack:** Vite + Tailwind CSS v4 + Vanilla JS (no framework)  
**Deploy:** Cloudflare Pages  
**Domain:** `legal.comico.la`

---

## Setup

```bash
pnpm install
pnpm dev        # dev server at http://localhost:5173
pnpm build      # output to ./dist
pnpm preview    # preview the build locally
```

## Deploy to Cloudflare Pages

```bash
pnpm deploy
# Or manually:
pnpm build
npx wrangler pages deploy dist --project-name=comicola-legal
```

### Custom domain

1. In Cloudflare Dashboard → Pages → `comicola-legal` → **Custom domains**
2. Add `legal.comico.la`
3. Add a CNAME record in DNS: `legal` → `comicola-legal.pages.dev`

---

## Tax formulas implemented

| Document | Content | Effective |
|---|---|---|
| Luật Thuế TNCN 2025 (109/2025/QH15) | 5-bracket progressive tax | 01/01/2026 |
| Nghị quyết 110/2025/UBTVQH15 | Personal deduction 15.5M, dependent 6.2M | 01/01/2026 |
| Nghị định 68/2026/NĐ-CP | HKD 500M threshold, 2% PIT + 5% VAT for services | 05/03/2026 |
| Luật Thuế GTGT 2024 (48/2024/QH15) | VAT rates by industry | 01/01/2026 |
| Nghị quyết 198/2025/QH15 | Abolish thuế khoán & lệ phí môn bài | 01/01/2026 |

## Files

```
├── index.html          Page structure & content
├── src/
│   ├── calculator.js   Pure tax calculation logic (no DOM)
│   ├── main.js         UI controller — inputs, rendering, animations
│   └── style.css       Tailwind v4 theme + custom CSS
├── vite.config.js
├── wrangler.toml       Cloudflare Pages config
└── package.json
```
