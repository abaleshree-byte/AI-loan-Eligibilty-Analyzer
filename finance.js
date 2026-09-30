(function (root, factory) {
  const finance = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = finance;
  } else {
    root.FinanceTools = finance;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DEFAULT_WEIGHTS = Object.freeze({
    credit: 0.3,
    income: 0.25,
    debt: 0.2,
    employment: 0.15,
    age: 0.1,
  });

  function assertNumber(value, label, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number) || number < min || number > max) {
      throw new RangeError(`${label} must be between ${min} and ${max}.`);
    }
    return number;
  }

  function calculateEMI(principal, annualRate, years) {
    const amount = assertNumber(principal, 'Loan amount', 1, 1_000_000_000_000);
    const rate = assertNumber(annualRate, 'Interest rate', 0, 100);
    const tenure = assertNumber(years, 'Loan tenure', 1 / 12, 100);
    const months = Math.round(tenure * 12);
    const monthlyRate = rate / 1200;

    if (monthlyRate === 0) {
      return amount / months;
    }

    const factor = (1 + monthlyRate) ** months;
    return (amount * monthlyRate * factor) / (factor - 1);
  }

  function loanAmountForEMI(monthlyPayment, annualRate, years) {
    const payment = Math.max(0, Number(monthlyPayment) || 0);
    if (payment === 0) return 0;

    const rate = assertNumber(annualRate, 'Interest rate', 0, 100);
    const tenure = assertNumber(years, 'Loan tenure', 1 / 12, 100);
    const months = Math.round(tenure * 12);
    const monthlyRate = rate / 1200;
    if (monthlyRate === 0) return payment * months;

    const factor = (1 + monthlyRate) ** months;
    return (payment * (factor - 1)) / (monthlyRate * factor);
  }

  function calculateEligibility(input, options) {
    const weights = { ...DEFAULT_WEIGHTS, ...(options && options.weights) };
    const weightTotal = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(weightTotal - 1) > 1e-9 || Object.values(weights).some((weight) => weight < 0)) {
      throw new RangeError('Eligibility scoring weights must be non-negative and sum to 1.');
    }

    const age = assertNumber(input.age, 'Age', 18, 70);
    const monthlyIncome = assertNumber(input.monthlyIncome, 'Monthly income', 1, 1_000_000_000);
    const creditScore = assertNumber(input.creditScore, 'Credit score', 300, 900);
    const employmentYears = assertNumber(input.yearsExperience, 'Employment duration', 0, 50);
    const existingEMI = assertNumber(input.existingEMI, 'Existing EMIs', 0, monthlyIncome);
    const otherObligations = assertNumber(input.otherObligations, 'Other debt obligations', 0, monthlyIncome);
    const monthlyExpenses = assertNumber(input.monthlyExpenses, 'Monthly expenses', 0, 1_000_000_000);
    const requestedAmount = assertNumber(input.loanAmount, 'Requested loan amount', 1, 1_000_000_000_000);
    const tenureYears = assertNumber(input.tenureYears, 'Loan tenure', 1 / 12, 40);
    const annualRate = options && options.annualRate !== undefined ? options.annualRate : 10.5;
    const emiCapacityRatio = options && options.emiCapacityRatio !== undefined ? options.emiCapacityRatio : 0.35;

    if (existingEMI + otherObligations > monthlyIncome) {
      throw new RangeError('Existing EMI and debt obligations cannot exceed monthly income.');
    }
    if (emiCapacityRatio <= 0 || emiCapacityRatio > 1) {
      throw new RangeError('EMI capacity ratio must be greater than 0 and no more than 1.');
    }

    const disposableIncome = monthlyIncome - existingEMI - otherObligations - monthlyExpenses;
    const emiCapacity = Math.max(0, disposableIncome * emiCapacityRatio);
    const debtToIncome = ((existingEMI + otherObligations) / monthlyIncome) * 100;
    const employmentFactors = {
      Salaried: 1,
      Professional: 0.9,
      'Self-employed': 0.82,
      Business: 0.78,
      Other: 0.7,
    };
    const employmentType = String(input.employmentType || '');
    if (!Object.prototype.hasOwnProperty.call(employmentFactors, employmentType)) {
      throw new RangeError('Select a valid employment type.');
    }

    const ageScore = age >= 21 && age <= 60 ? 100 : age < 21 ? 65 + (age - 18) * 10 : 100 - (age - 60) * 5;
    const employmentScore = Math.min(100, employmentYears * 25) * employmentFactors[employmentType];
    const factors = {
      credit: (creditScore - 300) / 6,
      income: Math.min(100, (monthlyIncome / 100_000) * 100),
      debt: Math.max(0, 100 - debtToIncome * 2),
      employment: employmentScore,
      age: Math.max(0, Math.min(100, ageScore)),
    };
    const contributions = Object.fromEntries(
      Object.entries(factors).map(([key, value]) => [
        key,
        Math.round(value * weights[key]),
      ]),
    );
    const score = Math.max(
      0,
      Math.min(
        100,
        Math.round(Object.entries(factors).reduce((total, [key, value]) => total + value * weights[key], 0)),
      ),
    );
    const requestedEMI = calculateEMI(requestedAmount, annualRate, tenureYears);
    const maximumLoanAmount = loanAmountForEMI(emiCapacity, annualRate, tenureYears);
    let category = 'Needs Improvement';
    if (score >= 75 && requestedEMI <= emiCapacity) {
      category = 'Likely Eligible';
    } else if (score >= 55 && requestedEMI <= emiCapacity * 1.25) {
      category = 'Possibly Eligible';
    }

    const reasons = [];
    if (factors.credit >= 70) reasons.push('Your entered credit score contributes positively to this estimate.');
    else reasons.push('A higher credit score may improve this estimate.');
    if (disposableIncome > 0) reasons.push('Your stated income leaves some monthly disposable income after expenses and existing debt.');
    else reasons.push('Your stated expenses and obligations leave little or no disposable income.');
    if (debtToIncome <= 35) reasons.push('Existing monthly debt is moderate relative to stated income.');
    else reasons.push('Existing monthly debt is a substantial share of stated income.');
    if (employmentYears >= 2) reasons.push('Your employment duration adds stability to the estimate.');
    else reasons.push('A longer employment or business history may strengthen the estimate.');

    const recommendations = [];
    if (debtToIncome > 35) recommendations.push('Consider reducing existing debt before taking on another monthly payment.');
    if (disposableIncome <= 0) recommendations.push('Review expenses and obligations; the current inputs leave no positive disposable income.');
    if (creditScore < 700) recommendations.push('Review your credit report for errors and maintain on-time payments.');
    if (requestedEMI > emiCapacity) recommendations.push('Try a smaller loan amount or longer tenure, while considering the additional total interest.');
    if (recommendations.length === 0) recommendations.push('Compare lender terms and keep a financial buffer before committing to a loan.');

    return {
      score,
      category,
      factors,
      contributions,
      weights,
      disposableIncome,
      emiCapacity,
      debtToIncome,
      requestedEMI,
      maximumLoanAmount,
      requestedAmount,
      annualRate: Number(annualRate),
      tenureYears,
      reasons,
      recommendations,
      disclaimer:
        'This estimate is informational, not a lender decision or guarantee. Banks and financial institutions apply their own policies and verification.',
    };
  }

  function analyzeCredit(input) {
    const score = assertNumber(input.score, 'Credit score', 300, 900);
    const utilization = assertNumber(input.utilization, 'Credit utilization', 0, 100);
    const missedPayments = assertNumber(input.missedPayments, 'Missed payments', 0, 100);
    const historyYears = assertNumber(input.historyYears, 'Credit history length', 0, 100);
    const activeLoans = assertNumber(input.activeLoans, 'Active loans', 0, 100);
    const creditCards = assertNumber(input.creditCards, 'Credit cards', 0, 100);
    const inquiries = assertNumber(input.inquiries, 'Recent inquiries', 0, 100);

    let category;
    if (score < 550) category = 'Poor';
    else if (score < 650) category = 'Fair';
    else if (score < 750) category = 'Good';
    else if (score < 800) category = 'Very Good';
    else category = 'Excellent';

    const recommendations = [];
    if (missedPayments > 0) recommendations.push('Prioritize on-time payments and contact lenders if you anticipate difficulty paying.');
    else recommendations.push('Continue making payments by their due dates.');
    if (utilization > 30) recommendations.push('If practical, lower revolving utilization; keeping it below 30% is a common educational guideline, not a scoring guarantee.');
    else recommendations.push('Keep utilization low and avoid using all available revolving credit.');
    if (historyYears < 3) recommendations.push('A longer credit history may help; keep older accounts in good standing if suitable.');
    if (inquiries > 3) recommendations.push('Limit unnecessary credit applications, which can create hard inquiries.');
    if (creditCards === 0 && activeLoans === 0) recommendations.push('Build credit gradually only when it fits your budget; do not borrow solely to change a score.');
    const creditMixLabel = activeLoans > 0 && creditCards > 0
      ? 'Loan and card accounts reported'
      : activeLoans + creditCards > 0 ? 'Limited account types reported' : 'No active account types reported';

    return {
      score,
      category,
      utilization,
      missedPayments,
      historyYears,
      activeLoans,
      creditCards,
      inquiries,
      paymentLabel: missedPayments === 0 ? 'No missed payments entered' : `${missedPayments} reported`,
      utilizationLabel: utilization <= 30 ? 'Within common guideline' : 'High utilization',
      historyLabel: historyYears >= 5 ? 'Longer history' : 'Shorter history',
      creditMixLabel,
      inquiriesLabel: inquiries <= 2 ? 'Limited' : 'Several',
      recommendations,
      disclaimer: 'Credit bureau and lender scoring models vary. This is educational guidance, not an official score or credit decision.',
    };
  }

  return Object.freeze({ DEFAULT_WEIGHTS, analyzeCredit, calculateEligibility, calculateEMI, loanAmountForEMI });
});
