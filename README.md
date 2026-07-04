# CPF & BTO Calculator

A static web app for projecting CPF balances and comparing BTO property scenarios in Singapore.

## Features

### Salary Calculator (`salary.html`)
- Dual spouse CPF projection from current age to retirement
- Accounts for contribution rate changes at every age bracket (35, 45, 50, 55, 60, 65, 70)
- OA, SA/RA, MA breakdown with compound interest (mid-year approximation)
- Per-spouse annual bonus inputs (AW ceiling calculated individually)
- CPF LIFE payout estimate at retirement (annuity formula, 4% rate, 20-year period)
- Interactive charts: CPF balances, net worth trajectory, retirement income, asset allocation

### BTO Calculator (`bto.html`)
- Compare two property paths side-by-side (Path A vs Path B)
- **Timeline toggle**: BTO (with 3-5 year build time) vs Resale (ready immediately)
- **Deposit scheme toggle**: Standard (10%/15%) vs Staggered SDS (5%/20%)
- **Remaining Lease input** per path (99 for BTO, user-input for resale)
- **Bala's Curve lease decay** — property values decline realistically as lease shortens
- **Two-stage BTO deposits**: Stage 1 (signing) + Stage 2 (key collection via lump sum injection)
- **$2,000 cash option fee** forced for BTO (HDB requirement)
- **Resale option fees**: $5,000 flat cap (HDB legal limit)
- **HDB OA wipeout**: Full OA used (keeping $20k retention), excess reduces loan
- **Bank loan**: 75% LTV on min(price, valuation), 5% cash minimum enforced
- **Bala's Curve property valuation**: Property values decay as lease shortens
- **Scenario Toggle**: Forever Stay vs Sell & Buy Resale
- **Lease Buyback Scheme (LBS)**: Available for both scenarios at age 65
  - Uses Bala's Curve for accurate proceeds calculation
  - RA top-up to FRS + HDB cash bonus (pro-rated under $60k)
  - 30-year minimum lease check
  - RA compounds naturally from age 65 to retirement
- **Retirement Projection**: CPF at retirement age with per-spouse breakdown
  - OA/RA/MA breakdown per spouse
  - CPF LIFE payout with FRS cap tooltip
  - OA Drawdown (20-year/240 months)
  - Total Monthly Retirement Income (CPF LIFE + OA drawdown)
- **CPF Trajectory Chart**: Both paths on same canvas to retirement
- Cross-page data flow from Salary Calculator (localStorage)
- Input caching on both pages (survives refresh)
- **Light/Dark mode toggle** with localStorage persistence

## CPF Rules Implemented

| Rule | Value |
|---|---|
| OW Ceiling | $8,000/month (Jan 2026) |
| Annual Contribution Limit | $37,740 |
| AW Room (bonuses) | $102,000 − actual annual OW (per-year, per-individual) |
| Contribution rates | 37% → 34% → 25% → 16.5% → 12.5% |
| Allocation rates (2026) | OA/SA/MA shifts at every age bracket. 55-60: OA 35.3%, RA 33.8%, MA 30.9% |
| SA closure at 55 | SA → RA (up to FRS), remainder → OA. Year's RA contributions added first. |
| FRS (2026) | $220,400, growing at 3.5% p.a. |
| BHS (2026) | $75,500, growing at 4% p.a. MA overflow → SA/RA (respects FRS cap) |
| Extra interest | Sequential (SA/RA → MA → OA) within $60k cap. OA capped at $20k. |
| 55+ extra interest | Additional 1% on first $30k RA (sweeps RA → MA → OA) |
| BSD | Progressive rates (1%-6%) |
| HDB LTV | 75% |
| HDB OA Wipeout | Full OA used (keeping $20k), excess reduces loan |
| CPF LIFE | Annuity formula: 4% rate, 20-year payout period, 0.90 mortality factor |
| Subsidy clawback | Standard (fixed resale levy) + PLH/Plus (custom %) |
| Lease Buyback Scheme | LBS at 65: RA top-up to FRS + HDB cash bonus. 30yr min lease. |
| Lease decay | Bala's Curve — 11-point S-curve (99yr: 96%, 50yr: 67.5%, 0yr: 0%) |
| Buyer affordability | MAS floor rate stress test (3% HDB, 4% bank) |
| Accrued CPF interest | Monthly compounding via effective annual rate |
| BTO deposit schemes | Standard (10%/15%) and Staggered SDS (5%/20%) |

## Property Value Modeling (Bala's Curve)

Property values do not compound indefinitely. HDB flats are 99-year leasehold, and value declines as the lease shortens. The calculator uses Bala's Curve:

```
Final Value = Purchase Price × (1 + growth)^years × (Decay[remainingNow] / Decay[remainingAtPurchase])
```

| Remaining Lease | % of Freehold Value |
|---|---|
| 99 years | 96.0% |
| 80 years | 89.1% |
| 60 years | 76.5% |
| 50 years | 67.5% |
| 40 years | 56.6% |
| 30 years | 43.6% |
| 20 years | 28.5% |
| 10 years | 11.5% |
| 0 years | 0.0% |

## Tech Stack

- HTML5 + CSS3 + Vanilla JavaScript
- Chart.js (CDN) for interactive charts
- localStorage for input caching, cross-page data, and theme preference
- No build tools, no backend, no dependencies

## Deployment

This is a static site compatible with GitHub Pages. Push to a repository and enable GitHub Pages in Settings. No build step required.

## File Structure

```
├── index.html          # Landing page
├── salary.html         # Salary & CPF Calculator
├── bto.html            # BTO Property Calculator
├── css/
│   └── style.css       # Shared styles (dark/light theme, responsive)
├── js/
│   ├── cpf-engine.js   # CPF calculation engine (all rules + Bala's Curve)
│   ├── salary.js       # Salary page logic & charts
│   └── bto.js          # BTO page logic & charts
├── assets/             # (optional icons/images)
└── README.md
```

## Disclaimer

This calculator is for educational and planning purposes only. It uses simplified models and may not account for all edge cases. Always verify calculations with official CPF Board and HDB resources before making financial decisions.
