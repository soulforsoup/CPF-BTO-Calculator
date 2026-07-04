# CPF & BTO Calculator

A static web app for projecting CPF balances and comparing BTO property scenarios in Singapore.

## Pages

### Salary Calculator (`salary.html`)
- Dual spouse CPF projection from current age to retirement
- Accounts for contribution rate changes at every age bracket (35, 45, 50, 55, 60, 65, 70)
- OA, SA/RA, MA breakdown with compound interest
- CPF LIFE payout estimate at retirement (annuity formula, 4% rate, 20-year period)
- Per-spouse annual bonus inputs (AW ceiling calculated individually)
- Interactive charts: CPF balances, net worth trajectory, retirement income, asset allocation

### BTO Calculator (`bto.html`)
- Compare two property paths side-by-side (Path A vs Path B)
- Timeline toggle: BTO (with 3-5 year build time) vs Resale (ready immediately)
- **Remaining Lease input** per path (99 for BTO, user-input for resale)
- **Bala's Curve lease decay** — property values decline realistically as lease shortens
- **BTO Stage 2 phasing** — Stage 1 (5% + BSD) at signing, Stage 2 (20%) deducted at key collection via lump sum injection
- **Resale deduction** — downpayment + BSD deducted from OA for both scenarios (not just Forever Stay)
- Subsidy clawback modeling (Standard / PLH / Plus) with custom %
- Resale levy toggle with flat-type dropdown
- Bank loan 5% cash minimum enforcement with warning
- **HDB OA wipeout** — uses available CPF down to $20k retention before loan
- **Retirement Projection**: CPF at retirement age (default 65) with per-spouse breakdown
  - OA/RA/MA breakdown per spouse
  - CPF LIFE payout with FRS cap tooltip
  - OA Drawdown (20-year/240 months)
  - Total Monthly Retirement Income (CPF LIFE + OA drawdown)
- **Scenario Toggle**: Forever Stay vs Sell & Buy Resale
- **Forever Stay**: No exit math — projects CPF to retirement while keeping the flat
- **Lease Buyback Scheme (LBS)**: Available for both Forever Stay and Sell & Buy Resale
  - RA top-up to FRS + HDB cash bonus at age 65
  - 30-year minimum lease check (blocks LBS if flat has ≤30 years remaining at 65)
  - RA compounds naturally from age 65 to retirement (no flat injection)
  - Mortgage continues through LBS re-projection (spouse-specific timelines)
  - Full pre-65 data preserved in CPF trajectory chart (splice, not replace)
- **War Chest Display**: Available CPF + cash after BTO sale (capped for negative sales)
- **Resale Purchase Modeling**: BSD, downpayment, mortgage, cash/CPF split, second flat lease
- **Auto-calculate second flat loan**: Uses remaining CPF first, loan for remainder
- **CPF Trajectory Chart**: Both paths on same canvas to retirement (LBS spike at 65)
- **Property Value in Net Worth**: Bala's Curve decay included
- **Stage 2 shortfall warning**: Visual alert if OA insufficient at key collection
- Cross-page data flow from Salary Calculator (localStorage)
- Input caching on both pages (survives refresh)

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
| Extra interest | Sequential (SA/RA → MA → OA) within $60k cap |
| OA extra interest cap | $20,000 max from OA attracts extra 1% |
| 55+ extra interest | Additional 1% on first $30k RA (sweeps RA → MA → OA) |
| BSD | Progressive rates (1%-6%) |
| HDB LTV | 75% |
| HDB OA Wipeout | Full OA used (keeping $20k), loan = remainder |
| CPF LIFE | Annuity formula: 4% rate, 20-year payout period, 0.90 mortality factor |
| Subsidy clawback | Standard (fixed resale levy) + PLH/Plus (custom %) |
| Lease Buyback Scheme | LBS at 65: RA top-up to FRS + HDB cash bonus. 30yr min lease. |
| Lease decay | Bala's Curve — 11-point S-curve (99yr: 96%, 50yr: 67.5%, 0yr: 0%) |
| Buyer affordability | MAS floor rate stress test (3% HDB, 4% bank) |
| Accrued CPF interest | Monthly compounding via effective annual rate |

## Property Value Modeling (Bala's Curve)

Property values do not compound indefinitely. HDB flats are 99-year leasehold, and value declines as the lease shortens. The calculator uses Bala's Curve (the standard valuation curve used by Singapore property valuers):

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

This prevents the "lease decay illusion" — a 40-year-old resale flat with 59 years remaining will not appreciate like a new BTO with 99 years.

## Mortgage Modeling

- **BTO Stage 1**: 5% + BSD deducted from OA at signing
- **BTO Stage 2**: 20% downpayment deducted from OA at key collection (lump sum injection)
- **Stage 2 shortfall**: If OA insufficient at key collection, cash covers the gap (visual warning)
- **Resale**: Downpayment + BSD deducted from OA at purchase
- **Mortgage**: Deducted from OA monthly, falls back to cash if insufficient
- **Mortgage expiry**: Deductions stop when loan is paid off, OA compounds fully
- **Cash split**: Between spouses (50/50 or proportional to income)
- **Negative cash**: Flagged with red CSS warning

## Exit Math

- **Sell & Buy Resale**: Shows selling price, agent commission, clawback, CPF refund (capped), net cash proceeds
- **Forever Stay**: No exit math — you never sell. Shows "Financial Position at MOP" instead
- **CPF refund cap**: Only mortgage and subsidy clawback reduce the refund (not agent commission or resale levy)

## Retirement Projection

- **CPF LIFE payout**: Based on RA balance at retirement, with FRS cap tooltip explaining why higher salary doesn't always increase CPF LIFE
- **OA Drawdown**: 20-year (240 months) straight-line drawdown of OA balance
- **Total Monthly Income**: CPF LIFE + OA drawdown = total retirement "paycheck"
- **Per-spouse breakdown**: Shows OA/RA/MA allocation, cash, and individual CPF LIFE

## Lease Buyback Scheme (LBS)

Available for both Forever Stay and Sell & Buy Resale scenarios. At age 65, model selling part of your lease back to HDB:
- **Proceeds**: Calculated using Bala's Curve lease decay (not hardcoded percentages)
- **RA Top-up**: Proceeds top up each spouse's RA up to FRS
- **Cash Excess**: Any remaining proceeds after RA top-up
- **HDB Cash Bonus**: $30k (2/3-room), $15k (4-room), $7.5k (5/Exec) — pro-rated for top-ups under $60k
- **Impact**: RA balance increases → higher CPF LIFE monthly payouts
- **30-year rule**: Flat must have more than 30 years remaining at age 65 for LBS eligibility
- **Compounding**: LBS RA top-up earns 4%+ interest from age 65 to retirement

## Tech Stack

- HTML5 + CSS3 + Vanilla JavaScript
- Chart.js (CDN) for interactive charts
- localStorage for input caching and cross-page data
- No build tools, no backend, no dependencies

## Deployment

This is a static site compatible with GitHub Pages. Push to a repository and enable GitHub Pages in Settings. No build step required.

## File Structure

```
├── index.html          # Landing page
├── salary.html         # Salary & CPF Calculator
├── bto.html            # BTO Property Calculator
├── css/
│   └── style.css       # Shared styles (dark theme, responsive)
├── js/
│   ├── cpf-engine.js   # CPF calculation engine (all rules + Bala's Curve)
│   ├── salary.js       # Salary page logic & charts
│   └── bto.js          # BTO page logic & charts
├── assets/             # (optional icons/images)
└── README.md
```

## How to Use

1. Open `index.html` or deploy to GitHub Pages
2. Start with the **Salary Calculator** to set up your financial profile (including per-spouse bonuses)
3. Move to the **BTO Calculator** — your salary data auto-loads
4. Compare two property paths side-by-side
5. Enter the **Remaining Lease** for each flat (99 for BTO, actual for resale)
6. Use the **Scenario Toggle** to compare Forever Stay vs Sell & Buy Resale
7. Enable **LBS** to model lease buyback at 65 (works for both scenarios)
8. Check the **Retirement Projection** for CPF at retirement age, including total monthly income
9. View the **CPF Trajectory Chart** for long-term comparison

## Disclaimer

This calculator is for educational and planning purposes only. It uses simplified models and may not account for all edge cases. Always verify calculations with official CPF Board and HDB resources before making financial decisions.
