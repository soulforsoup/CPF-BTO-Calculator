let btoCharts = {};
let levyState = { a: false, b: false };

const BTO_SHARED_IDS = [
  's1-income','s2-income','s1-increment','s2-increment',
  's1-oa','s1-sa','s1-ma','s2-oa','s2-sa','s2-ma',
  's1-age','s2-age','monthly-cash-savings','buyer-ceiling',
];

const BTO_PATH_IDS = ['price','mop','growth','clawback-type','clawback-pct','loan-rate','tenure','cash-deposit','cpf-deposit','grants','reno','monthly-costs','hps','flat-type'];

function toggleLevy(path) {
  levyState[path] = !levyState[path];
  const toggle = document.getElementById(path + '-levy-toggle');
  const label = document.getElementById(path + '-levy-label');
  const group = document.getElementById(path + '-flat-type-group');
  toggle.classList.toggle('active', levyState[path]);
  label.textContent = levyState[path] ? 'On' : 'Off';
  group.style.display = levyState[path] ? 'block' : 'none';
}

document.querySelectorAll('[id$="-clawback-type"]').forEach(el => {
  el.addEventListener('change', function() {
    const path = this.id.replace('-clawback-type', '');
    const group = document.getElementById(path + '-clawback-pct-group');
    group.style.display = this.value === 'none' ? 'none' : 'block';
  });
});

function saveBTOInputs() {
  const data = {};
  BTO_SHARED_IDS.forEach(id => { data[id] = document.getElementById(id).value; });
  ['a','b'].forEach(p => {
    BTO_PATH_IDS.forEach(id => { data[p + '-' + id] = document.getElementById(p + '-' + id).value; });
    data[p + '-levy'] = levyState[p];
  });
  localStorage.setItem('cpf_bto_inputs', JSON.stringify(data));
}

function restoreBTOInputs() {
  try {
    const saved = JSON.parse(localStorage.getItem('cpf_bto_inputs'));
    if (!saved) return;
    BTO_SHARED_IDS.forEach(id => {
      if (saved[id] !== undefined) document.getElementById(id).value = saved[id];
    });
    ['a','b'].forEach(p => {
      BTO_PATH_IDS.forEach(id => {
        const el = document.getElementById(p + '-' + id);
        if (el && saved[p + '-' + id] !== undefined) el.value = saved[p + '-' + id];
      });
      if (saved[p + '-levy']) {
        levyState[p] = true;
        document.getElementById(p + '-levy-toggle').classList.add('active');
        document.getElementById(p + '-levy-label').textContent = 'On';
        document.getElementById(p + '-flat-type-group').style.display = 'block';
      }
      const ct = document.getElementById(p + '-clawback-type');
      if (ct) {
        const group = document.getElementById(p + '-clawback-pct-group');
        group.style.display = ct.value === 'none' ? 'none' : 'block';
      }
    });
  } catch (e) {}
}

function loadSalaryData() {
  try {
    const saved = JSON.parse(localStorage.getItem('cpfCalculatorData'));
    if (saved && saved.spouse1 && saved.spouse2) {
      document.getElementById('s1-income').value = saved.spouse1.salary;
      document.getElementById('s2-income').value = saved.spouse2.salary;
      document.getElementById('s1-increment').value = saved.spouse1.increment;
      document.getElementById('s2-increment').value = saved.spouse2.increment;
      document.getElementById('s1-oa').value = saved.spouse1.oa;
      document.getElementById('s2-oa').value = saved.spouse2.oa;
      document.getElementById('s1-sa').value = saved.spouse1.sa;
      document.getElementById('s2-sa').value = saved.spouse2.sa;
      document.getElementById('s1-ma').value = saved.spouse1.ma;
      document.getElementById('s2-ma').value = saved.spouse2.ma;
      document.getElementById('s1-age').value = saved.spouse1.age;
      document.getElementById('s2-age').value = saved.spouse2.age;
      if (saved.monthlySavings) {
        document.getElementById('monthly-cash-savings').value = saved.monthlySavings;
      }
      const badge = document.getElementById('salary-badge');
      badge.style.display = 'block';
      document.getElementById('badge-text').textContent = 'Loaded from Salary Calculator - All fields editable';
    }
  } catch (e) {}
}

window.addEventListener('DOMContentLoaded', () => {
  loadSalaryData();
  restoreBTOInputs();
});

function calculateBTO() {
  saveBTOInputs();

  const shared = {
    s1Income: +document.getElementById('s1-income').value,
    s2Income: +document.getElementById('s2-income').value,
    s1Increment: +document.getElementById('s1-increment').value / 100,
    s2Increment: +document.getElementById('s2-increment').value / 100,
    s1OA: +document.getElementById('s1-oa').value,
    s1SA: +document.getElementById('s1-sa').value,
    s1MA: +document.getElementById('s1-ma').value,
    s2OA: +document.getElementById('s2-oa').value,
    s2SA: +document.getElementById('s2-sa').value,
    s2MA: +document.getElementById('s2-ma').value,
    s1Age: +document.getElementById('s1-age').value,
    s2Age: +document.getElementById('s2-age').value,
    monthlyCashSavings: +document.getElementById('monthly-cash-savings').value,
    buyerCeiling: +document.getElementById('buyer-ceiling').value,
  };

  const pathA = calcPath('a', shared);
  const pathB = calcPath('b', shared);

  renderBTOResults(pathA, 'a');
  renderBTOResults(pathB, 'b');
  renderBTOCharts(pathA, pathB);

  document.getElementById('bto-results').style.display = 'block';
  document.getElementById('bto-results').scrollIntoView({ behavior: 'smooth' });
}

function calcPath(p, shared) {
  const price = +document.getElementById(p + '-price').value;
  const mop = +document.getElementById(p + '-mop').value;
  const growth = +document.getElementById(p + '-growth').value;
  const clawbackType = document.getElementById(p + '-clawback-type').value;
  const clawbackPct = +document.getElementById(p + '-clawback-pct').value || 0;
  const loanRate = +document.getElementById(p + '-loan-rate').value / 100;
  const tenure = +document.getElementById(p + '-tenure').value;
  const cashDeposit = +document.getElementById(p + '-cash-deposit').value;
  const cpfDeposit = +document.getElementById(p + '-cpf-deposit').value;
  const grants = +document.getElementById(p + '-grants').value;
  const reno = +document.getElementById(p + '-reno').value;
  const monthlyCosts = +document.getElementById(p + '-monthly-costs').value;
  const hps = +document.getElementById(p + '-hps').value;
  const flatType = document.getElementById(p + '-flat-type').value;

  const loanAmount = Math.round(price * CPF_CONFIG.hdbLtv);
  const monthlyMortgage = calcMortgage(loanAmount, loanRate, tenure);
  const bsd = calcBSD(price);
  const s1MonthlyOA = Math.round(shared.s1Income * getAllocationOA(shared.s1Age));
  const s2MonthlyOA = Math.round(shared.s2Income * getAllocationOA(shared.s2Age));
  const combinedOA = s1MonthlyOA + s2MonthlyOA;

  let totalCashDeployed = cashDeposit + reno + (monthlyCosts + hps) * mop * 12;
  let totalCPFUsed = cpfDeposit + bsd;
  let accruedCPF = 0;
  for (let m = 0; m < mop * 12; m++) {
    const monthContrib = combinedOA;
    if (monthContrib > 0) {
      accruedCPF = (accruedCPF + monthContrib) * (1 + CPF_CONFIG.oaRate / 12);
    }
  }

  const mortgageBalanceAtMOP = calcMortgageBalance(loanAmount, loanRate, tenure, mop);
  const totalMortgagePaid = monthlyMortgage * mop * 12;

  const s1Proj = projectCPF({
    currentAge: shared.s1Age, grossMonthlySalary: shared.s1Income,
    annualIncrement: shared.s1Increment * 100, currentOA: shared.s1OA,
    currentSA: shared.s1SA, currentMA: shared.s1MA,
    targetAge: shared.s1Age + mop, monthlyCashSavings: 0, annualBonus: 0,
  });
  const s2Proj = projectCPF({
    currentAge: shared.s2Age, grossMonthlySalary: shared.s2Income,
    annualIncrement: shared.s2Increment * 100, currentOA: shared.s2OA,
    currentSA: shared.s2SA, currentMA: shared.s2MA,
    targetAge: shared.s2Age + mop, monthlyCashSavings: 0, annualBonus: 0,
  });

  const s1Final = s1Proj[s1Proj.length - 1];
  const s2Final = s2Proj[s2Proj.length - 1];

  const careerCash = shared.monthlyCashSavings * mop * 12;
  const careerCashSaved = careerCash - totalCashDeployed;

  const sellingPrice = calcSellingPrice(price, growth, mop);
  const agentCommission = Math.round(sellingPrice * 0.02);
  let subsidyClawback = 0;
  if (clawbackType === 'plh' || clawbackType === 'plus') {
    subsidyClawback = calcSubsidyClawback(sellingPrice, clawbackPct);
  }
  let resaleLevyAmt = 0;
  if (levyState[p]) {
    resaleLevyAmt = calcResaleLevy(flatType);
  }
  const cpfRefunded = totalCPFUsed;
  const netCashProceeds = sellingPrice - agentCommission - subsidyClawback - resaleLevyAmt - mortgageBalanceAtMOP + cpfRefunded;

  const combinedCPFAtMOP = s1Final.totalCPF + s2Final.totalCPF;
  const combinedCashAtMOP = careerCashSaved + netCashProceeds;

  const maxBuyerIncome = shared.buyerCeiling;
  const maxBuyerLoan = Math.round(maxBuyerIncome * CPF_CONFIG.hdbLtv * 0.3 * tenure * 12);
  const cashCPFGap = sellingPrice - maxBuyerLoan;

  return {
    price, mop, growth, clawbackType, clawbackPct, loanRate, tenure,
    cashDeposit, cpfDeposit, grants, reno, monthlyCosts, hps,
    loanAmount, monthlyMortgage, bsd, s1MonthlyOA, s2MonthlyOA, combinedOA,
    totalCashDeployed, totalCPFUsed, accruedCPF, mortgageBalanceAtMOP,
    totalMortgagePaid, careerCash, careerCashSaved,
    s1Proj, s2Proj, s1Final, s2Final,
    sellingPrice, agentCommission, subsidyClawback, resaleLevyAmt, cpfRefunded,
    netCashProceeds, combinedCPFAtMOP, combinedCashAtMOP,
    maxBuyerIncome, maxBuyerLoan, cashCPFGap,
  };
}

function getAllocationOA(age) {
  const alloc = getAllocationRates(age);
  return alloc.oa || 0;
}

function renderBTOResults(p, path) {
  const el = document.getElementById(path + '-results');
  el.innerHTML = `
    <div class="section-title">AUTOMATED FINANCING & FEES</div>
    <div class="form-grid" style="margin-bottom:1rem;">
      <div class="form-group"><label>Buyer Stamp Duty</label><input type="text" value="${formatCurrency(p.bsd)}" readonly></div>
      <div class="form-group"><label>Loan Amount (75%)</label><input type="text" value="${formatCurrency(p.loanAmount)}" readonly></div>
      <div class="form-group"><label>Monthly Mortgage</label><input type="text" value="${formatCurrency(p.monthlyMortgage)}" readonly></div>
      <div class="form-group"><label>Combined Monthly OA</label><input type="text" value="${formatCurrency(p.combinedOA)}" readonly></div>
    </div>

    <div class="section-title">SNAPSHOT 1: BEFORE THE SALE (YEAR MOP)</div>
    <div class="form-grid" style="margin-bottom:1rem;">
      <div class="form-group"><label>Total Liquid Cash Deployed</label><input type="text" value="${formatCurrency(p.totalCashDeployed)}" readonly></div>
      <div class="form-group"><label>Remaining Mortgage Loan</label><input type="text" value="${formatCurrency(p.mortgageBalanceAtMOP)}" readonly></div>
      <div class="form-group"><label>Accrued CPF Owed</label><input type="text" value="${formatCurrency(p.accruedCPF)}" readonly></div>
      <div class="form-group"><label>Total Career Cash Saved</label><input type="text" value="${formatCurrency(p.careerCash)}" readonly></div>
    </div>

    <div class="section-title">SNAPSHOT 2: AFTER THE SALE (EXIT MATH)</div>
    <div class="form-grid" style="margin-bottom:1rem;">
      <div class="form-group"><label>Gross Selling Price</label><input type="text" value="${formatCurrency(p.sellingPrice)}" readonly></div>
      <div class="form-group"><label>Agent Commission (2%)</label><input type="text" value="${formatCurrency(p.agentCommission)}" readonly></div>
      ${p.clawbackType !== 'none' ? `<div class="form-group"><label>Subsidy Clawback</label><input type="text" value="${formatCurrency(p.subsidyClawback)}" readonly></div>` : ''}
      ${p.resaleLevyAmt > 0 ? `<div class="form-group"><label>Resale Levy</label><input type="text" value="${formatCurrency(p.resaleLevyAmt)}" readonly></div>` : ''}
      <div class="form-group"><label>CPF Refunded to OA</label><input type="text" value="${formatCurrency(p.cpfRefunded)}" readonly></div>
      <div class="form-group"><label>Net Cash Proceeds</label><input type="text" value="${formatCurrency(p.netCashProceeds)}" readonly style="color:var(--success);font-weight:700;"></div>
    </div>

    <div class="section-title">BUYER AFFORDABILITY CHECK</div>
    <div class="form-grid" style="margin-bottom:1rem;">
      <div class="form-group"><label>Max Buyer Income</label><input type="text" value="${formatCurrency(p.maxBuyerIncome)}" readonly></div>
      <div class="form-group"><label>Max Buyer Loan</label><input type="text" value="${formatCurrency(p.maxBuyerLoan)}" readonly></div>
      <div class="form-group"><label>Cash/CPF Gap</label><input type="text" value="${formatCurrency(p.cashCPFGap)}" readonly></div>
    </div>

    <div class="section-title">SPOUSE BREAKDOWN AT MOP</div>
    <div class="form-grid">
      <div class="form-group"><label>Husband CPF at MOP</label><input type="text" value="${formatCurrency(p.s1Final.totalCPF)}" readonly></div>
      <div class="form-group"><label>Husband Cash at MOP</label><input type="text" value="${formatCurrency(Math.round(p.s1Final.cash + p.careerCashSaved / 2))}" readonly></div>
      <div class="form-group"><label>Wife CPF at MOP</label><input type="text" value="${formatCurrency(p.s2Final.totalCPF)}" readonly></div>
      <div class="form-group"><label>Wife Cash at MOP</label><input type="text" value="${formatCurrency(Math.round(p.s2Final.cash + p.careerCashSaved / 2))}" readonly></div>
      <div class="form-group"><label>Combined Household</label><input type="text" value="${formatCurrency(p.combinedCPFAtMOP + p.combinedCashAtMOP)}" readonly style="color:var(--accent);font-weight:700;"></div>
    </div>
  `;
}

function renderBTOCharts(a, b) {
  Object.values(btoCharts).forEach(c => c.destroy());
  btoCharts = {};

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { labels: { color: '#94a3b8', font: { size: 11 } } } },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: '#1e293b' } },
      y: { ticks: { color: '#64748b', callback: v => '$' + (v/1000).toFixed(0) + 'k' }, grid: { color: '#1e293b' } },
    },
  };

  btoCharts.proceeds = new Chart(document.getElementById('chart-proceeds'), {
    type: 'bar',
    data: {
      labels: ['Path A', 'Path B'],
      datasets: [
        { label: 'Gross Selling Price', data: [a.sellingPrice, b.sellingPrice], backgroundColor: '#3b82f6' },
        { label: 'Net Cash Proceeds', data: [a.netCashProceeds, b.netCashProceeds], backgroundColor: '#22c55e' },
      ]
    },
    options: chartDefaults
  });

  const mop = Math.max(a.mop, b.mop);
  const years = Array.from({ length: mop + 1 }, (_, i) => i);
  const aValue = years.map(y => calcSellingPrice(a.price, a.growth, y));
  const bValue = years.map(y => calcSellingPrice(b.price, b.growth, y));
  const aMortgage = years.map(y => calcMortgageBalance(a.loanAmount, a.loanRate, a.tenure, y));
  const bMortgage = years.map(y => calcMortgageBalance(b.loanAmount, b.loanRate, b.tenure, y));

  btoCharts.valueMortgage = new Chart(document.getElementById('chart-value-mortgage'), {
    type: 'line',
    data: {
      labels: years.map(y => 'Year ' + y),
      datasets: [
        { label: 'Path A Value', data: aValue, borderColor: '#3b82f6', tension: 0.3, pointRadius: 2 },
        { label: 'Path A Mortgage', data: aMortgage, borderColor: '#3b82f6', borderDash: [5,5], tension: 0.3, pointRadius: 2 },
        { label: 'Path B Value', data: bValue, borderColor: '#10b981', tension: 0.3, pointRadius: 2 },
        { label: 'Path B Mortgage', data: bMortgage, borderColor: '#10b981', borderDash: [5,5], tension: 0.3, pointRadius: 2 },
      ]
    },
    options: chartDefaults
  });

  btoCharts.household = new Chart(document.getElementById('chart-household'), {
    type: 'bar',
    data: {
      labels: ['Path A', 'Path B'],
      datasets: [
        { label: 'Husband CPF', data: [a.s1Final.totalCPF, b.s1Final.totalCPF], backgroundColor: '#3b82f6' },
        { label: 'Wife CPF', data: [a.s2Final.totalCPF, b.s2Final.totalCPF], backgroundColor: '#10b981' },
        { label: 'Cash', data: [a.combinedCashAtMOP, b.combinedCashAtMOP], backgroundColor: '#f59e0b' },
      ]
    },
    options: { ...chartDefaults, scales: { ...chartDefaults.scales, x: { stacked: true }, y: { ...chartDefaults.scales.y, stacked: true } } }
  });

  btoCharts.snapshots = new Chart(document.getElementById('chart-snapshots'), {
    type: 'bar',
    data: {
      labels: ['Cash Deployed', 'Mortgage Left', 'CPF Owed', 'Net Proceeds'],
      datasets: [
        { label: 'Path A', data: [a.totalCashDeployed, a.mortgageBalanceAtMOP, a.accruedCPF, a.netCashProceeds], backgroundColor: '#3b82f6' },
        { label: 'Path B', data: [b.totalCashDeployed, b.mortgageBalanceAtMOP, b.accruedCPF, b.netCashProceeds], backgroundColor: '#10b981' },
      ]
    },
    options: chartDefaults
  });
}
