(() => {
  'use strict';

  const finance = window.FinanceTools;
  const currency = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  });
  const number = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });
  const localHistoryKey = 'loanEligibilityRecentSummaries';
  const loanForm = document.getElementById('loan-form');
  const formSteps = [...document.querySelectorAll('.form-step')];
  const stepNodes = [...document.querySelectorAll('.step')];
  const prevButton = document.getElementById('prev-btn');
  const nextButton = document.getElementById('next-btn');
  const formMessage = document.getElementById('form-message');
  let currentStep = 1;
  let latestAnalysis = null;

  function formatCurrency(value) {
    return currency.format(Math.round(value));
  }

  function getFormValues(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function announce(element, message, state) {
    element.textContent = message;
    element.dataset.state = state || '';
  }

  function setStep(stepNumber) {
    currentStep = stepNumber;
    formSteps.forEach((step, index) => {
      step.classList.toggle('current', index + 1 === stepNumber);
    });
    stepNodes.forEach((node, index) => {
      node.classList.toggle('active', index + 1 === stepNumber);
      node.classList.toggle('done', index + 1 < stepNumber);
    });
    prevButton.style.visibility = stepNumber === 1 ? 'hidden' : 'visible';
    nextButton.textContent = stepNumber === formSteps.length ? 'Calculate estimate' : 'Next';
  }

  function validateVisibleStep() {
    const current = formSteps[currentStep - 1];
    const fields = [...current.querySelectorAll('input, select')];
    for (const field of fields) {
      field.setCustomValidity('');
      if (!field.checkValidity()) {
        field.reportValidity();
        field.focus();
        return false;
      }
    }
    return true;
  }

  function updateList(list, entries) {
    list.replaceChildren(...entries.map((entry) => {
      const item = document.createElement('li');
      item.textContent = entry;
      return item;
    }));
  }

  function showEligibilityResult(result) {
    latestAnalysis = result;
    const badge = document.getElementById('result-status');
    const statusClass = result.category === 'Likely Eligible' ? 'success'
      : result.category === 'Possibly Eligible' ? 'warning' : 'danger';
    badge.textContent = result.category;
    badge.className = `result-badge ${statusClass}`;
    document.getElementById('loan-estimate').textContent = formatCurrency(result.maximumLoanAmount);
    document.getElementById('emi-estimate').textContent = formatCurrency(result.requestedEMI);
    document.getElementById('emi-capacity').textContent = formatCurrency(result.emiCapacity);
    document.getElementById('dti-status').textContent = `${number.format(result.debtToIncome)}%`;
    document.getElementById('confidence-score').textContent = `${result.score}/100`;
    updateList(document.getElementById('insight-factors'), result.reasons);
    updateList(document.getElementById('improvement-tips'), result.recommendations);

    const progress = document.getElementById('ai-progress-bar');
    progress.style.width = `${result.score}%`;
    progress.setAttribute('aria-valuenow', String(result.score));
    const badgeStatus = document.getElementById('score-badge');
    badgeStatus.textContent = `Estimated score: ${result.score}/100`;
    badgeStatus.className = `status-pill ${statusClass === 'success' ? 'success' : statusClass === 'warning' ? 'warning' : 'danger'}`;
    document.getElementById('ai-summary').textContent = result.disclaimer;
    document.getElementById('hero-eligibility-score').textContent = `${result.score}/100`;
    document.querySelector('.ai-progress').setAttribute('aria-valuenow', String(result.score));
    document.getElementById('hero-eligibility-label').textContent = result.category;
    document.getElementById('hero-loan-estimate').textContent = formatCurrency(result.maximumLoanAmount);
    document.getElementById('hero-income-insight').textContent = `Disposable income: ${formatCurrency(result.disposableIncome)}`;
    document.getElementById('hero-debt-insight').textContent = `Debt-to-income: ${number.format(result.debtToIncome)}%`;
    const gauge = document.querySelector('.gauge-ring');
    gauge.style.background = `conic-gradient(var(--accent) 0 ${result.score}%, rgba(255,255,255,0.08) ${result.score}% 100%)`;
    document.getElementById('tool-loan-status').textContent = result.category;
    document.getElementById('tool-loan-estimate').textContent = formatCurrency(result.maximumLoanAmount);

    const contributions = [
      ['Credit score', result.contributions.credit, result.weights.credit],
      ['Income', result.contributions.income, result.weights.income],
      ['Debt load', result.contributions.debt, result.weights.debt],
      ['Employment stability', result.contributions.employment, result.weights.employment],
      ['Age', result.contributions.age, result.weights.age],
    ];
    const recommendationGrid = document.getElementById('recommendation-grid');
    recommendationGrid.replaceChildren(...contributions.map(([label, points, weight]) => {
      const item = document.createElement('div');
      item.className = 'recommendation-item';
      const title = document.createElement('strong');
      title.textContent = `${label}: ${points} points`;
      const detail = document.createElement('span');
      detail.textContent = `${Math.round(weight * 100)}% scoring weight`;
      item.append(title, detail);
      return item;
    }));

    document.getElementById('download-result-btn').disabled = false;
    document.getElementById('share-result-btn').disabled = false;
    storeRecentSummary(result);
    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function calculateEligibility() {
    try {
      const result = finance.calculateEligibility(getFormValues(loanForm));
      showEligibilityResult(result);
      announce(formMessage, 'Estimate calculated. Use “Save with consent” if you want to submit it to configured storage.', 'success');
      return result;
    } catch (error) {
      announce(formMessage, error.message || 'We could not calculate this estimate. Check the entered values.', 'error');
      const invalid = loanForm.querySelector(':invalid');
      if (invalid) {
        const containingStep = invalid.closest('.form-step');
        const stepNumber = Number(containingStep && containingStep.dataset.step);
        if (stepNumber) setStep(stepNumber);
        invalid.reportValidity();
        invalid.focus();
      }
      return null;
    }
  }

  function storeRecentSummary(result) {
    const record = {
      createdAt: new Date().toISOString(),
      score: result.score,
      category: result.category,
      maximumLoanAmount: Math.round(result.maximumLoanAmount),
      debtToIncome: Number(result.debtToIncome.toFixed(1)),
    };
    let history = [];
    try {
      history = JSON.parse(localStorage.getItem(localHistoryKey) || '[]');
      if (!Array.isArray(history)) history = [];
    } catch (error) {
      console.warn('Unable to read local recent summaries.', error);
    }
    history.unshift(record);
    try {
      localStorage.setItem(localHistoryKey, JSON.stringify(history.slice(0, 5)));
      renderRecentSummaries();
    } catch (error) {
      announce(formMessage, 'The estimate was calculated, but recent summaries could not be saved in this browser.', 'error');
      console.warn('Unable to save local recent summaries.', error);
    }
  }

  function renderRecentSummaries() {
    const container = document.getElementById('recent-analyses');
    if (!container) return;
    let history;
    try {
      history = JSON.parse(localStorage.getItem(localHistoryKey) || '[]');
    } catch (error) {
      announce(document.getElementById('history-message'), 'Saved summaries are unreadable and were not displayed.', 'error');
      console.warn('Unable to parse local recent summaries.', error);
      return;
    }

    container.replaceChildren();
    if (!Array.isArray(history) || history.length === 0) {
      container.textContent = 'No recent summaries saved on this device.';
      return;
    }
    history.forEach((record) => {
      const item = document.createElement('li');
      const date = new Date(record.createdAt);
      item.textContent = `${date.toLocaleString()} — ${record.category}, score ${record.score}/100, estimated maximum ${formatCurrency(record.maximumLoanAmount)}`;
      container.appendChild(item);
    });
  }

  function setupEligibilityForm() {
    nextButton.addEventListener('click', () => {
      if (!validateVisibleStep()) return;
      if (currentStep < formSteps.length) {
        setStep(currentStep + 1);
        return;
      }
      const result = calculateEligibility();
      if (result) {
        saveResultForDownload(result);
      }
    });
    prevButton.addEventListener('click', () => {
      if (currentStep > 1) setStep(currentStep - 1);
    });
    loanForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (validateVisibleStep()) calculateEligibility();
    });
    document.getElementById('reset-form-btn').addEventListener('click', () => {
      loanForm.reset();
      latestAnalysis = null;
      setStep(1);
      document.getElementById('result-status').textContent = 'No assessment yet';
      document.getElementById('result-status').className = 'result-badge neutral';
      ['loan-estimate', 'emi-estimate', 'dti-status', 'confidence-score', 'emi-capacity'].forEach((id) => {
        document.getElementById(id).textContent = '—';
      });
      updateList(document.getElementById('insight-factors'), ['Complete the eligibility form to see your result.']);
      updateList(document.getElementById('improvement-tips'), ['Suggestions will appear after an assessment.']);
      document.getElementById('hero-eligibility-score').textContent = '—';
      document.getElementById('hero-eligibility-label').textContent = 'Run an estimate';
      document.getElementById('hero-loan-estimate').textContent = '—';
      document.getElementById('hero-income-insight').textContent = 'Your estimate appears after analysis';
      document.getElementById('hero-debt-insight').textContent = 'Your debt ratio appears after analysis';
      document.querySelector('.gauge-ring').style.background = '';
      document.getElementById('tool-loan-status').textContent = 'Not calculated';
      document.getElementById('tool-loan-estimate').textContent = '—';
      document.getElementById('ai-progress-bar').style.width = '0%';
      document.querySelector('.ai-progress').setAttribute('aria-valuenow', '0');
      document.getElementById('score-badge').textContent = 'Ready to assess';
      document.getElementById('recommendation-grid').replaceChildren();
      document.getElementById('download-result-btn').disabled = true;
      document.getElementById('share-result-btn').disabled = true;
      announce(formMessage, 'Form reset. No personal details were stored automatically.', 'success');
    });
    document.getElementById('save-analysis-btn').addEventListener('click', saveAnalysis);
  }

  function saveResultForDownload(result) {
    document.getElementById('download-result-btn').onclick = () => {
      const report = [
        'AI Loan Eligibility Estimate',
        `Assessment: ${result.category}`,
        `Estimated score: ${result.score}/100`,
        `Maximum estimated loan: ${formatCurrency(result.maximumLoanAmount)}`,
        `Requested loan EMI: ${formatCurrency(result.requestedEMI)}`,
        `Debt-to-income: ${number.format(result.debtToIncome)}%`,
        '',
        result.disclaimer,
      ].join('\n');
      const file = new Blob([report], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'loan-eligibility-estimate.txt';
      anchor.click();
      URL.revokeObjectURL(url);
    };
    document.getElementById('share-result-btn').onclick = async () => {
      const shareData = {
        title: 'Loan eligibility estimate',
        text: `${result.category}; estimated score ${result.score}/100. ${result.disclaimer}`,
      };
      try {
        if (navigator.share) await navigator.share(shareData);
        else if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareData.text);
          announce(formMessage, 'A brief estimate summary was copied. No personal inputs were included.', 'success');
        } else {
          announce(formMessage, 'Sharing is not supported by this browser.', 'error');
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          announce(formMessage, 'Could not share the estimate. Please try again.', 'error');
        }
      }
    };
  }

  async function saveAnalysis() {
    const consent = document.getElementById('storage-consent').checked;
    if (!consent) {
      announce(formMessage, 'Please provide consent before saving analysis data.', 'error');
      document.getElementById('storage-consent').focus();
      return;
    }
    if (!latestAnalysis) {
      announce(formMessage, 'Calculate an estimate before saving it.', 'error');
      return;
    }

    const values = getFormValues(loanForm);
    const saveButton = document.getElementById('save-analysis-btn');
    saveButton.disabled = true;
    saveButton.textContent = 'Saving…';
    announce(formMessage, 'Submitting the opted-in analysis to the configured server…', 'info');
    try {
      const response = await fetch('/api/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consent: true,
          input: {
            age: Number(values.age),
            monthlyIncome: Number(values.monthlyIncome),
            employmentType: values.employmentType,
            yearsExperience: Number(values.yearsExperience),
            existingEMI: Number(values.existingEMI),
            otherObligations: Number(values.otherObligations),
            monthlyExpenses: Number(values.monthlyExpenses),
            loanAmount: Number(values.loanAmount),
            tenureYears: Number(values.tenureYears),
            creditScore: Number(values.creditScore),
            existingLoans: Number(values.existingLoans),
          },
          result: {
            score: latestAnalysis.score,
            category: latestAnalysis.category,
            emi: Math.round(latestAnalysis.requestedEMI),
            debtToIncome: Number(latestAnalysis.debtToIncome.toFixed(1)),
            maximumLoanAmount: Math.round(latestAnalysis.maximumLoanAmount),
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Unable to save right now. Please try again.');
      announce(formMessage, 'Saved successfully to the configured storage service.', 'success');
    } catch (error) {
      announce(formMessage, error.message || 'Unable to save right now. Please try again.', 'error');
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'Save with consent';
    }
  }

  function setupCreditAnalyzer() {
    const form = document.getElementById('credit-form');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      try {
        const result = finance.analyzeCredit(getFormValues(form));
        const ring = document.getElementById('credit-score-ring');
        ring.dataset.score = String(result.score);
        ring.style.background = `conic-gradient(var(--success) 0 ${((result.score - 300) / 6).toFixed(1)}%, rgba(255,255,255,0.08) ${((result.score - 300) / 6).toFixed(1)}% 100%)`;
        document.getElementById('credit-score-value').textContent = String(result.score);
        document.getElementById('hero-credit-score').textContent = String(result.score);
        document.getElementById('tool-credit-score').textContent = String(result.score);
        document.getElementById('credit-category').textContent = result.category;
        document.getElementById('credit-summary').textContent = result.disclaimer;
        document.getElementById('credit-payment-factor').textContent = result.paymentLabel;
        document.getElementById('credit-utilization-factor').textContent = result.utilizationLabel;
        document.getElementById('credit-history-factor').textContent = result.historyLabel;
        document.getElementById('credit-mix-factor').textContent = result.creditMixLabel;
        document.getElementById('credit-inquiries-factor').textContent = result.inquiriesLabel;
        updateList(document.getElementById('credit-recommendations'), result.recommendations);
        announce(document.getElementById('credit-message'), 'Credit profile analyzed using educational indicators.', 'success');
      } catch (error) {
        announce(document.getElementById('credit-message'), error.message || 'Unable to analyze this credit profile.', 'error');
      }
    });
  }

  function updateEmiCalculator() {
    const principal = Number(document.getElementById('loan-amount-range').value);
    const annualRate = Number(document.getElementById('interest-rate-range').value);
    const years = Number(document.getElementById('tenure-range').value);
    const monthlyPayment = finance.calculateEMI(principal, annualRate, years);
    const totalPayment = monthlyPayment * years * 12;
    const totalInterest = totalPayment - principal;
    const principalPercent = (principal / totalPayment) * 100;

    document.getElementById('loan-amount-display').textContent = formatCurrency(principal);
    document.getElementById('interest-rate-display').textContent = `${annualRate.toFixed(1)}%`;
    document.getElementById('tenure-display').textContent = `${years} years`;
    document.getElementById('monthly-emi').textContent = formatCurrency(monthlyPayment);
    document.getElementById('total-principal').textContent = formatCurrency(principal);
    document.getElementById('total-interest').textContent = formatCurrency(totalInterest);
    document.getElementById('total-payment').textContent = formatCurrency(totalPayment);
    document.getElementById('donut-value').textContent = formatCurrency(totalPayment);
    document.getElementById('tool-emi-estimate').textContent = `${formatCurrency(monthlyPayment)}/mo`;
    document.querySelector('.donut-chart').style.background = `conic-gradient(var(--primary) 0 ${principalPercent}%, var(--accent) ${principalPercent}% 100%)`;
    document.querySelector('.donut-chart').setAttribute('aria-label', `Principal ${formatCurrency(principal)}, interest ${formatCurrency(totalInterest)}`);
  }

  function setupEMICalculator() {
    document.querySelectorAll('#loan-amount-range, #interest-rate-range, #tenure-range')
      .forEach((input) => input.addEventListener('input', updateEmiCalculator));
    updateEmiCalculator();
  }

  async function setupAdviceForm() {
    const form = document.getElementById('advice-form');
    const button = document.getElementById('generate-tips-btn');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const question = document.getElementById('advice-question').value.trim();
      if (!question || question.length > 1200) {
        announce(document.getElementById('advice-message'), 'Enter a question of 1–1200 characters.', 'error');
        return;
      }
      button.disabled = true;
      button.textContent = 'Generating…';
      announce(document.getElementById('advice-message'), 'Waiting for the configured Claude service…', 'info');
      const responseBox = document.getElementById('advice-response');
      responseBox.textContent = 'Generating an educational response…';
      try {
        const response = await fetch('/api/financial-advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || 'We couldn’t process your request right now. Please try again.');
        if (typeof payload.answer !== 'string' || !payload.answer.trim()) {
          throw new Error('The advice service returned an empty response. Please retry.');
        }
        responseBox.textContent = payload.answer;
        announce(document.getElementById('advice-message'), 'Response generated. Please review the financial disclaimer.', 'success');
      } catch (error) {
        responseBox.textContent = 'No AI response was generated.';
        announce(document.getElementById('advice-message'), error.message || 'We couldn’t process your request right now. Please try again.', 'error');
      } finally {
        button.disabled = false;
        button.textContent = 'Ask Claude';
      }
    });
  }

  function setupNavigation() {
    const toggle = document.querySelector('.nav-toggle');
    const menu = document.querySelector('.nav-menu');
    toggle.addEventListener('click', () => {
      const expanded = menu.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(expanded));
    });
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
      menu.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));

    document.querySelectorAll('.tool-card').forEach((card) => {
      card.addEventListener('click', (event) => {
        if (event.target.closest('a')) return;
        document.querySelector(card.dataset.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function setupHistory() {
    renderRecentSummaries();
    document.getElementById('clear-history-btn').addEventListener('click', () => {
      try {
        localStorage.removeItem(localHistoryKey);
        renderRecentSummaries();
        announce(document.getElementById('history-message'), 'Recent summaries cleared from this browser.', 'success');
      } catch (error) {
        announce(document.getElementById('history-message'), 'Could not clear browser storage. Please check browser settings.', 'error');
      }
    });
  }

  function init() {
    if (!finance) {
      announce(formMessage, 'Financial calculation tools failed to load. Refresh the page or check finance.js.', 'error');
      return;
    }
    setStep(1);
    setupEligibilityForm();
    setupCreditAnalyzer();
    setupEMICalculator();
    setupAdviceForm();
    setupNavigation();
    setupHistory();
  }

  init();
})();
