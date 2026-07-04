let charts = {};

const SALARY_INPUT_IDS = [
  'h-age','h-salary','h-increment','h-oa','h-sa','h-ma','h-bonus',
  'w-age','w-salary','w-increment','w-oa','w-sa','w-ma','w-bonus',
  'retirement-age','monthly-savings',
];

function saveSalaryInputs() {
  const data = {};
  SALARY_INPUT_IDS.forEach(id => { data[id] = document.getElementById(id).value; });
  localStorage.setItem('cpf_salary_inputs', JSON.stringify(data));

  localStorage.setItem('cpfCalculatorData', JSON.stringify({
    spouse1: {
      age: +document.getElementById('h-age').value,
      salary: +document.getElementById('h-salary').value,
      increment: +document.getElementById('h-increment').value,
      oa: +document.getElementById('h-oa').value,
      sa: +document.getElementById('h-sa').value,
      ma: +document.getElementById('h-ma').value,
      bonus: +document.getElementById('h-bonus').value,
    },
    spouse2: {
      age: +document.getElementById('w-age').value,
      salary: +document.getElementById('w-salary').value,
      increment: +document.getElementById('w-increment').value,
      oa: +document.getElementById('w-oa').value,
      sa: +document.getElementById('w-sa').value,
      ma: +document.getElementById('w-ma').value,
      bonus: +document.getElementById('w-bonus').value,
    },
    monthlySavings: +document.getElementById('monthly-savings').value || 0,
  }));
}

function restoreSalaryInputs() {
  try {
    const saved = JSON.parse(localStorage.getItem('cpf_salary_inputs'));
    if (!saved) return;
    SALARY_INPUT_IDS.forEach(id => {
      if (saved[id] !== undefined) document.getElementById(id).value = saved[id];
    });
  } catch (e) {}
}

function calculate() {
  saveSalaryInputs();

  const hData = {
    currentAge: +document.getElementById('h-age').value,
    grossMonthlySalary: +document.getElementById('h-salary').value,
    annualIncrement: +document.getElementById('h-increment').value,
    currentOA: +document.getElementById('h-oa').value,
    currentSA: +document.getElementById('h-sa').value,
    currentMA: +document.getElementById('h-ma').value,
    targetAge: +document.getElementById('retirement-age').value,
    monthlyCashSavings: 0,
    annualBonus: 0,
  };

  const wData = {
    currentAge: +document.getElementById('w-age').value,
    grossMonthlySalary: +document.getElementById('w-salary').value,
    annualIncrement: +document.getElementById('w-increment').value,
    currentOA: +document.getElementById('w-oa').value,
    currentSA: +document.getElementById('w-sa').value,
    currentMA: +document.getElementById('w-ma').value,
    targetAge: +document.getElementById('retirement-age').value,
    monthlyCashSavings: 0,
    annualBonus: 0,
  };

  const sharedSavings = +document.getElementById('monthly-savings').value || 0;
  hData.monthlyCashSavings = sharedSavings / 2;
  wData.monthlyCashSavings = sharedSavings / 2;
  hData.annualBonus = +document.getElementById('h-bonus').value || 0;
  wData.annualBonus = +document.getElementById('w-bonus').value || 0;

  const hRows = projectCPF(hData);
  const wRows = projectCPF(wData);

  const targetAge = +document.getElementById('retirement-age').value;
  const hFinal = hRows[hRows.length - 1];
  const wFinal = wRows[wRows.length - 1];

  const combinedCPF = hFinal.totalCPF + wFinal.totalCPF;
  const combinedCash = hFinal.cash + wFinal.cash;
  const combinedNetWorth = combinedCPF + combinedCash;

  const hCPFLIFE = calcCPFLife(hFinal.ra);
  const wCPFLIFE = calcCPFLife(wFinal.ra);
  const combinedPayout = hCPFLIFE + wCPFLIFE;

  renderSummaryCards(hFinal, wFinal, combinedCPF, combinedCash, combinedNetWorth, combinedPayout, targetAge);
  renderTables(hRows, wRows);
  renderCharts(hRows, wRows, hFinal, wFinal);

  document.getElementById('results').style.display = 'block';
  document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

function renderSummaryCards(h, w, cpf, cash, nw, payout, age) {
  const el = document.getElementById('summary-cards');
  el.innerHTML = `
    <div class="summary-card total">
      <div class="label">Combined Net Worth at ${age}</div>
      <div class="value">${formatCurrency(nw)}</div>
    </div>
    <div class="summary-card oa">
      <div class="label">Combined CPF at ${age}</div>
      <div class="value">${formatCurrency(cpf)}</div>
    </div>
    <div class="summary-card cash">
      <div class="label">Combined Cash at ${age}</div>
      <div class="value">${formatCurrency(cash)}</div>
    </div>
    <div class="summary-card ra">
      <div class="label">Est. CPF LIFE Monthly Payout</div>
      <div class="value">${formatCurrency(payout)}</div>
    </div>
    <div class="summary-card sa">
      <div class="label">Husband CPF at ${age}</div>
      <div class="value">${formatCurrency(h.totalCPF)}</div>
    </div>
    <div class="summary-card ma">
      <div class="label">Wife CPF at ${age}</div>
      <div class="value">${formatCurrency(w.totalCPF)}</div>
    </div>
  `;
}

function renderTables(hRows, wRows) {
  document.getElementById('table-husband').innerHTML = buildTableHTML(hRows);
  document.getElementById('table-wife').innerHTML = buildTableHTML(wRows);
}

function buildTableHTML(rows) {
  let html = `<thead><tr>
    <th>Year</th><th>Age</th><th>Salary</th><th>Contrib</th>
    <th>Year OA</th><th>Year SA/RA</th><th>Year MA</th>
    <th>OA Bal</th><th>SA/RA Bal</th><th>MA Bal</th>
    <th>Total CPF</th><th>Cash</th><th>Net Worth</th>
  </tr></thead><tbody>`;

  rows.forEach(r => {
    let cls = '';
    if (r.age === 55) cls = 'class="milestone-55"';
    else if (r.age === 65) cls = 'class="milestone-65"';

    html += `<tr ${cls}>
      <td>${r.year}</td>
      <td>${r.age}</td>
      <td>${formatCurrency(r.salary)}</td>
      <td>${formatCurrency(r.contrib)}</td>
      <td>${formatCurrency(r.yearOA)}</td>
      <td>${formatCurrency(r.yearSA || r.yearRA)}</td>
      <td>${formatCurrency(r.yearMA)}</td>
      <td>${formatCurrency(r.oa)}</td>
      <td>${formatCurrency(r.sa || r.ra)}</td>
      <td>${formatCurrency(r.ma)}</td>
      <td>${formatCurrency(r.totalCPF)}</td>
      <td>${formatCurrency(r.cash)}</td>
      <td>${formatCurrency(r.netWorth)}</td>
    </tr>`;
  });

  html += '</tbody>';
  return html;
}

function renderCharts(hRows, wRows, hFinal, wFinal) {
  Object.values(charts).forEach(c => c.destroy());
  charts = {};

  const ages = hRows.map(r => r.age);
  const hOA = hRows.map(r => r.oa);
  const wOA = wRows.map(r => r.oa);
  const hSA = hRows.map(r => r.sa || r.ra);
  const wSA = wRows.map(r => r.sa || r.ra);
  const hMA = hRows.map(r => r.ma);
  const wMA = wRows.map(r => r.ma);

  const combinedOA = ages.map((_, i) => hOA[i] + wOA[i]);
  const combinedSA = ages.map((_, i) => hSA[i] + wSA[i]);
  const combinedMA = ages.map((_, i) => hMA[i] + wMA[i]);
  const combinedNW = ages.map((_, i) => hRows[i].netWorth + wRows[i].netWorth);

  const chartDefaults = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
    },
    scales: {
      x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: '#1e293b' } },
      y: { ticks: { color: '#64748b', font: { size: 10 }, callback: v => '$' + (v/1000).toFixed(0) + 'k' }, grid: { color: '#1e293b' } },
    },
  };

  charts.cpf = new Chart(document.getElementById('chart-cpf'), {
    type: 'line',
    data: {
      labels: ages,
      datasets: [
        { label: 'OA', data: combinedOA, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.15)', fill: true, tension: 0.3, pointRadius: 1 },
        { label: 'SA/RA', data: combinedSA, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.15)', fill: true, tension: 0.3, pointRadius: 1 },
        { label: 'MA', data: combinedMA, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.15)', fill: true, tension: 0.3, pointRadius: 1 },
      ]
    },
    options: { ...chartDefaults, scales: { ...chartDefaults.scales, x: { ...chartDefaults.scales.x, title: { display: true, text: 'Age', color: '#64748b' } } } }
  });

  charts.nw = new Chart(document.getElementById('chart-networth'), {
    type: 'line',
    data: {
      labels: ages,
      datasets: [
        { label: 'Husband', data: hRows.map(r => r.netWorth), borderColor: '#3b82f6', tension: 0.3, pointRadius: 1 },
        { label: 'Wife', data: wRows.map(r => r.netWorth), borderColor: '#f59e0b', tension: 0.3, pointRadius: 1 },
        { label: 'Combined', data: combinedNW, borderColor: '#6366f1', borderWidth: 2, tension: 0.3, pointRadius: 1 },
      ]
    },
    options: chartDefaults
  });

  const hCPFLIFE = calcCPFLife(hFinal.ra);
  const wCPFLIFE = calcCPFLife(wFinal.ra);
  const hCashDrawdown = Math.round(hFinal.cash / ((75 - 65) * 12));
  const wCashDrawdown = Math.round(wFinal.cash / ((75 - 65) * 12));

  charts.income = new Chart(document.getElementById('chart-income'), {
    type: 'bar',
    data: {
      labels: ['Husband', 'Wife', 'Combined'],
      datasets: [
        { label: 'CPF LIFE', data: [hCPFLIFE, wCPFLIFE, hCPFLIFE + wCPFLIFE], backgroundColor: '#3b82f6' },
        { label: 'Cash Drawdown', data: [hCashDrawdown, wCashDrawdown, hCashDrawdown + wCashDrawdown], backgroundColor: '#f59e0b' },
      ]
    },
    options: { ...chartDefaults, scales: { ...chartDefaults.scales, x: { stacked: true }, y: { ...chartDefaults.scales.y, stacked: true } } }
  });

  charts.alloc = new Chart(document.getElementById('chart-allocation'), {
    type: 'doughnut',
    data: {
      labels: ['OA', 'SA/RA', 'MA', 'Cash'],
      datasets: [{
        data: [hFinal.oa + wFinal.oa, (hFinal.sa || hFinal.ra) + (wFinal.sa || wFinal.ra), hFinal.ma + wFinal.ma, hFinal.cash + wFinal.cash],
        backgroundColor: ['#3b82f6', '#10b981', '#ef4444', '#f59e0b'],
        borderColor: '#1e293b',
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8', padding: 15 } },
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  restoreSalaryInputs();
  initTooltips();
});

function initTooltips() {
  document.addEventListener('click', (e) => {
    const tip = e.target.closest('.tip');
    if (tip) {
      e.stopPropagation();
      document.querySelectorAll('.tip.show').forEach(t => { if (t !== tip) t.classList.remove('show'); });
      tip.classList.toggle('show');
    } else {
      document.querySelectorAll('.tip.show').forEach(t => t.classList.remove('show'));
    }
  });
}
