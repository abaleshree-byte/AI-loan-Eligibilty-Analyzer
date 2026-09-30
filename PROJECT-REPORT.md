# AI Loan Eligibility Checker — Project Report

## Abstract

AI Loan Eligibility Checker is a responsive educational web application for exploring loan affordability, credit profile indicators, repayment schedules, and general financial guidance. It combines transparent client-side financial calculations with optional server-side Anthropic Claude and Google Sheets integrations. The tool presents estimates only and is not a bank, credit bureau, lender approval system, or professional financial adviser.

## Introduction

Borrowers often need to compare income, recurring obligations, and repayment terms before approaching a lender. This project demonstrates a single interface for estimating affordability and understanding financial indicators. The implementation is intentionally explainable: the scoring contributions and assumptions are visible in source and documentation.

## Problem statement

Users may find loan, EMI, and credit education spread across separate tools. A simple interface can help them explore hypothetical financial scenarios; however, unqualified automated scores can be mistaken for actual credit or lending decisions. The application therefore uses explicit estimates, transparent factors, privacy controls, and repeated disclaimers.

## Objectives

1. Estimate loan affordability from user-entered financial values.
2. Explain the components of a configurable weighted score.
3. Categorize user-entered credit scores and provide general recommendations.
4. Calculate EMI, principal, interest, and repayment totals interactively.
5. Demonstrate optional secure server-side AI and spreadsheet integrations.
6. Provide input validation, explicit storage consent, and responsive accessibility.

## Scope

Included: a browser-based dashboard, deterministic financial calculations, credit indicators, a server-side AI advice endpoint, an opt-in Sheets append endpoint, local summary history, and deployment/test guidance.

Excluded: real lender approval, credit bureau access, identity verification, user authentication, a trained or validated ML model, loan offers, investment recommendations tailored to an individual, and production data governance.

## Existing and proposed systems

An unintegrated user workflow typically requires separate pages or manual calculations for loan affordability, credit indicators, and EMI. The proposed demo brings these modules together while clearly distinguishing deterministic estimates, AI-generated educational text, and actual lender decisions.

## System requirements

### Hardware

- Development machine capable of running a current Node.js runtime and browser.
- Any modern phone, tablet, or desktop capable of running a current browser.
- Internet access only for optional cloud APIs and externally hosted Google Fonts.

### Software

- Node.js 20+
- Modern browser with JavaScript enabled
- Optional Anthropic account/API key
- Optional Google Cloud project, Sheets API, service account, and destination spreadsheet
- Optional Vercel or Netlify account for deployment

## Functional requirements

- Validate eligibility and credit analyzer inputs within documented ranges.
- Calculate EMI and repayment totals from amount, rate, and term.
- Display the eligibility score, status, factors, estimated EMI capacity, debt ratio, and recommendations.
- Generate AI financial education only through the configured server route.
- Save a minimum set of analysis data only after the user explicitly opts in.
- Clear local recent summaries and reset the loan form.
- Download or share a short estimate summary.

## Non-functional requirements

- Responsive layout from mobile through desktop.
- Keyboard navigation, focus indicators, labels, and reduced-motion support.
- Secrets remain server-side.
- API errors are explicit, bounded, and do not expose provider credentials or internal stack traces.
- Calculations are deterministic and use shared code on the browser and storage server.
- No frontend framework or chart dependency is required.

## Technology stack

| Layer | Technology |
|---|---|
| User interface | HTML5, CSS3, vanilla JavaScript |
| Financial formulas | Shared `finance.js` module |
| Local development server | Node.js built-in HTTP server |
| AI | Anthropic Messages API via server function |
| Storage | Google Sheets API via server function |
| Hosting | Vercel Node.js functions or Netlify Functions |
| Tests | Node.js built-in test runner |

## System architecture

```text
                  ┌──────────────────────┐
                  │ Browser UI           │
                  │ HTML/CSS/JavaScript  │
                  └──────────┬───────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
       finance.js calculations      Same-origin API routes
                                            │
                              ┌─────────────┴───────────┐
                              │                         │
                    Financial advice             Save analysis
                              │                         │
                      Anthropic API          Google OAuth + Sheets
```

The AI route receives only the question text. The storage route requires consent, validates and recalculates the submitted profile, and then appends selected fields. Provider secrets are environment variables on the host.

## Workflow

```text
User → Landing page → Choose tool → Enter inputs
  → Browser validation → Financial calculation / API request
  → Result and educational explanation
  → (optional) consent → server-side Google Sheets append
```

### AI request sequence

```text
Question → browser POST /api/financial-advice
 → server validation and sensitive-pattern checks
 → Anthropic API request with server-side key
 → bounded response / clear error → browser
```

## Data flow diagram

```text
 [User]
    │ financial values
    ▼
 [Browser form] ── invalid ──► [Inline validation message]
    │ valid
    ▼
 [finance.js calculations] ──► [Estimate UI]
    │
    ├── question only ──► [Advice API] ──► [Anthropic]
    │
    └── explicit consent ──► [Storage API] ──► [Google Sheets]
```

## Use case diagram (text)

```text
Actor: Visitor
  ├── Explore financial tools
  ├── Calculate loan affordability
  ├── Analyze credit indicators
  ├── Calculate EMI
  ├── Ask an educational financial question (when API configured)
  ├── Download/share estimate
  ├── Save estimate after consent (when Sheets configured)
  └── Clear locally stored recent summaries
```

## Activity diagram (text)

```text
Start → Select eligibility tool → Enter financial profile
  → Is input valid?
      No → Show field error → Correct input
      Yes → Calculate weighted score and EMI capacity
  → Display estimate and assumptions
  → Save requested?
      No → End
      Yes → Consent checked?
          No → Ask for consent
          Yes → Send minimal inputs to API
              → API configured and save succeeds?
                  Yes → Show saved status
                  No → Show retryable error
```

## Module description

### Loan eligibility

The configurable default weights are credit score 30%, income 25%, debt-to-income 20%, employment stability 15%, and age 10%. The 35% EMI-capacity factor and 10.5% annual illustrative rate are assumptions, not published lender criteria. Debt-to-income uses existing EMIs and other debt obligations divided by monthly income; monthly expenses are subtracted separately when estimating disposable income.

### Credit score

The module maps entered scores to five educational bands and uses utilization, missed payments, history length, and recent inquiries to shape general guidance. It does not recalculate a bureau score or claim to model lender risk.

### EMI

The reducing-balance EMI formula is implemented in JavaScript. Zero interest is handled separately; invalid amounts, rates, and tenures raise errors rather than yielding misleading figures.

### AI advice

The server uses an account-configured Anthropic model and API key. It limits prompt length, rejects common account credential or identifier patterns, applies a request timeout, and reports missing configuration rather than returning a mock answer.

### Data storage

An explicit checkbox and action gate storage. Name and city are not included. Rows include timestamp/reference, age, income, employment type/duration, obligations, requested loan and tenure, credit score, existing loan count, and recalculated estimated score/category/EMI/DTI/maximum amount.

## Security and privacy considerations

- Never expose provider secrets in client-side code.
- Keep service accounts restricted to the destination spreadsheet.
- Request consent before sending entered financial profile data to Sheets.
- Do not request or store account passwords, OTP, PIN, CVV, or payment card numbers.
- Avoid sending identity or eligibility form details to the AI endpoint.
- Configure HTTPS, key rotation, data retention, access controls, and deletion workflows before production.
- Local browser storage contains only a brief estimate summary and can be cleared by the user.
- Google Sheets is a demo store; production use should undergo threat modeling, privacy review, and applicable regulatory review.

## Testing table

| Area | Test cases | Automated coverage |
|---|---|---|
| EMI | Standard rate, zero interest, invalid amount/rate | Yes |
| Eligibility | Weighted score, income/debt math, age/score/debt bounds, employment types | Yes |
| Credit analyzer | 300, 550, 650, 750, 800, 900, invalid score | Yes |
| Storage | Missing consent, missing configuration | Yes |
| AI | Missing configuration, credential-containing prompt | Yes |
| Responsive UI | Desktop, tablet, mobile, menu and forms | Manual browser verification recommended |
| Cloud APIs | Valid credentials, timeout, network error | Requires deployment credentials |

Run automated tests using `npm test`.

## Results

The delivered application provides working local calculations for eligibility, credit bands, and EMI; stores only recent summary values locally; and exposes consent-gated, server-side API endpoints for optional Claude and Sheets integration. Cloud calls remain deliberately unavailable until valid deployment secrets are configured.

## Advantages

- Unified responsive interface.
- Simple transparent formula and score factors.
- Does not need a browser-side API key.
- Explicit optional storage consent.
- Low dependency footprint.
- Built-in automated financial and API guard tests.

## Limitations

- Eligibility heuristic is not empirically calibrated or lender-specific.
- Credit score bands are illustrative and do not reproduce bureau scoring.
- Income, expense, employment, and credit data are user-reported and unverified.
- AI guidance may be inaccurate; it is general education, not professional advice.
- Google Sheets is not an appropriate production database without additional controls.
- No authentication, account-level data access controls, or deletion workflow for remote sheet rows is provided.

## Future scope

1. User authentication and authorization.
2. Secure database integration with encryption, retention, and audit controls.
3. Independently validated lender-specific eligibility models.
4. Authorized credit-bureau or financial-data provider integrations.
5. Lender product comparison.
6. Multilingual and voice-based financial education.
7. PDF reports, goal tracking, and repayment reminders.
8. Administrative dashboards and monitored model/API usage.

## Conclusion

The project demonstrates how a web interface can combine explainable financial arithmetic, educational credit indicators, and optional server-side AI and storage while making uncertainty and consent visible. Any real lending or financial use would require validation, security, privacy, and regulatory work beyond this educational demo.
