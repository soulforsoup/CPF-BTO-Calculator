let btoCharts = {};
let levyState = { a: false, b: false };
let valuationManual = { a: false, b: false };

const BTO_SHARED_IDS = [
  's1-income','s2-income','s1-increment','s2-increment',
  's1-oa','s1-sa','s1-ma','s2-oa','s2-sa','s2-ma',
  's1-age','s2-age','monthly-cash-savings','buyer-ceiling',
  'retirement-age','mortgage-split',
];

const BTO_PATH_IDS = [
  'timeline','build-time','price','valuation','mop','growth',
  'clawback-type','clawback-pct','loan-type','loan-rate','tenure',
  'grants','reno','monthly-costs','hps','flat-type',
  'scenario',
  'resale-price','resale-growth','resale-loan-rate','resale-tenure','resale-grants',
];

function toggleLevy(path) {
  levyState[path] = !levyState[path];
  document.getElementById(path + '-levy-toggle').classList.toggle('active', levyState[path]);
  document.getElementById(path + '-levy-label').textContent = levyState[path] ? 'On' : 'Off';
  document.getElementById(path + '-flat-type-group').style.display = levyState[path] ? 'block' : 'none';
}

function onTimelineChange(path) {
  const timeline = document.getElementById(path + '-timeline').value;
  document.getElementById(path + '-build-time-group').style.display = timeline === 'bto' ? 'flex' : 'none';
  document.getElementById(path + '-valuation-group').style.display = timeline === 'resale' ? 'flex' : 'none';
  if (timeline === 'resale' && !valuationManual[path]) {
    document.getElementById(path + '-valuation').value = document.getElementById(path + '-price').value;
  }
  autoCalcDeposit(path);
}

function onPriceChange(path) {
  const price = document.getElementById(path + '-price').value;
  if (!valuationManual[path]) {
    document.getElementById(path + '-valuation').value = price;
  }
  autoCalcDeposit(path);
}

function onValuationManual(path) {
  valuationManual[path] = true;
  autoCalcDeposit(path);
}

function onClawbackChange(path) {
  const type = document.getElementById(path + '-clawback-type').value;
  document.getElementById(path + '-clawback-pct-group').style.display = type === 'none' ? 'none' : 'block';
}

function onScenarioChange(path) {
  const scenario = document.getElementById(path + '-scenario').value;
  document.getElementById(path + '-warchest').style.display = scenario === 'resale' ? 'block' : 'none';
  document.getElementById(path + '-resale-inputs').style.display = scenario === 'resale' ? 'grid' : 'none';
}

function autoCalcDeposit(path) {
  const shared = readShared();
  const result = calcPath(path, shared);
  renderDepositBreakdown(result, path);
}

function readShared() {
  return {
    s1Income: +document.getElementById('s1-income').value,
    s2Income: +document.getElementById('s2-income').value,
    s1Increment: +document.getElementById('s1-increment').value,
    s2Increment: +document.getElementById('s2-increment').value,
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
    retirementAge: +document.getElementById('retirement-age').value,
    mortgageSplit: document.getElementById('mortgage-split').value,
  };
}

function calcPath(p, shared) {
  const timeline = document.getElementById(p + '-timeline').value;
  const buildTime = timeline === 'bto' ? +document.getElementById(p + '-build-time').value : 0;
  const price = +document.getElementById(p + '-price').value;
  const valuation = +document.getElementById(p + '-valuation').value || price;
  const mop = +document.getElementById(p + '-mop').value;
  const growth = +document.getElementById(p + '-growth').value;
  const clawbackType = document.getElementById(p + '-clawback-type').value;
  const clawbackPct = +document.getElementById(p + '-clawback-pct').value || 0;
  const loanType = document.getElementById(p + '-loan-type').value;
  const loanRate = +document.getElementById(p + '-loan-rate').value / 100;
  const tenure = +document.getElementById(p + '-tenure').value;
  const grants = +document.getElementById(p + '-grants').value;
  const reno = +document.getElementById(p + '-reno').value;
  const monthlyCosts = +document.getElementById(p + '-monthly-costs').value;
  const hps = +document.getElementById(p + '-hps').value;
  const flatType = document.getElementById(p + '-flat-type').value;
  const scenario = document.getElementById(p + '-scenario').value;
  const retirementAge = shared.retirementAge;

  const totalYears = buildTime + mop;
  const bsd = calcBSD(price);
  const cov = Math.max(0, price - valuation);

  let projectedS1OA = shared.s1OA;
  let projectedS2OA = shared.s2OA;
  if (timeline === 'bto' && buildTime > 0) {
    const s1Proj = projectCPF({
      currentAge: shared.s1Age, grossMonthlySalary: shared.s1Income,
      annualIncrement: shared.s1Increment, currentOA: shared.s1OA,
      currentSA: shared.s1SA, currentMA: shared.s1MA,
      targetAge: shared.s1Age + buildTime, monthlyCashSavings: 0, annualBonus: 0,
    });
    const s2Proj = projectCPF({
      currentAge: shared.s2Age, grossMonthlySalary: shared.s2Income,
      annualIncrement: shared.s2Increment, currentOA: shared.s2OA,
      currentSA: shared.s2SA, currentMA: shared.s2MA,
      targetAge: shared.s2Age + buildTime, monthlyCashSavings: 0, annualBonus: 0,
    });
    projectedS1OA = s1Proj[s1Proj.length - 1].oa;
    projectedS2OA = s2Proj[s2Proj.length - 1].oa;
  }

  const currentCombinedOA = shared.s1OA + shared.s2OA;
  const projectedCombinedOA = projectedS1OA + projectedS2OA;
  const availableOA = timeline === 'bto' ? projectedCombinedOA : currentCombinedOA;

  let s1Cpf, s1Cash, s2Cpf, s2Cash, stage1Label, stage2Label, stage1Items, stage2Items;
  let excessGrant = 0;

  if (timeline === 'bto') {
    const stage1Total = price * 0.05 + bsd;
    s1Cpf = Math.min(currentCombinedOA, stage1Total);
    s1Cash = Math.max(0, stage1Total - s1Cpf);

    const grantOffset = Math.min(grants, price * 0.15);
    const stage2Total = Math.max(0, price * 0.15 - grantOffset);
    const remainingOA = Math.max(0, projectedCombinedOA - s1Cpf);
    s2Cpf = Math.min(remainingOA, stage2Total);
    s2Cash = Math.max(0, stage2Total - s2Cpf);

    excessGrant = grants - grantOffset;

    stage1Label = 'Signing (Now)';
    stage2Label = `Key Collection (Year ${buildTime})`;
    stage1Items = [
      { label: '5% Booking Fee', value: price * 0.05 },
      { label: 'Buyer\'s Stamp Duty (BSD)', value: bsd },
    ];
    stage2Items = [
      { label: '15% of Price', value: price * 0.15 },
    ];
    if (grantOffset > 0) stage2Items.push({ label: '− CPF Grants', value: -grantOffset, cls: 'cpf' });
    if (excessGrant > 0) stage2Items.push({ label: 'Excess Grant → Loan', value: -excessGrant, cls: 'cpf' });
  } else {
    const optionFees = 5000;
    s1Cpf = Math.min(currentCombinedOA, bsd);
    s1Cash = optionFees + Math.max(0, bsd - s1Cpf);

    const remainingDP = Math.max(0, price * 0.25 - optionFees);
    const stage2Total = remainingDP + cov - grants;
    const remainingOA = Math.max(0, currentCombinedOA - s1Cpf);
    s2Cpf = Math.min(remainingOA, Math.max(0, stage2Total));
    s2Cash = Math.max(0, stage2Total - s2Cpf);

    stage1Label = 'OTP (Now)';
    stage2Label = 'Completion (8-12 weeks)';
    stage1Items = [
      { label: 'Option + Exercise Fee', value: optionFees, cls: 'cash' },
      { label: 'Buyer\'s Stamp Duty (BSD)', value: bsd },
    ];
    stage2Items = [
      { label: 'Remaining Downpayment', value: remainingDP },
    ];
    if (cov > 0) stage2Items.push({ label: 'Cash-Over-Valuation (COV)', value: cov, cls: 'cash' });
    if (grants > 0) stage2Items.push({ label: '− CPF Grants', value: -grants, cls: 'cpf' });
  }

  let totalCpf = s1Cpf + s2Cpf;
  let totalCash = s1Cash + s2Cash;

  let loanWarning = null;
  if (loanType === 'bank') {
    const minCash = price * 0.05;
    if (totalCash < minCash) {
      const shortfall = minCash - totalCash;
      s2Cash += shortfall;
      totalCash += shortfall;
      loanWarning = `Bank loan requires minimum 5% cash (${formatCurrency(minCash)}). Cash adjusted.`;
    }
  }

  const loanAmount = Math.round(price * CPF_CONFIG.hdbLtv);
  const effectiveLoan = timeline === 'bto' && excessGrant > 0 ? Math.max(0, loanAmount - excessGrant) : loanAmount;
  const monthlyMortgage = calcMortgage(effectiveLoan, loanRate, tenure);
  const mortgageBalanceAtMOP = calcMortgageBalance(effectiveLoan, loanRate, tenure, mop);
  const s1MonthlyOA = Math.round(shared.s1Income * getAllocationOA(shared.s1Age));
  const s2MonthlyOA = Math.round(shared.s2Income * getAllocationOA(shared.s2Age));
  const combinedOA = s1MonthlyOA + s2MonthlyOA;

  let totalCashDeployed = totalCash + reno + (monthlyCosts + hps) * mop * 12;
  let totalCPFUsed = totalCpf + bsd;
  let runningCpfWithdrawn = totalCpf + bsd;
  const monthlyOARate = CPF_CONFIG.oaRate / 12;
  for (let m = 0; m < mop * 12; m++) {
    runningCpfWithdrawn += monthlyMortgage;
    runningCpfWithdrawn *= (1 + monthlyOARate);
  }
  const cpfRefunded = Math.round(runningCpfWithdrawn);
  const accruedCPF = cpfRefunded - (totalCpf + bsd + monthlyMortgage * mop * 12);

  const s1Proj = projectCPF({
    currentAge: shared.s1Age, grossMonthlySalary: shared.s1Income,
    annualIncrement: shared.s1Increment, currentOA: shared.s1OA,
    currentSA: shared.s1SA, currentMA: shared.s1MA,
    targetAge: shared.s1Age + totalYears, monthlyCashSavings: 0, annualBonus: 0,
  });
  const s2Proj = projectCPF({
    currentAge: shared.s2Age, grossMonthlySalary: shared.s2Income,
    annualIncrement: shared.s2Increment, currentOA: shared.s2OA,
    currentSA: shared.s2SA, currentMA: shared.s2MA,
    targetAge: shared.s2Age + totalYears, monthlyCashSavings: 0, annualBonus: 0,
  });
  const s1Final = s1Proj[s1Proj.length - 1];
  const s2Final = s2Proj[s2Proj.length - 1];

  const careerCash = shared.monthlyCashSavings * totalYears * 12;
  const sellingPrice = calcSellingPrice(price, growth, totalYears);
  const agentCommission = Math.round(sellingPrice * 0.02);
  let subsidyClawback = 0;
  if (clawbackType === 'plh' || clawbackType === 'plus') {
    subsidyClawback = calcSubsidyClawback(sellingPrice, clawbackPct);
  }
  let resaleLevyAmt = 0;
  if (levyState[p]) {
    resaleLevyAmt = calcResaleLevy(flatType);
  }
  const netCashProceeds = sellingPrice - agentCommission - subsidyClawback - resaleLevyAmt - mortgageBalanceAtMOP - cpfRefunded;

  const combinedCPFAtMOP = s1Final.totalCPF + s2Final.totalCPF;
  const careerCashSaved = careerCash - totalCashDeployed;
  const combinedCashAtMOP = careerCashSaved + netCashProceeds;

  const maxBuyerIncome = shared.buyerCeiling;
  const maxBuyerLoan = Math.round(maxBuyerIncome * CPF_CONFIG.hdbLtv * 0.3 * tenure * 12);
  const cashCPFGap = sellingPrice - maxBuyerLoan;

  let mortgageSplit = shared.mortgageSplit;
  let s1MortgageShare, s2MortgageShare;
  if (mortgageSplit === 'proportional') {
    const totalIncome = s1Final.salary + s2Final.salary;
    s1MortgageShare = totalIncome > 0 ? s1Final.salary / totalIncome : 0.5;
    s2MortgageShare = 1 - s1MortgageShare;
  } else {
    s1MortgageShare = 0.5;
    s2MortgageShare = 0.5;
  }

  let s1Retire = null, s2Retire = null;
  let resaleData = null;

  if (scenario === 'resale') {
    const resalePrice = +document.getElementById(p + '-resale-price').value;
    const resaleGrowth = +document.getElementById(p + '-resale-growth').value;
    const resaleLoanRate = +document.getElementById(p + '-resale-loan-rate').value / 100;
    const resaleTenure = +document.getElementById(p + '-resale-tenure').value;
    const resaleGrants = +document.getElementById(p + '-resale-grants').value || 0;

    const resaleBSD = calcBSD(resalePrice);
    const resaleDP = resalePrice * 0.25;
    const resaleNetDP = Math.max(0, resaleDP - resaleGrants);

    const totalOAAtSale = s1Final.oa + s2Final.oa;
    const s1Share = totalOAAtSale > 0 ? s1Final.oa / totalOAAtSale : 0.5;
    const s2Share = 1 - s1Share;

    const s1ForBSD = Math.min(s1Final.oa, resaleBSD * s1Share);
    const s2ForBSD = Math.min(s2Final.oa, resaleBSD * s2Share);
    const s1AfterBSD = s1Final.oa - s1ForBSD;
    const s2AfterBSD = s2Final.oa - s2ForBSD;

    const s1ForDP = Math.min(s1AfterBSD, resaleNetDP * s1Share);
    const s2ForDP = Math.min(s2AfterBSD, resaleNetDP * s2Share);

    const cashForResale = Math.max(0, resaleNetDP - s1ForDP - s2ForDP);
    const cashAfterResale = netCashProceeds - cashForResale;

    const s1OaAfter = s1AfterBSD - s1ForDP;
    const s2OaAfter = s2AfterBSD - s2ForDP;

    const resaleLoan = Math.round(resalePrice * 0.75);
    const resaleMortgage = calcMortgage(resaleLoan, resaleLoanRate, resaleTenure);

    const totalIncome = s1Final.salary + s2Final.salary;
    const r1Share = totalIncome > 0 ? s1Final.salary / totalIncome : 0.5;
    const r2Share = 1 - r1Share;

    s1Retire = projectCPF({
      currentAge: shared.s1Age + totalYears,
      grossMonthlySalary: s1Final.salary,
      annualIncrement: shared.s1Increment,
      currentOA: s1OaAfter, currentSA: s1Final.sa, currentMA: s1Final.ma,
      targetAge: retirementAge,
      monthlyCashSavings: shared.monthlyCashSavings / 2,
      annualBonus: 0,
      monthlyMortgage: resaleMortgage * r1Share,
      mortgageTenure: resaleTenure,
      mortgageStartAge: shared.s1Age + totalYears,
      startingCash: cashAfterResale / 2,
    });

    s2Retire = projectCPF({
      currentAge: shared.s2Age + totalYears,
      grossMonthlySalary: s2Final.salary,
      annualIncrement: shared.s2Increment,
      currentOA: s2OaAfter, currentSA: s2Final.sa, currentMA: s2Final.ma,
      targetAge: retirementAge,
      monthlyCashSavings: shared.monthlyCashSavings / 2,
      annualBonus: 0,
      monthlyMortgage: resaleMortgage * r2Share,
      mortgageTenure: resaleTenure,
      mortgageStartAge: shared.s2Age + totalYears,
      startingCash: cashAfterResale / 2,
    });

    const yearsInResale = retirementAge - (shared.s1Age + totalYears);
    resaleData = {
      resalePrice, resaleBSD, resaleNetDP, resaleLoan, resaleMortgage,
      cashForResale, cashAfterResale,
      s1ForBSD, s2ForBSD, s1ForDP, s2ForDP,
      s1OaAfter, s2OaAfter,
      resaleValueAtRetire: calcSellingPrice(resalePrice, resaleGrowth, yearsInResale),
    };
  } else {
    const mortgageEndAge = shared.s1Age + buildTime + tenure;
    const monthsRemainingAfterSale = Math.max(0, (mortgageEndAge - (shared.s1Age + totalYears)) * 12);
    const yearsRemainingAfterSale = Math.max(0, mortgageEndAge - (shared.s1Age + totalYears));

    s1Retire = projectCPF({
      currentAge: shared.s1Age + totalYears,
      grossMonthlySalary: s1Final.salary,
      annualIncrement: shared.s1Increment,
      currentOA: s1Final.oa, currentSA: s1Final.sa, currentMA: s1Final.ma,
      targetAge: retirementAge,
      monthlyCashSavings: shared.monthlyCashSavings / 2,
      annualBonus: 0,
      monthlyMortgage: yearsRemainingAfterSale > 0 ? monthlyMortgage * s1MortgageShare : 0,
      mortgageTenure: yearsRemainingAfterSale,
      mortgageStartAge: shared.s1Age + totalYears,
    });

    s2Retire = projectCPF({
      currentAge: shared.s2Age + totalYears,
      grossMonthlySalary: s2Final.salary,
      annualIncrement: shared.s2Increment,
      currentOA: s2Final.oa, currentSA: s2Final.sa, currentMA: s2Final.ma,
      targetAge: retirementAge,
      monthlyCashSavings: shared.monthlyCashSavings / 2,
      annualBonus: 0,
      monthlyMortgage: yearsRemainingAfterSale > 0 ? monthlyMortgage * s2MortgageShare : 0,
      mortgageTenure: yearsRemainingAfterSale,
      mortgageStartAge: shared.s2Age + totalYears,
    });
  }

  const s1AtRetire = s1Retire[s1Retire.length - 1];
  const s2AtRetire = s2Retire[s2Retire.length - 1];

  const yearsOwned = retirementAge - shared.s1Age;
  const propertyValue = calcSellingPrice(price, growth, yearsOwned);

  const combinedCPFAtRetire = s1AtRetire.totalCPF + s2AtRetire.totalCPF;
  const combinedCashAtRetire = s1AtRetire.cash + s2AtRetire.cash;
  const totalPropertyValue = resaleData ? resaleData.resaleValueAtRetire : propertyValue;
  const totalNetWorthAtRetire = combinedCPFAtRetire + combinedCashAtRetire + totalPropertyValue;

  const cpfLife1 = calcCPFLife(s1AtRetire.ra);
  const cpfLife2 = calcCPFLife(s2AtRetire.ra);

  return {
    timeline, buildTime, price, valuation, mop, growth, totalYears,
    clawbackType, clawbackPct, loanType, loanRate, tenure,
    grants, reno, monthlyCosts, hps, flatType,
    scenario, retirementAge,
    loanAmount, effectiveLoan, monthlyMortgage, bsd, cov, combinedOA,
    totalCashDeployed, totalCPFUsed, accruedCPF, mortgageBalanceAtMOP,
    careerCash, careerCashSaved,
    s1Proj, s2Proj, s1Final, s2Final,
    sellingPrice, agentCommission, subsidyClawback, resaleLevyAmt, cpfRefunded,
    netCashProceeds, combinedCPFAtMOP, combinedCashAtMOP,
    maxBuyerIncome, maxBuyerLoan, cashCPFGap,
    s1Cpf, s1Cash, s2Cpf, s2Cash, totalCpf, totalCash,
    stage1Label, stage2Label, stage1Items, stage2Items,
    loanWarning, projectedCombinedOA,
    s1MortgageShare, s2MortgageShare,
    s1Retire, s2Retire, s1AtRetire, s2AtRetire,
    combinedCPFAtRetire, combinedCashAtRetire,
    totalPropertyValue, totalNetWorthAtRetire,
    cpfLife1, cpfLife2, cpfLifeTotal: cpfLife1 + cpfLife2,
    resaleData,
  };
}

function getAllocationOA(age) {
  return (getAllocationRates(age).oa || 0);
}

function renderDepositBreakdown(r, path) {
  const section = document.getElementById(path + '-deposit-section');
  section.style.display = 'block';

  document.getElementById(path + '-stage1-title').textContent = 'Stage 1: ' + r.stage1Label;
  document.getElementById(path + '-stage2-title').textContent = 'Stage 2: ' + r.stage2Label;

  let s1HTML = '';
  let s1Total = 0;
  r.stage1Items.forEach(item => {
    s1Total += item.value;
    s1HTML += `<div class="deposit-row"><span class="label">${item.label}</span><span class="value ${item.cls || ''}">${formatCurrency(item.value)}</span></div>`;
  });
  s1HTML += `<div class="deposit-row subtotal"><span class="label">Stage 1 Total</span><span class="value">${formatCurrency(s1Total)}</span></div>`;
  s1HTML += `<div class="deposit-row"><span class="label">CPF OA Used</span><span class="value cpf">${formatCurrency(r.s1Cpf)}</span></div>`;
  s1HTML += `<div class="deposit-row"><span class="label">Cash Needed</span><span class="value cash">${formatCurrency(r.s1Cash)}</span></div>`;
  document.getElementById(path + '-stage1-rows').innerHTML = s1HTML;

  let s2HTML = '';
  let s2Total = 0;
  r.stage2Items.forEach(item => {
    s2Total += item.value;
    s2HTML += `<div class="deposit-row"><span class="label">${item.label}</span><span class="value ${item.cls || ''}">${formatCurrency(item.value)}</span></div>`;
  });
  s2HTML += `<div class="deposit-row subtotal"><span class="label">Stage 2 Net</span><span class="value">${formatCurrency(Math.max(0, s2Total))}</span></div>`;
  if (r.timeline === 'bto') {
    s2HTML += `<div class="deposit-row"><span class="label">Projected CPF OA</span><span class="value cpf">${formatCurrency(r.projectedCombinedOA)}</span></div>`;
  } else {
    s2HTML += `<div class="deposit-row"><span class="label">CPF OA Remaining</span><span class="value cpf">${formatCurrency(Math.max(0, (r.s1OA || 0) + (r.s2OA || 0) - r.s1Cpf))}</span></div>`;
  }
  s2HTML += `<div class="deposit-row"><span class="label">CPF Used</span><span class="value cpf">${formatCurrency(r.s2Cpf)}</span></div>`;
  s2HTML += `<div class="deposit-row"><span class="label">Cash Needed</span><span class="value cash">${formatCurrency(r.s2Cash)}</span></div>`;
  document.getElementById(path + '-stage2-rows').innerHTML = s2HTML;

  document.getElementById(path + '-deposit-total').innerHTML =
    `<span class="cpf">CPF: ${formatCurrency(r.totalCpf)}</span> &nbsp; <span class="cash">Cash: ${formatCurrency(r.totalCash)}</span>`;

  const warning = document.getElementById(path + '-loan-warning');
  if (r.loanWarning) {
    warning.style.display = 'block';
    warning.textContent = r.loanWarning;
  } else {
    warning.style.display = 'none';
  }

  if (r.scenario === 'resale') {
    document.getElementById(path + '-warchest-cash').textContent = formatCurrency(r.netCashProceeds);
    document.getElementById(path + '-warchest-cpf').textContent = formatCurrency(r.cpfRefunded);
    document.getElementById(path + '-warchest-total').textContent = formatCurrency(r.netCashProceeds + r.cpfRefunded);
  }
}

function renderRetirementProjection(r, path) {
  const el = document.getElementById(path + '-retirement');
  const s1 = r.s1AtRetire;
  const s2 = r.s2AtRetire;
  const cashClass1 = s1.cash < 0 ? ' negative-cash' : '';
  const cashClass2 = s2.cash < 0 ? ' negative-cash' : '';
  const combinedCashClass = r.combinedCashAtRetire < 0 ? ' negative-cash' : '';

  let html = `<div class="section-title" style="text-transform:uppercase;letter-spacing:0.05em;color:var(--accent);border-bottom:2px solid var(--accent);padding-bottom:0.5rem;margin-bottom:1rem;">RETIREMENT PROJECTION (Age ${r.retirementAge})</div>`;

  if (r.scenario === 'resale' && r.resaleData) {
    const rd = r.resaleData;
    html += `
      <div class="retirement-stage-title">After BTO Sale</div>
      <div class="retirement-row"><span class="label">Net Cash Proceeds</span><span class="value cash">${formatCurrency(r.netCashProceeds)}</span></div>
      <div class="retirement-row"><span class="label">CPF Refunded to OA</span><span class="value cpf">${formatCurrency(r.cpfRefunded)}</span></div>
      <div class="retirement-stage-title" style="margin-top:0.75rem;">Resale Purchase</div>
      <div class="retirement-row"><span class="label">Resale Price</span><span class="value">${formatCurrency(rd.resalePrice)}</span></div>
      <div class="retirement-row"><span class="label">BSD</span><span class="value">${formatCurrency(rd.resaleBSD)}</span></div>
      <div class="retirement-row"><span class="label">Downpayment (25%)</span><span class="value">${formatCurrency(rd.resaleNetDP)}</span></div>
      <div class="retirement-row"><span class="label">├─ CPF Used</span><span class="value cpf">${formatCurrency(rd.s1ForDP + rd.s2ForDP)}</span></div>
      <div class="retirement-row"><span class="label">└─ Cash Used</span><span class="value cash">${formatCurrency(rd.cashForResale)}</span></div>
      <div class="retirement-row"><span class="label">Resale Loan</span><span class="value">${formatCurrency(rd.resaleLoan)}</span></div>
      <div class="retirement-row"><span class="label">Monthly Mortgage</span><span class="value">${formatCurrency(rd.resaleMortgage)}</span></div>
      <div class="retirement-row"><span class="label">Cash Remaining</span><span class="value${rd.cashAfterResale < 0 ? ' negative-cash' : ''}">${formatCurrency(rd.cashAfterResale)}</span></div>
      <div style="border-top:1px solid var(--border);margin:0.5rem 0;"></div>
    `;
  }

  html += `
    <div class="retirement-stage-title">Husband at ${r.retirementAge}</div>
    <div class="retirement-row"><span class="label">CPF (OA + RA + MA)</span><span class="value cpf">${formatCurrency(s1.totalCPF)}</span></div>
    <div class="retirement-row"><span class="label">Cash</span><span class="value${cashClass1}">${formatCurrency(s1.cash)}</span></div>
    <div class="retirement-row"><span class="label">Est. CPF LIFE Payout</span><span class="value">${formatCurrency(r.cpfLife1)}/mo</span></div>
    <div class="retirement-stage-title" style="margin-top:0.75rem;">Wife at ${r.retirementAge}</div>
    <div class="retirement-row"><span class="label">CPF (OA + RA + MA)</span><span class="value cpf">${formatCurrency(s2.totalCPF)}</span></div>
    <div class="retirement-row"><span class="label">Cash</span><span class="value${cashClass2}">${formatCurrency(s2.cash)}</span></div>
    <div class="retirement-row"><span class="label">Est. CPF LIFE Payout</span><span class="value">${formatCurrency(r.cpfLife2)}/mo</span></div>
    <div class="retirement-row total"><span class="label">Combined CPF</span><span class="value cpf">${formatCurrency(r.combinedCPFAtRetire)}</span></div>
    <div class="retirement-row total"><span class="label">Combined Cash</span><span class="value${combinedCashClass}">${formatCurrency(r.combinedCashAtRetire)}</span></div>
    <div class="retirement-row total"><span class="label">Property Value (est.)</span><span class="value">${formatCurrency(r.totalPropertyValue)}</span></div>
    <div class="retirement-row total"><span class="label">Total Net Worth</span><span class="value">${formatCurrency(r.totalNetWorthAtRetire)}</span></div>
    <div class="retirement-row total"><span class="label">Combined CPF LIFE</span><span class="value">${formatCurrency(r.cpfLifeTotal)}/mo</span></div>
  `;

  el.innerHTML = html;
}

const BTO_VALUATION_IDS = ['a-valuation', 'b-valuation'];

function saveBTOInputs() {
  const data = {};
  BTO_SHARED_IDS.forEach(id => { data[id] = document.getElementById(id).value; });
  ['a','b'].forEach(p => {
    BTO_PATH_IDS.forEach(id => {
      const el = document.getElementById(p + '-' + id);
      if (el) data[p + '-' + id] = el.value;
    });
    data[p + '-levy'] = levyState[p];
    data[p + '-valuation-manual'] = valuationManual[p];
  });
  localStorage.setItem('cpf_bto_inputs', JSON.stringify(data));
}

function restoreBTOInputs() {
  try {
    const saved = JSON.parse(localStorage.getItem('cpf_bto_inputs'));
    if (!saved) return;
    BTO_SHARED_IDS.forEach(id => {
      if (saved[id] !== undefined) {
        const el = document.getElementById(id);
        if (el) el.value = saved[id];
      }
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
      if (saved[p + '-valuation-manual']) valuationManual[p] = true;
      onTimelineChange(p);
      onClawbackChange(p);
      onScenarioChange(p);
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
  initTooltips();
  autoCalcDeposit('a');
  autoCalcDeposit('b');
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

function calculateBTO() {
  saveBTOInputs();
  const shared = readShared();
  const pathA = calcPath('a', shared);
  const pathB = calcPath('b', shared);

  renderBTOResults(pathA, 'a');
  renderBTOResults(pathB, 'b');
  renderRetirementProjection(pathA, 'a');
  renderRetirementProjection(pathB, 'b');
  renderBTOCharts(pathA, pathB);

  document.getElementById('bto-results').style.display = 'block';
  document.getElementById('bto-results').scrollIntoView({ behavior: 'smooth' });
}

function renderBTOResults(r, path) {
  const el = document.getElementById(path + '-results');
  el.innerHTML = `
    <div class="section-title">AUTOMATED FINANCING & FEES</div>
    <div class="form-grid" style="margin-bottom:1rem;">
      <div class="form-group"><label>Buyer Stamp Duty</label><input type="text" value="${formatCurrency(r.bsd)}" readonly></div>
      <div class="form-group"><label>Loan Amount</label><input type="text" value="${formatCurrency(r.effectiveLoan)}" readonly></div>
      <div class="form-group"><label>Monthly Mortgage</label><input type="text" value="${formatCurrency(r.monthlyMortgage)}" readonly></div>
      <div class="form-group"><label>Combined Monthly OA</label><input type="text" value="${formatCurrency(r.combinedOA)}" readonly></div>
      ${r.cov > 0 ? `<div class="form-group"><label>COV (Cash Only)</label><input type="text" value="${formatCurrency(r.cov)}" readonly></div>` : ''}
    </div>

    <div class="section-title">SNAPSHOT 1: BEFORE THE SALE (YEAR ${r.totalYears})</div>
    <div class="form-grid" style="margin-bottom:1rem;">
      <div class="form-group"><label>Total Liquid Cash Deployed</label><input type="text" value="${formatCurrency(r.totalCashDeployed)}" readonly></div>
      <div class="form-group"><label>Remaining Mortgage Loan</label><input type="text" value="${formatCurrency(r.mortgageBalanceAtMOP)}" readonly></div>
      <div class="form-group"><label>Accrued CPF Owed</label><input type="text" value="${formatCurrency(r.accruedCPF)}" readonly></div>
      <div class="form-group"><label>Total Career Cash Saved</label><input type="text" value="${formatCurrency(r.careerCash)}" readonly></div>
    </div>

    <div class="section-title">SNAPSHOT 2: AFTER THE SALE (EXIT MATH)</div>
    <div class="form-grid" style="margin-bottom:1rem;">
      <div class="form-group"><label>Gross Selling Price</label><input type="text" value="${formatCurrency(r.sellingPrice)}" readonly></div>
      <div class="form-group"><label>Agent Commission (2%)</label><input type="text" value="${formatCurrency(r.agentCommission)}" readonly></div>
      ${r.clawbackType !== 'none' ? `<div class="form-group"><label>Subsidy Clawback</label><input type="text" value="${formatCurrency(r.subsidyClawback)}" readonly></div>` : ''}
      ${r.resaleLevyAmt > 0 ? `<div class="form-group"><label>Resale Levy (Cash)</label><input type="text" value="${formatCurrency(r.resaleLevyAmt)}" readonly></div>` : ''}
      <div class="form-group"><label>CPF Refunded to OA</label><input type="text" value="${formatCurrency(r.cpfRefunded)}" readonly></div>
      <div class="form-group"><label>Net Cash Proceeds</label><input type="text" value="${formatCurrency(r.netCashProceeds)}" readonly style="color:var(--success);font-weight:700;"></div>
    </div>

    <div class="section-title">BUYER AFFORDABILITY CHECK</div>
    <div class="form-grid" style="margin-bottom:1rem;">
      <div class="form-group"><label>Max Buyer Income</label><input type="text" value="${formatCurrency(r.maxBuyerIncome)}" readonly></div>
      <div class="form-group"><label>Max Buyer Loan</label><input type="text" value="${formatCurrency(r.maxBuyerLoan)}" readonly></div>
      <div class="form-group"><label>Cash/CPF Gap</label><input type="text" value="${formatCurrency(r.cashCPFGap)}" readonly></div>
    </div>

    <div class="section-title">SPOUSE BREAKDOWN AT SALE</div>
    <div class="form-grid">
      <div class="form-group"><label>Husband CPF at Sale</label><input type="text" value="${formatCurrency(r.s1Final.totalCPF)}" readonly></div>
      <div class="form-group"><label>Husband Cash at Sale</label><input type="text" value="${formatCurrency(Math.round(r.s1Final.cash + r.careerCashSaved / 2))}" readonly></div>
      <div class="form-group"><label>Wife CPF at Sale</label><input type="text" value="${formatCurrency(r.s2Final.totalCPF)}" readonly></div>
      <div class="form-group"><label>Wife Cash at Sale</label><input type="text" value="${formatCurrency(Math.round(r.s2Final.cash + r.careerCashSaved / 2))}" readonly></div>
      <div class="form-group"><label>Combined Household</label><input type="text" value="${formatCurrency(r.combinedCPFAtMOP + r.combinedCashAtMOP)}" readonly style="color:var(--accent);font-weight:700;"></div>
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

  // CPF Trajectory to Retirement
  const retireAge = Math.max(a.retirementAge, b.retirementAge);
  const startAge = Math.min(a.s1Proj[0].age, b.s1Proj[0].age);
  const ages = Array.from({ length: retireAge - startAge + 1 }, (_, i) => startAge + i);

  function getCpfAtAge(proj, targetAge) {
    const row = proj.find(r => r.age === targetAge);
    return row ? row.totalCPF : proj[proj.length - 1].totalCPF;
  }

  const aCpfTrajectory = ages.map(age => {
    if (age <= a.s1Proj[a.s1Proj.length - 1].age) {
      return getCpfAtAge(a.s1Proj, age) + getCpfAtAge(a.s2Proj, age);
    } else if (a.s1AtRetire && age <= a.retirementAge) {
      const r1 = a.s1Retire.find(r => r.age === age);
      const r2 = a.s2Retire.find(r => r.age === age);
      if (r1 && r2) return r1.totalCPF + r2.totalCPF;
    }
    return null;
  });

  const bCpfTrajectory = ages.map(age => {
    if (age <= b.s1Proj[b.s1Proj.length - 1].age) {
      return getCpfAtAge(b.s1Proj, age) + getCpfAtAge(b.s2Proj, age);
    } else if (b.s1AtRetire && age <= b.retirementAge) {
      const r1 = b.s1Retire.find(r => r.age === age);
      const r2 = b.s2Retire.find(r => r.age === age);
      if (r1 && r2) return r1.totalCPF + r2.totalCPF;
    }
    return null;
  });

  btoCharts.cpfTrajectory = new Chart(document.getElementById('chart-cpf-trajectory'), {
    type: 'line',
    data: {
      labels: ages,
      datasets: [
        { label: 'Path A', data: aCpfTrajectory, borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', fill: true, tension: 0.3, pointRadius: 1 },
        { label: 'Path B', data: bCpfTrajectory, borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', fill: true, tension: 0.3, pointRadius: 1 },
      ]
    },
    options: { ...chartDefaults, scales: { ...chartDefaults.scales, x: { ...chartDefaults.scales.x, title: { display: true, text: 'Age', color: '#64748b' } } } }
  });

  // Net Cash Proceeds
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

  // Property Value vs Mortgage
  const maxYears = Math.max(a.totalYears, b.totalYears);
  const years = Array.from({ length: maxYears + 1 }, (_, i) => i);
  const aValue = years.map(y => calcSellingPrice(a.price, a.growth, y));
  const bValue = years.map(y => calcSellingPrice(b.price, b.growth, y));
  const aMortgage = years.map(y => y <= a.buildTime ? 0 : calcMortgageBalance(a.loanAmount, a.loanRate, a.tenure, y - a.buildTime));
  const bMortgage = years.map(y => y <= b.buildTime ? 0 : calcMortgageBalance(b.loanAmount, b.loanRate, b.tenure, y - b.buildTime));

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

  // Net Worth Comparison at Retirement
  btoCharts.networth = new Chart(document.getElementById('chart-networth'), {
    type: 'bar',
    data: {
      labels: ['Path A', 'Path B'],
      datasets: [
        { label: 'CPF', data: [a.combinedCPFAtRetire, b.combinedCPFAtRetire], backgroundColor: '#3b82f6' },
        { label: 'Cash', data: [a.combinedCashAtRetire, b.combinedCashAtRetire], backgroundColor: '#f59e0b' },
        { label: 'Property', data: [a.totalPropertyValue, b.totalPropertyValue], backgroundColor: '#10b981' },
      ]
    },
    options: { ...chartDefaults, scales: { ...chartDefaults.scales, x: { stacked: true }, y: { ...chartDefaults.scales.y, stacked: true } } }
  });
}
