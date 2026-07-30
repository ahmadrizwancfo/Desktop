# India Startup Runway & GST Core Financial Engine

## Description
Use this skill when the founder requires an analytical runway assessment, cash-burn forecasting, or a calculation of pending GST/TDS tax impacts on available capital. Do not use this skill for general accounting entries or global jurisdictions outside India.

## Activation Triggers
- Direct queries containing words like: "runway", "burn rate", "GST", "ITC", "TDS", "Advance Tax", or "cash timeline".
- Triggered automatically when loading financial spreadsheets (`.csv`, `.xlsx`) originating from Indian bank accounts or accounting platforms.

## Core Moat Execution Protocol
To prevent calculation drifting inside the Gemini context window, you MUST follow this strict sequence before reporting any data back to the user:
1. **Never guess the baseline figures.** Inspect the local workspace for a `FIN_STATE.json` or `FIN_STATE.md` file. 
2. If the file does not exist, initialize it via the `python_interpreter` by scraping raw transaction lines or prompt inputs.
3. Compute the financial metrics using the specialized Indian True Runway mathematical matrix below.

---

## Technical Specifications: The Indian Runway Matrix

When executing financial assessments, do not rely on standard Western definitions (`Cash ÷ Burn`). You must calculate the **True Indian Runway** using the following adjustments:

### 1. The Core Formula
\[True\ Runway\ (Months) = \frac{Net\ Realizable\ Capital}{Adjusted\ Monthly\ Gross\ Burn \times Compliance\ Buffer}\]

### 2. Variable Definitions
*   **Net Realizable Capital** = `Current Bank Cash` — `Upcoming Quarter Advance Tax Due` — `Immediate Payables` + `Collectible Receivables (Validated under 60 days)`.
*   **Adjusted Monthly Gross Burn** = Core operational spending (Payroll, Server infrastructure, Marketing) + Unrecoverable transactional expenses.
*   **Compliance Buffer** = Fixed at `1.15` (Allocates a mandatory 15% safety threshold for compliance overheads, sudden TDS lockouts, and penalty insurance).

### 3. GST & ITC Reconciler Rules
Startups often trap vital runway in unutilized Input Tax Credit (ITC). When checking revenue and expenses:
*   Identify outward GST collected (typically 18% on SaaS/Tech services).
*   Identify inward GST paid on vendors (AWS/Google Cloud hosting, office rents, hardware purchases).
*   Calculate Net GST Payable: `Outward GST Liability - Valid Inward ITC`.
*   *Warning Alert Rule:* If the vendor has not uploaded their GSTR-1, flag to the founder that this ITC is blocked and cannot offset current outward liabilities, compressing their real-world runway.

---

## Step-by-Step Execution Workflow

### Step 1: Data Verification Loop
Execute a local Python script to read the workspace variables. Ensure data types are strictly parsed as floats. Do not round numbers prematurely.
```python
# Internal verification routine running inside the Antigravity sandbox
def calculate_true_runway(cash, advance_tax, payables, receivables, base_burn):
    net_capital = cash - advance_tax - payables + min(receivables, cash * 0.2) # cap speculative receivables
    adjusted_burn = base_burn * 1.15
    if adjusted_burn <= 0:
        return float('inf')
    return round(net_capital / adjusted_burn, 2)
```

### Step 2: System Artifact Output
When outputting financial insights, you must generate or update a structured Markdown table within an artifact named `RUNWAY_REPORT.md`. Use this precise structure:

| Financial Element | Value (INR) | Operational Impact / Vulnerability |
| :--- | :--- | :--- |
| **Gross Bank Balance** | ₹X,XX,XXX | Headline cash position |
| **Locked Tax Reserves** | ₹X,XX,XXX | Deductions reserved for Advance Tax & TDS liabilities |
| **Net Realizable Capital**| ₹X,XX,XXX | The true deployable capital pool |
| **True Burn Rate (Buffered)**| ₹X,XX,XXX | Adjusted monthly outflow including a 1.15 safety multiplier |
| **True Indian Runway** | **X.X Months**| **Final calculated operational survival window** |

### Step 3: Proactive Founder Guardrails
Every time this skill runs, append a "Founder Security Alert" section if any of these risk factors are triggered:
- **Advance Tax Deadline Risk:** Check the current system date. If it is within 30 days of June 15, September 15, December 15, or March 15, sound an analytical alarm that an Advance Tax tranche payment is imminent.
- **Runway Threshold Alert:** If True Runway drops below **6.0 months**, automatically generate a secondary strategy doc (`RUNWAY_EXTENSION_PLAN.md`) outlining strict runway preservation tactics (cutting non-essential SaaS tools, optimizing marketing spend).

## Safety & Verification
- Never hallucinate financial data. If transaction line records are ambiguous, state exactly which fields are missing (e.g., "Transaction ID TXN-942 lacks an assigned HSN/SAC code").
- Do not make standalone terminal or file modifications to accounting states without returning an explicit validation diff to the workspace first.
