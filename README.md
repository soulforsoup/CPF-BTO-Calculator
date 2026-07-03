# CPF & BTO Calculator

A static web app for projecting CPF balances and comparing BTO property scenarios in Singapore.

## Pages

### Salary Calculator (`salary.html`)
- Dual spouse CPF projection from current age to retirement
- Accounts for contribution rate changes at every age bracket (35, 45, 50, 55, 60, 65, 70)
- OA, SA/RA, MA breakdown with compound interest
- CPF LIFE payout estimate at retirement
- Interactive charts: CPF balances, net worth trajectory, retirement income, asset allocation

### BTO Calculator (`bto.html`)
- Compare two property paths side-by-side (Path A vs Path B)
- Timeline toggle: BTO (with 3-5 year build time) vs Resale (ready immediately)
- Auto-calculated two-stage deposits (signing + key collection)
- Projected CPF OA for BTO downpayment based on build time
- Subsidy clawback modeling (Standard / PLH / Plus) with custom %
- Resale levy toggle with flat-type dropdown
- Bank loan 5% cash minimum enforcement with warning
- **Retirement Projection**: CPF at retirement age (default 65) with per-spouse breakdown
- **Scenario Toggle**: Forever Stay vs Sell & Buy Resale
- **Forever Stay**: No exit math — projects CPF to retirement while keeping the flat
- **Lease Buyback Scheme (LBS)**: Model LBS at age 65 with RA top-up and HDB cash bonus
- **War Chest Display**: Available CPF + cash after BTO sale
- **Resale Purchase Modeling**: BSD, downpayment, mortgage, cash/cCPF split
- **CPF Trajectory Chart**: Both paths on same canvas to retirement (LBS spike at 65)
- **Property Value in Net Worth**: Appreciation included in total net worth
- Cross-page data flow from Salary Calculator (localStorage)
- Input caching on both pages (survives refresh)

## CPF Rules Implemented

| Rule | Value |
|---|---|
| OW Ceiling | $8,000/month (Jan 2026) |
| Annual Contribution Limit | $37,740 |
| AW Room (bonuses) | $6,000 |
| Contribution rates | 37% → 34% → 25% → 16.5% → 12.5% |
| Allocation rates | OA/SA/MA shifts at every age bracket |
| SA closure at 55 | SA → RA (up to FRS), remainder → OA |
| FRS (2026) | $220,400, growing at 3.5% p.a. |
| BHS (2026) | $71,500, growing at 4% p.a. MA overflow → SA/RA |
| Extra interest | Sequential (SA/RA → MA → OA) within $60k cap |
| OA extra interest cap | $20,000 max from OA attracts extra 1% |
| 55+ extra interest | Additional 1% on first $30k RA |
| BSD | Progressive rates (1%-6%) |
| HDB LTV | 75% |
| CPF LIFE | Estimate based on RA balance at 65 |
| Subsidy clawback | Standard (fixed resale levy) + PLH/Plus (custom %) |
| Lease Buyback Scheme | LBS at 65: RA top-up to FRS + HDB cash bonus |

## Mortgage Modeling

- **Forever Stay**: Mortgage deducted from OA monthly until tenure expires, then OA compounds fully
- **Sell & Buy Resale**: Mortgage split between spouses (50/50 or proportional to income)
- **Cash shortfall**: If OA insufficient, cash covers the difference (negative cash flagged in UI)
- **Mortgage expiry**: Deductions stop when loan is paid off, OA grows unimpeded after that

## Exit Math

- **Sell & Buy Resale**: Shows selling price, agent commission, clawback, CPF refund, net cash proceeds
- **Forever Stay**: No exit math — you never sell. Shows "Financial Position at MOP" instead

## Accrued CPF Interest

The BTO calculator accurately tracks the CPF interest owed back to the member when the flat is sold. Monthly mortgage payments are compounded at the OA rate (2.5% p.a.) to reflect the true accrued CPF balance that gets refunded on sale.

## Lease Buyback Scheme (LBS)

Available in Forever Stay mode. At age 65, model selling part of your lease back to HDB:
- **Proceeds**: Estimated as percentage of property value (varies by flat type)
- **RA Top-up**: Proceeds top up each spouse's RA up to FRS
- **Cash Excess**: Any remaining proceeds after RA top-up
- **HDB Cash Bonus**: $30k (2/3-room), $15k (4-room), $7.5k (5/Exec) if combined top-up ≥ $60k
- **Impact**: RA balance increases → higher CPF LIFE monthly payouts

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
│   ├── cpf-engine.js   # CPF calculation engine (all rules)
│   ├── salary.js       # Salary page logic & charts
│   └── bto.js          # BTO page logic & charts
├── assets/             # (optional icons/images)
└── README.md
```

## How to Use

1. Open `index.html` or deploy to GitHub Pages
2. Start with the **Salary Calculator** to set up your financial profile
3. Move to the **BTO Calculator** — your salary data auto-loads
4. Compare two property paths side-by-side
5. Use the **Scenario Toggle** to compare Forever Stay vs Sell & Buy Resale
6. Enable **LBS** in Forever Stay mode to model lease buyback at 65
7. Check the **Retirement Projection** for CPF at retirement age
8. View the **CPF Trajectory Chart** for long-term comparison

## Disclaimer

This calculator is for educational and planning purposes only. It uses simplified models and may not account for all edge cases. Always verify calculations with official CPF Board and HDB resources before making financial decisions.
