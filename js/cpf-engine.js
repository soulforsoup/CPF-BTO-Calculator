const CPF_CONFIG = {
  owCeiling: 8000,
  annualLimit: 37740,
  awAnnualCeiling: 102000,

  oaRate: 0.025,
  saRate: 0.04,
  maRate: 0.04,
  raRate: 0.04,
  extraInterestRate: 0.01,
  extraInterestCap: 60000,
  raExtraInterestCap: 30000,

  frs: 220400,
  brs: 110200,
  ers: 330600,
  frsGrowthRate: 0.035,

  bhs: 71500,
  bhsGrowthRate: 0.04,

  hdbLtv: 0.75,
  hdbLoanRate: 0.026,

  contributionRates: [
    { maxAge: 55,  employer: 0.17,  employee: 0.20,  total: 0.37  },
    { maxAge: 60,  employer: 0.16,  employee: 0.18,  total: 0.34  },
    { maxAge: 65,  employer: 0.125, employee: 0.125, total: 0.25  },
    { maxAge: 70,  employer: 0.09,  employee: 0.075, total: 0.165 },
    { maxAge: 999, employer: 0.075, employee: 0.05,  total: 0.125 },
  ],

  allocationRates: [
    { maxAge: 35,  oa: 0.6217, sa: 0.1622, ma: 0.2162 },
    { maxAge: 45,  oa: 0.5676, sa: 0.1892, ma: 0.2432 },
    { maxAge: 50,  oa: 0.5135, sa: 0.2162, ma: 0.2703 },
    { maxAge: 55,  oa: 0.4054, sa: 0.3108, ma: 0.2838 },
    { maxAge: 60,  oa: 0.3529, sa: 0.2647, ma: 0.3824 },
    { maxAge: 65,  oa: 0.1400, sa: 0.1000, ma: 0.7600 },
    { maxAge: 70,  oa: 0.0606, sa: 0.0606, ma: 0.8788 },
    { maxAge: 999, oa: 0.0800, sa: 0.0800, ma: 0.8400 },
  ],

  resaleLevy: {
    '2room': 15000, '3room': 30000, '4room': 40000,
    '5room': 45000, 'exec': 50000,
  },

  bsd: [
    { limit: 180000, rate: 0.01 },
    { limit: 180000, rate: 0.02 },
    { limit: 640000, rate: 0.03 },
    { limit: 500000, rate: 0.04 },
    { limit: 1500000, rate: 0.05 },
    { limit: Infinity, rate: 0.06 },
  ],
};

function getContributionRate(age) {
  for (const bracket of CPF_CONFIG.contributionRates) {
    if (age <= bracket.maxAge) {
      return { employer: bracket.employer, employee: bracket.employee, total: bracket.total };
    }
  }
  const last = CPF_CONFIG.contributionRates[CPF_CONFIG.contributionRates.length - 1];
  return { employer: last.employer, employee: last.employee, total: last.total };
}

function getAllocationRates(age) {
  if (age >= 55) {
    for (const bracket of CPF_CONFIG.allocationRates) {
      if (age <= bracket.maxAge) {
        return { oa: bracket.oa, ra: bracket.sa, ma: bracket.ma };
      }
    }
  }
  for (const bracket of CPF_CONFIG.allocationRates) {
    if (age <= bracket.maxAge) {
      return { oa: bracket.oa, sa: bracket.sa, ma: bracket.ma };
    }
  }
  const last = CPF_CONFIG.allocationRates[CPF_CONFIG.allocationRates.length - 1];
  return { oa: last.oa, sa: last.sa, ma: last.ma };
}

function calcMonthlyCPF(salary, age) {
  const cappedSalary = Math.min(salary, CPF_CONFIG.owCeiling);
  const rates = getContributionRate(age);
  const total = Math.round(cappedSalary * rates.total);
  const employer = Math.round(cappedSalary * rates.employer);
  const employee = Math.round(cappedSalary * rates.employee);
  const alloc = getAllocationRates(age);

  let oa = 0, sa = 0, ra = 0, ma = 0;
  if (age >= 55) {
    oa = Math.round(total * alloc.oa);
    ra = Math.round(total * alloc.ra);
    ma = total - oa - ra;
  } else {
    oa = Math.round(total * alloc.oa);
    sa = Math.round(total * alloc.sa);
    ma = total - oa - sa;
  }

  return { total, employer, employee, oa, sa, ra, ma };
}

function calcAnnualInterest(oa, sa, ra, ma, age) {
  let oaInt = oa * CPF_CONFIG.oaRate;
  let saInt = sa * CPF_CONFIG.saRate;
  let maInt = ma * CPF_CONFIG.maRate;
  let raInt = ra * CPF_CONFIG.raRate;

  let totalExtra = 0;
  let remainingCap = CPF_CONFIG.extraInterestCap;

  if (age >= 55) {
    const raUsed = Math.min(ra, remainingCap);
    totalExtra += raUsed * CPF_CONFIG.extraInterestRate;
    remainingCap -= raUsed;
  } else {
    const saUsed = Math.min(sa, remainingCap);
    totalExtra += saUsed * CPF_CONFIG.extraInterestRate;
    remainingCap -= saUsed;
  }

  const maUsed = Math.min(ma, remainingCap);
  totalExtra += maUsed * CPF_CONFIG.extraInterestRate;
  remainingCap -= maUsed;

  const oaUsed = Math.min(oa, remainingCap, 20000);
  totalExtra += oaUsed * CPF_CONFIG.extraInterestRate;

  let raExtra = 0;
  if (age >= 55) {
    raExtra = Math.min(ra, CPF_CONFIG.raExtraInterestCap) * CPF_CONFIG.extraInterestRate;
    totalExtra += raExtra;
  }

  return { oaInt, saInt, maInt, raInt, totalExtra, raExtra };
}

function projectCPF(params) {
  const {
    currentAge, grossMonthlySalary, annualIncrement,
    currentOA, currentSA, currentMA,
    targetAge, monthlyCashSavings, annualBonus,
    monthlyMortgage, mortgageTenure, mortgageStartAge,
    startingCash,
  } = params;

  let oa = currentOA || 0;
  let sa = currentSA || 0;
  let ma = currentMA || 0;
  let ra = 0;
  let cash = startingCash || 0;
  const rows = [];
  let salary = grossMonthlySalary || 0;
  const awRoom = Math.max(0, CPF_CONFIG.awAnnualCeiling - (CPF_CONFIG.owCeiling * 12));
  const bonusForCPF = Math.min(annualBonus || 0, awRoom);
  const mortgageStartYr = (mortgageStartAge !== undefined ? mortgageStartAge : 999) - currentAge;
  const mortgageEndYr = mortgageStartYr + (mortgageTenure || 0);
  const yearsFromNow = 0 - currentAge;

  for (let year = 0; year <= targetAge - currentAge; year++) {
    const age = currentAge + year;
    let yearOA = 0, yearSA = 0, yearRA = 0, yearMA = 0;
    let yearContrib = 0;
    let totalContrib = 0;

    for (let month = 0; month < 12; month++) {
      const mc = calcMonthlyCPF(salary, age);
      yearOA += mc.oa;
      yearSA += mc.sa;
      yearRA += mc.ra;
      yearMA += mc.ma;
      yearContrib += mc.total;
      totalContrib += mc.total;

      cash += (monthlyCashSavings || 0);

      if (monthlyMortgage && mortgageTenure && mortgageStartAge !== undefined) {
        if (age >= mortgageStartAge && age < mortgageStartAge + mortgageTenure) {
          const deduction = Math.min(monthlyMortgage, oa);
          oa -= deduction;
          const shortfall = monthlyMortgage - deduction;
          if (shortfall > 0) {
            cash -= shortfall;
          }
        }
      }
    }

    if (bonusForCPF > 0) {
      const rates = getContributionRate(age);
      const alloc = getAllocationRates(age);
      const bonusContrib = Math.round(bonusForCPF * rates.total);
      const bonusOA = Math.round(bonusContrib * alloc.oa);
      if (age >= 55) {
        const bonusRA = Math.round(bonusContrib * (alloc.ra || 0));
        const bonusMA = bonusContrib - bonusOA - bonusRA;
        yearOA += bonusOA;
        yearRA += bonusRA;
        yearMA += bonusMA;
      } else {
        const bonusSA = Math.round(bonusContrib * (alloc.sa || 0));
        const bonusMA = bonusContrib - bonusOA - bonusSA;
        yearOA += bonusOA;
        yearSA += bonusSA;
        yearMA += bonusMA;
      }
      yearContrib += bonusContrib;
      totalContrib += bonusContrib;
    }

    let cappedContrib = yearContrib;
    if (totalContrib > CPF_CONFIG.annualLimit) {
      const scale = CPF_CONFIG.annualLimit / totalContrib;
      yearOA = Math.round(yearOA * scale);
      yearSA = Math.round(yearSA * scale);
      yearRA = Math.round(yearRA * scale);
      yearMA = Math.round(yearMA * scale);
      cappedContrib = CPF_CONFIG.annualLimit;
    }

    oa += yearOA;
    ma += yearMA;

    const currentBHS = Math.round(CPF_CONFIG.bhs * Math.pow(1 + CPF_CONFIG.bhsGrowthRate, year));
    if (ma > currentBHS) {
      const overflow = ma - currentBHS;
      ma = currentBHS;
      if (age < 55) sa += overflow;
      else ra += overflow;
    }

    if (age === 55) {
      const yearsFromProjectionStart = 55 - currentAge;
      const frsAt55 = Math.round(CPF_CONFIG.frs * Math.pow(1 + CPF_CONFIG.frsGrowthRate, yearsFromProjectionStart));

      let toRA = Math.min(sa, frsAt55);
      ra += toRA;
      sa -= toRA;
      if (ra < frsAt55) {
        const needed = frsAt55 - ra;
        const fromOA = Math.min(oa, needed);
        ra += fromOA;
        oa -= fromOA;
      }
      oa += sa;
      sa = 0;
    } else if (age > 55) {
      const yearsFromProjectionStart = 55 - currentAge;
      const frsAt55 = Math.round(CPF_CONFIG.frs * Math.pow(1 + CPF_CONFIG.frsGrowthRate, yearsFromProjectionStart));

      if (ra < frsAt55) {
        const toRA = Math.min(yearRA, frsAt55 - ra);
        ra += toRA;
        oa += yearRA - toRA;
      } else {
        oa += yearRA;
      }
    } else {
      sa += yearSA;
    }

    const interest = calcAnnualInterest(
      oa,
      age < 55 ? sa : 0,
      age >= 55 ? ra : 0,
      ma,
      age
    );
    oa += interest.oaInt;
    if (age < 55) sa += interest.saInt;
    else ra += interest.raInt + interest.raExtra;
    ma += interest.maInt;

    if (ma > currentBHS) {
      const overflow = ma - currentBHS;
      ma = currentBHS;
      if (age < 55) sa += overflow;
      else ra += overflow;
    }

    rows.push({
      year,
      age,
      salary: Math.round(salary),
      contrib: cappedContrib,
      yearOA, yearSA: age < 55 ? yearSA : 0, yearRA: age >= 55 ? yearRA : 0, yearMA,
      oa: Math.round(oa),
      sa: age < 55 ? Math.round(sa) : 0,
      ra: age >= 55 ? Math.round(ra) : 0,
      ma: Math.round(ma),
      totalCPF: Math.round(oa + (age < 55 ? sa : ra) + ma),
      cash: Math.round(cash),
      netWorth: Math.round(oa + (age < 55 ? sa : ra) + ma + cash),
      interest: Math.round(interest.oaInt + (age < 55 ? interest.saInt : interest.raInt + interest.raExtra) + interest.maInt),
    });

    if (annualIncrement) {
      salary *= (1 + annualIncrement / 100);
    }
  }

  return rows;
}

function calcBSD(price) {
  let remaining = price;
  let total = 0;
  for (const bracket of CPF_CONFIG.bsd) {
    const taxable = Math.min(remaining, bracket.limit);
    total += taxable * bracket.rate;
    remaining -= taxable;
    if (remaining <= 0) break;
  }
  return Math.round(total);
}

function calcMortgage(principal, annualRate, tenureYears) {
  if (principal <= 0) return 0;
  const monthlyRate = annualRate / 12;
  const months = tenureYears * 12;
  if (monthlyRate === 0) return Math.round(principal / months);
  return Math.round(
    principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1)
  );
}

function calcMortgageBalance(principal, annualRate, tenureYears, yearsElapsed) {
  if (principal <= 0) return 0;
  const monthlyRate = annualRate / 12;
  const months = tenureYears * 12;
  const elapsedMonths = yearsElapsed * 12;
  if (elapsedMonths >= months) return 0;
  if (monthlyRate === 0) return Math.round(principal - (principal / months) * elapsedMonths);
  return Math.round(
    principal * (Math.pow(1 + monthlyRate, months) - Math.pow(1 + monthlyRate, elapsedMonths)) /
    (Math.pow(1 + monthlyRate, months) - 1)
  );
}

function calcAccruedCPF(monthlyDeductions, months, annualRate) {
  const monthlyRate = annualRate / 12;
  let total = 0;
  for (let i = 0; i < months; i++) {
    total = (total + monthlyDeductions) * (1 + monthlyRate);
  }
  return Math.round(total);
}

function calcSellingPrice(purchasePrice, annualGrowthRate, years) {
  return Math.round(purchasePrice * Math.pow(1 + annualGrowthRate / 100, years));
}

function calcResaleLevy(flatType) {
  return CPF_CONFIG.resaleLevy[flatType] || 0;
}

function calcSubsidyClawback(resalePrice, clawbackPct) {
  return Math.round(resalePrice * (clawbackPct / 100));
}

function calcCPFLife(raBalance) {
  if (raBalance <= 0) return 0;
  return Math.round((raBalance / 120) * 0.85);
}

function formatCurrency(num) {
  if (num === undefined || num === null) return '$0';
  return '$' + Math.round(num).toLocaleString();
}

function formatCurrencyFull(num) {
  if (num === undefined || num === null) return '$0';
  return '$' + Math.round(num).toLocaleString('en-US');
}
