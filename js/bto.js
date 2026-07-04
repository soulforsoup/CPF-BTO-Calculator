let btoCharts = {};
let levyState = { a: false, b: false };
let valuationManual = { a: false, b: false };

const BTO_SHARED_IDS = [
  's1-income','s2-income','s1-increment','s2-increment',
  's1-oa','s1-sa','s1-ma','s2-oa','s2-sa','s2-ma',
  's1-age','s2-age','monthly-cash-savings','buyer-ceiling',
  'retirement-age','mortgage-split',
  'h-bonus','w-bonus',
];

const BTO_PATH_IDS = [
  'timeline','build-time','price','valuation','lease','mop','growth',
  'clawback-type','clawback-pct','loan-type','loan-rate','tenure',
  'deposit-scheme',
  'grants','reno','monthly-costs','hps','flat-type',
  'scenario',
  'resale-price','resale-lease','resale-growth','resale-loan-rate','resale-tenure','resale-grants',
  'lbs',
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
  if (timeline === 'bto') {
    document.getElementById(path + '-lease').value = 99;
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
  document.getElementById(path + '-lbs-section').style.display = 'block';
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
    s1Bonus: +document.getElementById('h-bonus')?.value || 0,
    s2Bonus: +document.getElementById('w-bonus')?.value || 0,
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
  const leaseAtPurchase = +document.getElementById(p + '-lease').value || 99;
  const scenario = document.getElementById(p + '-scenario').value;
  const retirementAge = shared.retirementAge;

  const totalYears = buildTime + mop;
  const bsd = calcBSD(price);
  const cov = Math.max(0, price - valuation);

  let projectedS1OA = shared.s1OA;
  let projectedS2OA = shared.s2OA;
  if (timeline === 'bto' && buildTime > 0) {
    // Deduct Stage-1 CPF from OA before projecting forward
    const depositSchemeEarly = document.getElementById(p + '-deposit-scheme').value;
    const stage1PctEarly = depositSchemeEarly === 'sds' ? 0.05 : 0.10;
    const optionFeeEarly = 2000;
    const stage1CpfEstimate = Math.min(shared.s1OA + shared.s2OA, Math.max(0, (price * stage1PctEarly) + bsd - optionFeeEarly));
    const totalOA = shared.s1OA + shared.s2OA;
    const s1Share = totalOA > 0 ? shared.s1OA / totalOA : 0.5;
    const s2Share = 1 - s1Share;
    const s1OAAfterStage1 = Math.max(0, shared.s1OA - stage1CpfEstimate * s1Share);
    const s2OAAfterStage1 = Math.max(0, shared.s2OA - stage1CpfEstimate * s2Share);

    const s1Proj = projectCPF({
      currentAge: shared.s1Age, grossMonthlySalary: shared.s1Income,
      annualIncrement: shared.s1Increment, currentOA: s1OAAfterStage1,
      currentSA: shared.s1SA, currentMA: shared.s1MA,
      targetAge: shared.s1Age + buildTime, monthlyCashSavings: 0, annualBonus: 0,
    });
    const s2Proj = projectCPF({
      currentAge: shared.s2Age, grossMonthlySalary: shared.s2Income,
      annualIncrement: shared.s2Increment, currentOA: s2OAAfterStage1,
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
    const depositScheme = document.getElementById(p + '-deposit-scheme').value;
    const stage1Pct = depositScheme === 'sds' ? 0.05 : 0.10;
    const stage2Pct = depositScheme === 'sds' ? 0.20 : 0.15;

    const optionFee = 2000;
    const stage1Total = (price * stage1Pct) + bsd;
    s1Cpf = Math.min(currentCombinedOA, Math.max(0, stage1Total - optionFee));
    s1Cash = optionFee + Math.max(0, stage1Total - optionFee - s1Cpf);

    const grantOffset = Math.min(grants, price * stage2Pct);
    const stage2Total = Math.max(0, price * stage2Pct - grantOffset);
    const remainingOA = projectedCombinedOA;
    s2Cpf = Math.min(remainingOA, stage2Total);
    s2Cash = Math.max(0, stage2Total - s2Cpf);

    excessGrant = grants - grantOffset;

    stage1Label = depositScheme === 'sds' ? 'Signing (SDS)' : 'Signing (Standard)';
    stage2Label = `Key Collection (Year ${buildTime})`;
    stage1Items = [
      { label: 'Option Fee (Cash)', value: optionFee, cls: 'cash' },
      { label: `Remaining ${(stage1Pct * 100)}% Downpayment`, value: Math.max(0, (price * stage1Pct) - optionFee) },
      { label: 'Buyer\'s Stamp Duty (BSD)', value: bsd },
    ];
    stage2Items = [
      { label: `${(stage2Pct * 100)}% of Price`, value: price * stage2Pct },
    ];
    if (grantOffset > 0) stage2Items.push({ label: '− CPF Grants', value: -grantOffset, cls: 'cpf' });
    if (excessGrant > 0) stage2Items.push({ label: 'Excess Grant → CPF OA', value: -excessGrant, cls: 'cpf' });
  } else {
    const optionFees = 5000;
    s1Cpf = Math.min(currentCombinedOA, bsd);
    s1Cash = optionFees + Math.max(0, bsd - s1Cpf);

    const remainingDP = Math.max(0, price * 0.25 - optionFees);
    const netDP = Math.max(0, remainingDP - grants);
    const remainingOA = Math.max(0, currentCombinedOA - s1Cpf);
    s2Cpf = Math.min(remainingOA, netDP);
    s2Cash = Math.max(0, netDP - s2Cpf) + cov;

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
    const minCash = Math.min(price, valuation) * 0.05;
    if (totalCash < minCash) {
      const shortfall = minCash - totalCash;
      s2Cash += shortfall;
      totalCash += shortfall;
      loanWarning = `Bank loan requires minimum 5% cash (${formatCurrency(minCash)}). Cash adjusted.`;
    }
  }

  let loanAmount;
  if (loanType === 'hdb') {
    const stage1Principal = timeline === 'bto' ? (price * (document.getElementById(p + '-deposit-scheme').value === 'sds' ? 0.05 : 0.10)) : 5000;
    const remainingPrice = Math.max(0, price - stage1Principal - grants);
    const availableCPF = Math.max(0, availableOA - 20000);
    const originalS2Cpf = s2Cpf;
    s2Cpf = Math.max(s2Cpf, Math.min(availableCPF, remainingPrice));
    loanAmount = Math.round(Math.max(0, remainingPrice - s2Cpf));
    if (s2Cpf > originalS2Cpf) {
      stage2Items.push({ label: 'HDB Rule: Drain OA (Retain $20k)', value: s2Cpf - originalS2Cpf, cls: 'cpf' });
      totalCpf = s1Cpf + s2Cpf;
    }
  } else {
    loanAmount = Math.round(Math.min(price, valuation) * CPF_CONFIG.hdbLtv);
  }
  const effectiveLoan = loanAmount;
  const monthlyMortgage = calcMortgage(effectiveLoan, loanRate, tenure);
  const mortgageBalanceAtMOP = calcMortgageBalance(effectiveLoan, loanRate, tenure, mop);
  const s1Capped = Math.min(shared.s1Income, CPF_CONFIG.owCeiling);
  const s2Capped = Math.min(shared.s2Income, CPF_CONFIG.owCeiling);
  const s1ContribRate = getContributionRate(shared.s1Age).total;
  const s2ContribRate = getContributionRate(shared.s2Age).total;
  const s1MonthlyOA = Math.round(s1Capped * s1ContribRate * getAllocationOA(shared.s1Age));
  const s2MonthlyOA = Math.round(s2Capped * s2ContribRate * getAllocationOA(shared.s2Age));
  const combinedOA = s1MonthlyOA + s2MonthlyOA;

  let totalCashDeployed = totalCash + reno + monthlyCosts * mop * 12;
  let totalCPFUsed = totalCpf;
  // Accrued CPF calculated after projection (needs mortgagePaidFromCPF data)

  // Deduct downpayment + BSD from starting OA
  const s1Share = currentCombinedOA > 0 ? shared.s1OA / currentCombinedOA : 0.5;
  let s1StartingOA = shared.s1OA;
  let s2StartingOA = shared.s2OA;
  let s1Stage2Deduction = 0;
  let s2Stage2Deduction = 0;

  if (timeline === 'resale') {
    // Resale: All CPF usage (totalCpf) happens upfront
    s1StartingOA = Math.max(0, shared.s1OA - Math.round(totalCpf * s1Share));
    s2StartingOA = Math.max(0, shared.s2OA - Math.round(totalCpf * (1 - s1Share)));
  } else {
    // BTO: Deduct only the exact Stage 1 CPF used (s1Cpf) upfront
    s1StartingOA = Math.max(0, shared.s1OA - Math.round(s1Cpf * s1Share));
    s2StartingOA = Math.max(0, shared.s2OA - Math.round(s1Cpf * (1 - s1Share)));

    // Pre-compute the exact Stage 2 CPF used (s2Cpf) to inject at key collection
    const projOaTotal = projectedS1OA + projectedS2OA;
    const s1ProjShare = projOaTotal > 0 ? projectedS1OA / projOaTotal : 0.5;
    s1Stage2Deduction = Math.round(s2Cpf * s1ProjShare);
    s2Stage2Deduction = Math.round(s2Cpf * (1 - s1ProjShare));
  }

  // Mortgage shares based on current income (before projection)
  const mortgageSplit = shared.mortgageSplit;
  const currentTotalIncome = shared.s1Income + shared.s2Income;
  let s1MortgageShare = mortgageSplit === 'proportional'
    ? (currentTotalIncome > 0 ? shared.s1Income / currentTotalIncome : 0.5)
    : 0.5;
  let s2MortgageShare = 1 - s1MortgageShare;

  const s1Proj = projectCPF({
    currentAge: shared.s1Age, grossMonthlySalary: shared.s1Income,
    annualIncrement: shared.s1Increment, currentOA: s1StartingOA,
    currentSA: shared.s1SA, currentMA: shared.s1MA,
    targetAge: shared.s1Age + totalYears, monthlyCashSavings: 0, annualBonus: shared.s1Bonus,
    hpsPremium: hps * 12,
    monthlyMortgage: monthlyMortgage * s1MortgageShare,
    mortgageTenure: mop,
    mortgageStartAge: shared.s1Age + buildTime,
    lumpSumDeductionAmount: s1Stage2Deduction,
    lumpSumDeductionYear: buildTime,
  });
  const s2Proj = projectCPF({
    currentAge: shared.s2Age, grossMonthlySalary: shared.s2Income,
    annualIncrement: shared.s2Increment, currentOA: s2StartingOA,
    currentSA: shared.s2SA, currentMA: shared.s2MA,
    targetAge: shared.s2Age + totalYears, monthlyCashSavings: 0, annualBonus: shared.s2Bonus,
    hpsPremium: hps * 12,
    monthlyMortgage: monthlyMortgage * s2MortgageShare,
    mortgageTenure: mop,
    mortgageStartAge: shared.s2Age + buildTime,
    lumpSumDeductionAmount: s2Stage2Deduction,
    lumpSumDeductionYear: buildTime,
  });
  const s1Final = s1Proj[s1Proj.length - 1];
  const s2Final = s2Proj[s2Proj.length - 1];

  // Stage 2 shortfall check (BTO only)
  if (timeline === 'bto' && s2Cash > 0) {
    stage2Items.push({ label: '⚠ OA Shortfall → Cash', value: s2Cash, cls: 'warning' });
  }

  // Per-spouse accrued CPF tracking
  const s1ShareOfCPF = currentCombinedOA > 0 ? shared.s1OA / currentCombinedOA : 0.5;
  const s2ShareOfCPF = 1 - s1ShareOfCPF;

  let s1RunningCpf = s1Cpf * s1ShareOfCPF;
  let s2RunningCpf = s1Cpf * s2ShareOfCPF;

  for (let y = 0; y < totalYears; y++) {
    if (y === buildTime) {
      s1RunningCpf += (s2Cpf * s1ShareOfCPF) + (grants / 2);
      s2RunningCpf += (s2Cpf * s2ShareOfCPF) + (grants / 2);
    }
    if (y >= buildTime) {
      s1RunningCpf += (s1Proj[y]?.mortgagePaidFromCPF || 0) + (s1Proj[y]?.hpsPaidFromCPF || 0);
      s2RunningCpf += (s2Proj[y]?.mortgagePaidFromCPF || 0) + (s2Proj[y]?.hpsPaidFromCPF || 0);
    }
    const effectiveAnnualRate = Math.pow(1 + CPF_CONFIG.oaRate / 12, 12);
    s1RunningCpf *= effectiveAnnualRate;
    s2RunningCpf *= effectiveAnnualRate;
  }

  const s1CpfRefunded = Math.round(s1RunningCpf);
  const s2CpfRefunded = Math.round(s2RunningCpf);
  let cpfRefunded = s1CpfRefunded + s2CpfRefunded;

  const careerCash = shared.monthlyCashSavings * totalYears * 12;
  const sellingPrice = calcPropertyValueWithDecay(price, growth, totalYears, leaseAtPurchase);
  const agentCommission = Math.round(sellingPrice * 0.02);
  let subsidyClawback = 0;
  if (clawbackType === 'plh' || clawbackType === 'plus') {
    subsidyClawback = calcSubsidyClawback(sellingPrice, clawbackPct);
  }
  let resaleLevyAmt = 0;
  if (levyState[p]) {
    resaleLevyAmt = calcResaleLevy(flatType);
  }
  const netCashProceeds = Math.max(0, sellingPrice - agentCommission - subsidyClawback - resaleLevyAmt - mortgageBalanceAtMOP - cpfRefunded);

  // Capped CPF refund (negative sale scenario: HDB writes off shortfall)
  const saleProceeds = Math.max(0, sellingPrice - subsidyClawback - mortgageBalanceAtMOP);
  const actualCpfRefund = Math.min(cpfRefunded, saleProceeds);
  cpfRefunded = actualCpfRefund;
  const s1ActualRefund = cpfRefunded > 0 ? Math.round(actualCpfRefund * (s1CpfRefunded / cpfRefunded)) : 0;
  const s2ActualRefund = actualCpfRefund - s1ActualRefund;

  const combinedCPFAtMOP = s1Final.totalCPF + s2Final.totalCPF;
  const careerCashSaved = careerCash - totalCashDeployed;
  const combinedCashAtMOP = careerCashSaved + netCashProceeds;

  const maxBuyerIncome = shared.buyerCeiling;
  const maxMonthlyPayment = maxBuyerIncome * 0.30;
  const floorRate = loanType === 'hdb' ? 0.03 : 0.04;
  const stressTestRate = Math.max(loanRate, floorRate);
  const buyerMonthlyRate = stressTestRate / 12;
  const buyerMonths = 25 * 12;
  const maxBuyerLoan = buyerMonthlyRate > 0
    ? Math.round(maxMonthlyPayment * (1 - Math.pow(1 + buyerMonthlyRate, -buyerMonths)) / buyerMonthlyRate)
    : Math.round(maxMonthlyPayment * buyerMonths);
  const cashCPFGap = sellingPrice - maxBuyerLoan;

  // Recalculate mortgage shares using projected salaries for retirement
  if (mortgageSplit === 'proportional') {
    const projectedTotalIncome = s1Final.salary + s2Final.salary;
    s1MortgageShare = projectedTotalIncome > 0 ? s1Final.salary / projectedTotalIncome : 0.5;
    s2MortgageShare = 1 - s1MortgageShare;
  }

  let s1Retire = null, s2Retire = null;
  let resaleData = null;

  // Hoist mortgage variables so both projections and LBS can use them
  let retireMortgageStartAge = shared.s1Age + totalYears;
  let s1RetireMortgage = 0, s2RetireMortgage = 0, retireMortgageTenure = 0;

  if (scenario === 'resale') {
    const resalePrice = +document.getElementById(p + '-resale-price').value;
    const resaleLeaseAtPurchase = +document.getElementById(p + '-resale-lease').value || 75;
    const resaleGrowth = +document.getElementById(p + '-resale-growth').value;
    const resaleLoanRate = +document.getElementById(p + '-resale-loan-rate').value / 100;
    const resaleTenure = +document.getElementById(p + '-resale-tenure').value;
    const resaleGrants = +document.getElementById(p + '-resale-grants').value || 0;

    const resaleBSD = calcBSD(resalePrice);
    const resaleDP = resalePrice * 0.25;
    const resaleNetDP = Math.max(0, resaleDP - resaleGrants);

    // Add capped CPF refund to OA for resale purchase
    const s1OaWithRefund = s1Final.oa + s1ActualRefund;
    const s2OaWithRefund = s2Final.oa + s2ActualRefund;

    const totalOAAtSale = s1OaWithRefund + s2OaWithRefund;
    const s1Share = totalOAAtSale > 0 ? s1OaWithRefund / totalOAAtSale : 0.5;
    const s2Share = 1 - s1Share;

    const s1ForBSD = Math.min(s1OaWithRefund, resaleBSD * s1Share);
    const s2ForBSD = Math.min(s2OaWithRefund, resaleBSD * s2Share);
    const s1AfterBSD = s1OaWithRefund - s1ForBSD;
    const s2AfterBSD = s2OaWithRefund - s2ForBSD;

    const s1ForDP = Math.min(s1AfterBSD, resaleNetDP * s1Share);
    const s2ForDP = Math.min(s2AfterBSD, resaleNetDP * s2Share);

    const cashForResale = Math.max(0, resaleNetDP - s1ForDP - s2ForDP);
    const cashAfterResale = netCashProceeds - cashForResale;

    let s1OaAfter = s1AfterBSD - s1ForDP;
    let s2OaAfter = s2AfterBSD - s2ForDP;

    const remainingOaForLoan = s1OaAfter + s2OaAfter;
    const maxLegalLoan = Math.round(resalePrice * 0.75);
    const loanNeeded = Math.max(0, maxLegalLoan - remainingOaForLoan);
    const resaleLoan = Math.min(maxLegalLoan, loanNeeded);
    const s1LoanReduction = Math.min(s1OaAfter, maxLegalLoan - resaleLoan);
    s1OaAfter -= s1LoanReduction;
    s2OaAfter -= Math.min(s2OaAfter, maxLegalLoan - resaleLoan - s1LoanReduction);
    const resaleMortgage = calcMortgage(resaleLoan, resaleLoanRate, resaleTenure);

    const totalIncome = s1Final.salary + s2Final.salary;
    const r1Share = totalIncome > 0 ? s1Final.salary / totalIncome : 0.5;
    const r2Share = 1 - r1Share;

    // Set hoisted mortgage variables
    retireMortgageTenure = resaleTenure;
    retireMortgageStartAge = shared.s1Age + totalYears;
    s1RetireMortgage = resaleMortgage * r1Share;
    s2RetireMortgage = resaleMortgage * r2Share;

    s1Retire = projectCPF({
      currentAge: shared.s1Age + totalYears,
      grossMonthlySalary: s1Final.salary,
      annualIncrement: shared.s1Increment,
      currentOA: s1OaAfter, currentSA: s1Final.sa, currentMA: s1Final.ma,
      targetAge: retirementAge,
      monthlyCashSavings: shared.monthlyCashSavings / 2,
      annualBonus: 0,
      monthlyMortgage: s1RetireMortgage,
      mortgageTenure: retireMortgageTenure,
      mortgageStartAge: retireMortgageStartAge,
      startingCash: cashAfterResale / 2,
      hpsPremium: hps * 12,
    });

    s2Retire = projectCPF({
      currentAge: shared.s2Age + totalYears,
      grossMonthlySalary: s2Final.salary,
      annualIncrement: shared.s2Increment,
      currentOA: s2OaAfter, currentSA: s2Final.sa, currentMA: s2Final.ma,
      targetAge: retirementAge,
      monthlyCashSavings: shared.monthlyCashSavings / 2,
      annualBonus: 0,
      monthlyMortgage: s2RetireMortgage,
      mortgageTenure: retireMortgageTenure,
      mortgageStartAge: shared.s2Age + totalYears,
      startingCash: cashAfterResale / 2,
      hpsPremium: hps * 12,
    });

    const yearsInResale = retirementAge - (shared.s1Age + totalYears);
    resaleData = {
      resalePrice, resaleBSD, resaleNetDP, resaleLoan, resaleMortgage,
      cashForResale, cashAfterResale,
      s1ForBSD, s2ForBSD, s1ForDP, s2ForDP,
      s1OaAfter, s2OaAfter,
      resaleValueAtRetire: calcPropertyValueWithDecay(resalePrice, resaleGrowth, yearsInResale, resaleLeaseAtPurchase),
    };
  } else {
    const mortgageEndAge = shared.s1Age + buildTime + tenure;
    const yearsRemainingAfterSale = Math.max(0, mortgageEndAge - (shared.s1Age + totalYears));

    // Set hoisted mortgage variables
    retireMortgageTenure = yearsRemainingAfterSale;
    retireMortgageStartAge = shared.s1Age + totalYears;
    s1RetireMortgage = yearsRemainingAfterSale > 0 ? monthlyMortgage * s1MortgageShare : 0;
    s2RetireMortgage = yearsRemainingAfterSale > 0 ? monthlyMortgage * s2MortgageShare : 0;

    s1Retire = projectCPF({
      currentAge: shared.s1Age + totalYears,
      grossMonthlySalary: s1Final.salary,
      annualIncrement: shared.s1Increment,
      currentOA: s1Final.oa, currentSA: s1Final.sa, currentMA: s1Final.ma,
      targetAge: retirementAge,
      monthlyCashSavings: shared.monthlyCashSavings / 2,
      annualBonus: 0,
      monthlyMortgage: s1RetireMortgage,
      mortgageTenure: retireMortgageTenure,
      mortgageStartAge: retireMortgageStartAge,
      hpsPremium: hps * 12,
    });

    s2Retire = projectCPF({
      currentAge: shared.s2Age + totalYears,
      grossMonthlySalary: s2Final.salary,
      annualIncrement: shared.s2Increment,
      currentOA: s2Final.oa, currentSA: s2Final.sa, currentMA: s2Final.ma,
      targetAge: retirementAge,
      monthlyCashSavings: shared.monthlyCashSavings / 2,
      annualBonus: 0,
      monthlyMortgage: s2RetireMortgage,
      mortgageTenure: retireMortgageTenure,
      mortgageStartAge: shared.s2Age + totalYears,
      hpsPremium: hps * 12,
    });
  }

  let lbsData = null;
  const lbsOption = document.getElementById(p + '-lbs') ? document.getElementById(p + '-lbs').value : 'none';

  if (lbsOption === 'at65') {
    const lbsAge = 65;
    const yearsToLBS = lbsAge - (shared.s1Age + totalYears);

    // Use correct lease and price based on scenario
    const lbsLease = scenario === 'resale'
      ? (+document.getElementById(p + '-resale-lease').value || 75)
      : leaseAtPurchase;
    const lbsGrowth = scenario === 'resale'
      ? (+document.getElementById(p + '-resale-growth').value)
      : growth;
    const lbsPrice = scenario === 'resale'
      ? (+document.getElementById(p + '-resale-price').value)
      : price;

    const leaseAtLBS = lbsLease - yearsToLBS;

    // 30-year minimum lease check for LBS at age 65
    if (leaseAtLBS <= 30) {
      lbsData = {
        blocked: true,
        leaseAtLBS,
        reason: `Flat has only ${leaseAtLBS} years remaining at age 65. HDB requires retaining at least 30 years for LBS at this age.`,
      };
    } else {
      const propertyValueAtLBS = calcPropertyValueWithDecay(lbsPrice, lbsGrowth, yearsToLBS, lbsLease);
      const lbsProceeds = calcLBSProceeds(propertyValueAtLBS, flatType);

      const frsAtLBS = Math.round(CPF_CONFIG.frs * Math.pow(1 + CPF_CONFIG.frsGrowthRate, yearsToLBS));
      const s1LBSShare = lbsProceeds / 2;
      const s2LBSShare = lbsProceeds / 2;

      const s1AtLBS = s1Retire.find(r => r.age === lbsAge);
      const s2AtLBS = s2Retire.find(r => r.age === lbsAge);

      if (s1AtLBS && s2AtLBS && lbsAge <= retirementAge) {
        const s1RaTopup = Math.min(s1LBSShare, Math.max(0, frsAtLBS - s1AtLBS.ra));
        const s2RaTopup = Math.min(s2LBSShare, Math.max(0, frsAtLBS - s2AtLBS.ra));
        const totalTopUp = s1RaTopup + s2RaTopup;
        const s1CashExcess = s1LBSShare - s1RaTopup;
        const s2CashExcess = s2LBSShare - s2RaTopup;
        const lbsBonus = calcLBSBonus(flatType, totalTopUp);
        const splitBonus = lbsBonus / 2;

        const s1RetireAfterLBS = projectCPF({
          currentAge: lbsAge,
          grossMonthlySalary: s1AtLBS.salary,
          annualIncrement: shared.s1Increment,
          currentOA: s1AtLBS.oa,
          currentSA: 0,
          currentMA: s1AtLBS.ma,
          currentRA: s1AtLBS.ra + s1RaTopup,
          targetAge: retirementAge,
          monthlyCashSavings: shared.monthlyCashSavings / 2,
          annualBonus: 0,
          startingCash: s1AtLBS.cash + s1CashExcess + splitBonus,
          monthlyMortgage: s1RetireMortgage,
          mortgageTenure: retireMortgageTenure,
          mortgageStartAge: shared.s1Age + totalYears,
        });

        const s2RetireAfterLBS = projectCPF({
          currentAge: lbsAge,
          grossMonthlySalary: s2AtLBS.salary,
          annualIncrement: shared.s2Increment,
          currentOA: s2AtLBS.oa,
          currentSA: 0,
          currentMA: s2AtLBS.ma,
          currentRA: s2AtLBS.ra + s2RaTopup,
          targetAge: retirementAge,
          monthlyCashSavings: shared.monthlyCashSavings / 2,
          annualBonus: 0,
          startingCash: s2AtLBS.cash + s2CashExcess + splitBonus,
          monthlyMortgage: s2RetireMortgage,
          mortgageTenure: retireMortgageTenure,
          mortgageStartAge: shared.s2Age + totalYears,
        });

        const s1Index = s1Retire.findIndex(r => r.age === lbsAge);
        s1Retire.splice(s1Index, s1Retire.length - s1Index, ...s1RetireAfterLBS);

        const s2Index = s2Retire.findIndex(r => r.age === lbsAge);
        s2Retire.splice(s2Index, s2Retire.length - s2Index, ...s2RetireAfterLBS);

        lbsData = {
          propertyValueAtLBS, lbsProceeds,
          s1RaTopup, s2RaTopup,
          s1CashExcess, s2CashExcess, lbsBonus,
        };
      }
    }
  }

  const s1AtRetire = s1Retire[s1Retire.length - 1];
  const s2AtRetire = s2Retire[s2Retire.length - 1];

  const yearsOwned = retirementAge - shared.s1Age;
  const propertyValue = calcPropertyValueWithDecay(price, growth, yearsOwned, leaseAtPurchase);

  const combinedCPFAtRetire = s1AtRetire.totalCPF + s2AtRetire.totalCPF;
  const combinedCashAtRetire = s1AtRetire.cash + s2AtRetire.cash;
  const totalPropertyValue = resaleData ? resaleData.resaleValueAtRetire : propertyValue;
  const totalNetWorthAtRetire = combinedCPFAtRetire + combinedCashAtRetire + totalPropertyValue;

  const cpfLife1 = calcCPFLife(s1AtRetire.ra);
  const cpfLife2 = calcCPFLife(s2AtRetire.ra);

  const accruedCPF = cpfRefunded;

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
    resaleData, lbsData,
    currentS1OA: shared.s1OA, currentS2OA: shared.s2OA,
    leaseAtPurchase,
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
    s2HTML += `<div class="deposit-row"><span class="label">CPF OA Remaining</span><span class="value cpf">${formatCurrency(Math.max(0, (r.currentS1OA || 0) + (r.currentS2OA || 0) - r.s1Cpf))}</span></div>`;
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

  if (r.lbsData && !r.lbsData.blocked) {
    const ld = r.lbsData;
    html += `
      <div class="retirement-stage-title">Lease Buyback Scheme (Age 65)</div>
      <div class="retirement-row"><span class="label">Property Value at 65</span><span class="value">${formatCurrency(ld.propertyValueAtLBS)}</span></div>
      <div class="retirement-row"><span class="label">LBS Gross Proceeds</span><span class="value">${formatCurrency(ld.lbsProceeds)}</span></div>
      <div class="retirement-row"><span class="label">├─ RA Top-up (Husband)</span><span class="value cpf">${formatCurrency(ld.s1RaTopup)}</span></div>
      <div class="retirement-row"><span class="label">├─ RA Top-up (Wife)</span><span class="value cpf">${formatCurrency(ld.s2RaTopup)}</span></div>
      <div class="retirement-row"><span class="label">└─ Cash Excess</span><span class="value cash">${formatCurrency(ld.s1CashExcess + ld.s2CashExcess)}</span></div>
      <div class="retirement-row total"><span class="label">HDB Cash Bonus</span><span class="value cash">${formatCurrency(ld.lbsBonus)}</span></div>
      <div style="border-top:1px solid var(--border);margin:0.5rem 0;"></div>
    `;
  }

  if (r.lbsData && r.lbsData.blocked) {
    html += `
      <div class="loan-warning" style="display:block;">
        LBS Not Available: ${r.lbsData.reason}
      </div>
    `;
  }

  html += `
    <div class="retirement-stage-title">Husband at ${r.retirementAge}</div>
    <div class="retirement-row"><span class="label">CPF (OA + RA + MA)</span><span class="value cpf">${formatCurrency(s1.totalCPF)}</span></div>
    <div class="retirement-row"><span class="label">├─ OA</span><span class="value">${formatCurrency(s1.oa)}</span></div>
    <div class="retirement-row"><span class="label">├─ RA</span><span class="value">${formatCurrency(s1.ra)}</span></div>
    <div class="retirement-row"><span class="label">└─ MA</span><span class="value">${formatCurrency(s1.ma)}</span></div>
    <div class="retirement-row"><span class="label">Cash</span><span class="value${cashClass1}">${formatCurrency(s1.cash)}</span></div>
    <div class="retirement-row"><span class="label">Est. CPF LIFE Payout <span class="tip" data-tip="Based on RA balance at retirement. Capped by FRS at age 55 (e.g. \$220,400 in 2026, growing 3.5%/yr). Higher salary increases OA/cash, not CPF LIFE once you hit the cap.">?</span></span><span class="value">${formatCurrency(r.cpfLife1)}/mo</span></div>
    <div class="retirement-row"><span class="label">OA Drawdown (20yr)</span><span class="value">${formatCurrency(Math.round(s1.oa / 240))}/mo</span></div>
    <div class="retirement-row total"><span class="label">Total Monthly Income</span><span class="value">${formatCurrency(r.cpfLife1 + Math.round(s1.oa / 240))}/mo</span></div>
    <div class="retirement-stage-title" style="margin-top:0.75rem;">Wife at ${r.retirementAge}</div>
    <div class="retirement-row"><span class="label">CPF (OA + RA + MA)</span><span class="value cpf">${formatCurrency(s2.totalCPF)}</span></div>
    <div class="retirement-row"><span class="label">├─ OA</span><span class="value">${formatCurrency(s2.oa)}</span></div>
    <div class="retirement-row"><span class="label">├─ RA</span><span class="value">${formatCurrency(s2.ra)}</span></div>
    <div class="retirement-row"><span class="label">└─ MA</span><span class="value">${formatCurrency(s2.ma)}</span></div>
    <div class="retirement-row"><span class="label">Cash</span><span class="value${cashClass2}">${formatCurrency(s2.cash)}</span></div>
    <div class="retirement-row"><span class="label">Est. CPF LIFE Payout <span class="tip" data-tip="Based on RA balance at retirement. Capped by FRS at age 55 (e.g. \$220,400 in 2026, growing 3.5%/yr). Higher salary increases OA/cash, not CPF LIFE once you hit the cap.">?</span></span><span class="value">${formatCurrency(r.cpfLife2)}/mo</span></div>
    <div class="retirement-row"><span class="label">OA Drawdown (20yr)</span><span class="value">${formatCurrency(Math.round(s2.oa / 240))}/mo</span></div>
    <div class="retirement-row total"><span class="label">Total Monthly Income</span><span class="value">${formatCurrency(r.cpfLife2 + Math.round(s2.oa / 240))}/mo</span></div>
    <div class="retirement-row total"><span class="label">Combined CPF</span><span class="value cpf">${formatCurrency(r.combinedCPFAtRetire)}</span></div>
    <div class="retirement-row total"><span class="label">Combined Cash</span><span class="value${combinedCashClass}">${formatCurrency(r.combinedCashAtRetire)}</span></div>
    <div class="retirement-row total"><span class="label">Property Value (est.)</span><span class="value">${formatCurrency(r.totalPropertyValue)}</span></div>
    <div class="retirement-row total"><span class="label">Total Net Worth</span><span class="value">${formatCurrency(r.totalNetWorthAtRetire)}</span></div>
    <div class="retirement-row total"><span class="label">Combined CPF LIFE</span><span class="value">${formatCurrency(r.cpfLifeTotal)}/mo</span></div>
    <div class="retirement-row total"><span class="label">Combined OA Drawdown</span><span class="value">${formatCurrency(Math.round((s1.oa + s2.oa) / 240))}/mo</span></div>
    <div class="retirement-row total"><span class="label">Total Monthly Retirement Income</span><span class="value">${formatCurrency(r.cpfLifeTotal + Math.round((s1.oa + s2.oa) / 240))}/mo</span></div>
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
      if (saved.spouse1.bonus !== undefined) document.getElementById('h-bonus').value = saved.spouse1.bonus;
      if (saved.spouse2.bonus !== undefined) document.getElementById('w-bonus').value = saved.spouse2.bonus;
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
  const snapshotLabel = r.scenario === 'forever'
    ? 'FINANCIAL POSITION AT MOP (YEAR ' + r.totalYears + ')'
    : 'SNAPSHOT 1: BEFORE THE SALE (YEAR ' + r.totalYears + ')';
  const spouseLabel = r.scenario === 'forever' ? 'AT MOP' : 'AT SALE';

  let html = `
    <div class="section-title">AUTOMATED FINANCING & FEES</div>
    <div class="form-grid" style="margin-bottom:1rem;">
      <div class="form-group"><label>Buyer Stamp Duty</label><input type="text" value="${formatCurrency(r.bsd)}" readonly></div>
      <div class="form-group"><label>Loan Amount</label><input type="text" value="${formatCurrency(r.effectiveLoan)}" readonly></div>
      <div class="form-group"><label>Monthly Mortgage</label><input type="text" value="${formatCurrency(r.monthlyMortgage)}" readonly></div>
      <div class="form-group"><label>Combined Monthly OA</label><input type="text" value="${formatCurrency(r.combinedOA)}" readonly></div>
      ${r.cov > 0 ? `<div class="form-group"><label>COV (Cash Only)</label><input type="text" value="${formatCurrency(r.cov)}" readonly></div>` : ''}
    </div>

    <div class="section-title">${snapshotLabel}</div>
    <div class="form-grid" style="margin-bottom:1rem;">
      <div class="form-group"><label>Total Liquid Cash Deployed</label><input type="text" value="${formatCurrency(r.totalCashDeployed)}" readonly></div>
      <div class="form-group"><label>Remaining Mortgage Loan</label><input type="text" value="${formatCurrency(r.mortgageBalanceAtMOP)}" readonly></div>
      <div class="form-group"><label>Accrued CPF Owed</label><input type="text" value="${formatCurrency(r.accruedCPF)}" readonly></div>
      <div class="form-group"><label>Total Career Cash Saved</label><input type="text" value="${formatCurrency(r.careerCash)}" readonly></div>
    </div>
  `;

  if (r.scenario === 'resale') {
    html += `
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
    `;
  }

  html += `
    <div class="section-title">SPOUSE BREAKDOWN ${spouseLabel}</div>
    <div class="form-grid">
      <div class="form-group"><label>Husband CPF ${spouseLabel}</label><input type="text" value="${formatCurrency(r.s1Final.totalCPF)}" readonly></div>
      <div class="form-group"><label>Husband Cash ${spouseLabel}</label><input type="text" value="${formatCurrency(Math.round(r.s1Final.cash + r.careerCashSaved / 2))}" readonly></div>
      <div class="form-group"><label>Wife CPF ${spouseLabel}</label><input type="text" value="${formatCurrency(r.s2Final.totalCPF)}" readonly></div>
      <div class="form-group"><label>Wife Cash ${spouseLabel}</label><input type="text" value="${formatCurrency(Math.round(r.s2Final.cash + r.careerCashSaved / 2))}" readonly></div>
      <div class="form-group"><label>Combined Household</label><input type="text" value="${formatCurrency(r.combinedCPFAtMOP + r.combinedCashAtMOP)}" readonly style="color:var(--accent);font-weight:700;"></div>
    </div>
  `;

  el.innerHTML = html;
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
  const aValue = years.map(y => calcPropertyValueWithDecay(a.price, a.growth, y, a.leaseAtPurchase));
  const bValue = years.map(y => calcPropertyValueWithDecay(b.price, b.growth, y, b.leaseAtPurchase));
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
