# AI Loan Eligibility Checker

An educational, responsive financial decision-support demo with a loan affordability estimate, credit profile analyzer, live EMI calculator, and optional Claude-powered financial education. The app is not a lender, credit bureau, or financial adviser.

## Abstract

The application brings common borrowing calculations and general financial education into one browser-based dashboard. Users can enter a financial profile to receive a transparent, weighted estimate, inspect credit-related indicators, compare EMI scenarios, and (when configured) ask a server-side Claude integration general questions. Saving an analysis to Google Sheets is an explicit, consent-gated action. No API keys or Google service-account credentials are embedded in frontend assets.

## Problem statement

Loan and repayment information is often distributed among calculators and general resources. Users need an accessible way to explore affordability and understand which inputs influence an estimate without mistaking it for lender approval. This project demonstrates those educational calculations and explains their limitations.

## Objectives

- Estimate affordability from income, expenses, existing obligations, age, employment duration/type, credit score, loan amount, and tenure.
- Show a configurable, weighted score and its factor contributions.
- Analyze user-entered credit profile indicators and provide general recommendations.
- Calculate EMI and total interest in real time.
- Provide optional AI financial education through a server-side Anthropic API request.
- Store analysis data only after explicit user consent and server-side Google Sheets configuration.
- Keep the interface responsive, accessible, and free of required frontend frameworks.

## Features

- Five-step loan form with native input validation and transparent estimate output.
- Credit score categories: Poor, Fair, Good, Very Good, Excellent.
- EMI calculator with principal/interest chart.
- Claude financial advice form with sensitive-pattern checks, timeout, and user-visible errors.
- Consent-gated Google Sheets append endpoint.
- Local recent history stores only compact summary figures, not personal form inputs.
- Reset, text download, share/copy, and clear local summaries controls.
- Mobile menu, keyboard focus states, semantic labels, and reduced-motion support.
- Configurable scoring weights and EMI capacity ratio in `finance.js`.

## Technology stack

- HTML5, CSS3, vanilla JavaScript
- Node.js built-in HTTP/crypto modules; no npm runtime dependencies
- Anthropic Messages API, called only by a server-side function
- Google Sheets API using a server-side service-account JWT grant
- Vercel Node.js functions or Netlify Functions deployment adapters

## System architecture

```text
Browser (HTML/CSS/JavaScript)
  ├── finance.js: local calculations and validation
  ├── POST /api/financial-advice
  │     └── Vercel/Netlify server function → Anthropic Claude API
  └── POST /api/save-analysis (explicit consent required)
        └── Vercel/Netlify server function → Google OAuth → Google Sheets API
```

The browser does not receive provider credentials. The Claude endpoint sends only the question, not loan form values or identity fields. The Sheets endpoint independently recalculates the estimate on the server and writes a minimal set of financial fields after consent.

## Workflow

```text
Landing page → Select a tool → Validate inputs
  → Calculate an estimate or credit indicators in browser
  → Display explanation and required disclaimer
  → Optional: request AI education via server API
  → Optional: consent and save a minimal analysis record to Sheets
```

## Modules

### Loan affordability estimate

The estimator uses these default configurable weights (sum = 100%):

| Factor | Weight |
|---|---:|
| Credit score | 30% |
| Income | 25% |
| Existing debt-to-income | 20% |
| Employment duration/type | 15% |
| Age | 10% |

Monthly disposable income is `income - existing EMI - other debt obligations - monthly expenses`. Estimated EMI capacity is 35% of positive disposable income. The estimator calculates the requested loan EMI at an illustrative 10.5% annual rate and computes the loan principal supported by the estimated EMI capacity at that same rate and selected tenure. These configurable assumptions are educational, not lender underwriting rules.

The estimate returns **Likely Eligible**, **Possibly Eligible**, or **Needs Improvement**. The weighted score and affordability comparison both affect the label. `finance.js` is shared with the backend so validation and the optional stored estimate are recalculated server-side.

### Credit score analyzer

Input score ranges: 300–549 Poor; 550–649 Fair; 650–749 Good; 750–799 Very Good; 800–900 Excellent. Utilization, missed payments, history, inquiries, active loans, and cards add context and general guidance. Credit bureau and lender models vary.

### EMI calculator

For principal `P`, monthly rate `r` (annual rate / 12 / 100), and `n` monthly installments:

`EMI = P × r × (1 + r)^n / ((1 + r)^n − 1)`

At 0% interest, EMI is `P / n`. Total interest is total payments minus principal. The donut chart is generated using CSS; no chart package is required.

### AI financial advice

The browser sends only the question to `/api/financial-advice`. The server calls Anthropic using `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL`. The route rejects common credential and identifier patterns, limits prompt size, applies a timeout, and returns generic provider errors. If credentials are absent, the route returns a clear 503 response; it does not generate a fake response.

### Google Sheets storage

The user must opt in with the consent checkbox and click **Save with consent**. The server validates the supplied numerical inputs and recalculates the result. It appends timestamp, random reference, age, income, employment type/duration, obligations, monthly expenses, requested loan/tenure, credit score, existing loan count, estimate score/category, EMI, debt ratio, and estimated maximum amount. It does not send name or city. It never stores passwords, OTPs, card details, PINs, CVV, or authentication secrets.

The target spreadsheet must have an `Analyses` tab (or configure another `GOOGLE_SHEETS_RANGE`). Grant the configured service account editor access to that spreadsheet. Google Sheets is a project/demo data store; production systems should use a dedicated database with access controls, retention policies, audit logging, encryption, and regulatory review.

## Data storage and privacy

- Personal fields remain in the current page session and are not automatically written to local storage.
- Local recent history stores score, category, estimated amount, debt ratio, and timestamp only. Use **Clear local summaries** to remove these records.
- AI requests include only a question. Do not put names, contact details, identifiers, financial account numbers, or credentials in prompts.
- Sheets writes require explicit consent and configured server credentials.
- HTTPS should be enabled on deployments. Do not commit `.env` files or expose secrets in HTML/JS.
- Configure retention, deletion, privacy notices, and applicable data protection rules before real-user deployment.

## Project structure

```text
.
├── index.html
├── style.css
├── script.js
├── finance.js
├── api/
│   ├── financial-advice.js
│   └── save-analysis.js
├── netlify/
│   └── functions/
├── tests/
├── dev-server.js
├── package.json
├── vercel.json
├── netlify.toml
└── .env.example
```

## Run locally

Requirements: Node.js 20 or later. No package install is needed.

```powershell
npm start
```

Open `http://localhost:3000`. The calculation modules work without credentials. The AI and Sheets endpoints intentionally return a configuration error until their corresponding server environment variables are set.

To enable integrations locally, set secrets in the current PowerShell session (do not paste credentials into source files):

```powershell
$env:ANTHROPIC_API_KEY = "your-server-side-key"
$env:ANTHROPIC_MODEL = "model-id-enabled-for-your-account"
$env:GOOGLE_SERVICE_ACCOUNT_EMAIL = "service-account@project.iam.gserviceaccount.com"
$env:GOOGLE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----`n...`n-----END PRIVATE KEY-----`n"
$env:GOOGLE_SHEETS_SPREADSHEET_ID = "spreadsheet-id"
$env:GOOGLE_SHEETS_RANGE = "Analyses!A1"
npm start
```

The private key may be set with literal `\n` sequences when provided by a host; the server converts these to line breaks. Use a restricted service account and share only the target spreadsheet with it.

## Configure Anthropic Claude

1. Create an Anthropic API key for the project.
2. Set `ANTHROPIC_API_KEY` and an account-supported `ANTHROPIC_MODEL` in the deployment's server environment.
3. Redeploy and test `/api/financial-advice`.
4. Never define these variables with a frontend/public prefix or add them to `script.js`.

## Configure Google Sheets

1. Create a Google Cloud service account and enable the Google Sheets API.
2. Create/download its private key and configure `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY` as server environment variables.
3. Share the destination spreadsheet with the service-account email as an editor.
4. Set `GOOGLE_SHEETS_SPREADSHEET_ID`; optionally set the append range (default `Analyses!A1`).
5. Test only with consenting, non-sensitive test data. Rotate the private key if it is ever exposed.

## Deploy to Vercel

1. Push this project to a Git provider and import it into Vercel.
2. Keep the project root as the deployment root. Vercel detects the `api/` Node.js functions and serves `index.html` as a static page.
3. Add only the required integration environment variables in **Project Settings → Environment Variables**. Set `ANTHROPIC_MODEL` to a model enabled for your account.
4. Redeploy after changing environment variables.
5. Verify the static page and both POST endpoints. Without configured secrets, the server endpoints should return 503, not fake success.

## Deploy to Netlify

1. Import the project and use the repository root as the publish directory.
2. `netlify.toml` publishes the root and maps the two `/api/*` routes to Node functions in `netlify/functions/`.
3. Add the same server environment variables in **Site configuration → Environment variables**, then redeploy.
4. Confirm each function endpoint and test the no-credential response before adding production secrets.

## Testing

```powershell
npm test
```

Tests cover standard and zero-rate EMI math, invalid financial inputs, weighted estimate outputs, credit score boundaries, explicit Sheets consent, and absent/misused AI configuration. Before a real deployment, also manually test responsive layouts, browser form constraints, API errors/timeouts, and properly configured test credentials.

## Limitations and future scope

This project does not connect to credit bureaus, verify submitted data, use a trained credit-risk model, or represent any bank's underwriting criteria. The eligibility score is a transparent heuristic, not a prediction of approval. It does not authenticate users or provide regulated financial advice.

Potential extensions include authentication, a secure production database, validated lender-specific models, authorized financial-data connections, lender comparisons, multilingual/voice interfaces, budget and goal tracking, repayment notifications, and downloadable PDF reports.

## College project documentation

The accompanying [PROJECT-REPORT.md](./PROJECT-REPORT.md) contains an abstract, scope, requirements, architecture, data-flow and activity diagrams, module descriptions, test plan, results, limitations, and conclusion.
