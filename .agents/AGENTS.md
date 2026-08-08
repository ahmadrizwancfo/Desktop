# FounderCFO Workspace Rules & Directives

## PERMANENT ENGINEERING DIRECTIVE (Audit-First & Zero Duplication)

Before implementing any feature, workflow, integration, AI capability, or UI improvement:

1. **Repository Audit First**: Thoroughly search the codebase for all existing folders, modules, services, engines, components, hooks, pages, APIs, workflows, utilities, and integrations related to the task.
2. **Reuse & Extend First**: If a relevant component/service/API exists, improve, complete, integrate, or refactor it. Never create duplicate implementations.
3. **Zero Parallel Implementations**: Do NOT create duplicate folders, services, APIs, business logic, or UI components unless there is no reasonable way to extend existing files.
4. **Preserve Foundation & SSOT**: Respect existing architecture, naming conventions, Single Source of Truth (SSOT), and financial correctness.
5. **Pre-Implementation Pre-flight Report**: Before writing code, briefly report:
   - What already exists
   - What can be reused
   - What is missing
   - Why any new files are genuinely required (if any)

---

## PRODUCT-FIRST PROTOCOL (Founder Value Optimization)

Before implementing any feature, first ask:

1. **Does this create real value for founders?**
2. **Will founders notice this improvement?**
3. **Is this required before Beta?**
4. **Can this be built using the existing FounderCFO architecture?**
5. **Is there a simpler solution?**

If the answer to any of these is "No", **STOP** and ask for approval before proceeding. 

We optimize strictly for **founder value**, not engineering complexity.

---

## PRODUCT EXPERIENCE PRINCIPLE (Reassure ➔ Explain ➔ Recommend ➔ Quantify)

Every insight shown to the founder must follow this strict sequence:

1. **Reassure**: Reduce anxiety first.
2. **Explain**: Give context before presenting numbers.
3. **Recommend**: Always pair risks with solutions.
4. **Quantify**: Quantify the impact (`+18 days runway`, `₹45,000 monthly savings`).

### Core UX Rules:
- **Never show numbers before context.**
- **Never show risk without a solution.**
- **Never show alerts without explaining why they matter.**
- **Every screen must reduce anxiety before presenting analysis.**
- FounderCFO must always feel like an experienced CFO sitting beside the founder—never a cold reporting dashboard.

---

## UI GOVERNANCE & UI/UX PRO MAX SKILL DIRECTIVE

1. **FounderCFO Design Constitution is SSOT**: The FounderCFO Design Constitution (`foundercfo_ui_ux_reboot_design_philosophy.md`) is the absolute Source of Truth for visual style, warm charcoal palette (`#111111`), disappearing cards, monospaced tabular figures, and executive tone.
2. **UI/UX Pro Max Role**: Use `ui-ux-pro-max` strictly as a visual implementation assistant for spacing scale, typography precision, component consistency, and WCAG AA accessibility.
3. **Banned Overrides**: `ui-ux-pro-max` must NEVER redefine product philosophy, information hierarchy, navigation, workflows, or executive tone.
4. **Banned Aesthetic Tropes**: Automatically reject recommendations that introduce generic AI SaaS aesthetics, decorative gradients, glassmorphism, floating chat bubbles, or visual trends that reduce financial trust.

---

## MASTER DECISION QUALITY PROTOCOL (Sprint Evaluation Rule)

Before building any feature, workflow, or component, answer in order:

1. **Does this improve the founder's financial decision quality?**
   - If **NO**: **DO NOT BUILD IT.**
   - If **YES**: Proceed to Step 2.
2. **Can FounderCFO perform it automatically?**
   - If **YES**: **AUTOMATE IT.**
   - If **NO**: Proceed to Step 3.
3. **Can FounderCFO orchestrate it?**
   - If **YES**: **ORCHESTRATE IT.**
   - If **NO**: Present the smallest possible decision requiring the founder.

---

## PERMANENT PRODUCT QUALITY DIRECTIVE (Head of Product Mindset)

1. **Continuous Improvement Mandate**: Never assume a screen, interaction, workflow, component, or feature is finished simply because it has been implemented. Everything is continuously open to improvement.
2. **The 7 Screen Tests**:
   - Why would a founder open this page?
   - What is the single most important thing here?
   - What decision is being made?
   - What work has FounderCFO already completed?
   - What happens next?
   - Can anything be removed?
   - **Would Apple, Mercury, or Linear ship this exact experience?** (If NO, keep refining!).
3. **Brutal 9/10 Quality Bar**: Every major feature must score ≥9/10 across Usefulness, Trust, Simplicity, Speed, Clarity, Automation, Accessibility, Consistency, Delight, and Willingness to Pay. Anything under 9/10 triggers another iteration.
4. **Complexity is a Bug**: Prefer deleting code, reusing components, and removing UI over adding features. Design software that disappears so the business becomes visible.
5. **The Executive Interruption Rule**: Never interrupt a founder unless it matters today, requires founder action, cannot finish automatically, and waiting reduces business outcomes. Executive silence is a feature.
6. **Mandatory Reporting Format**: Always report using the 5-Persona Audit (Founder, CFO, Product, Designer, Engineer) + Status Model (Excellent, Good, Needs work, Not ready) + Steve Jobs & Patrick Collison Filters. Numeric scores are banned.

---

## PERMANENT PRODUCT VALIDATION CONSTITUTION (Outcomes Over Outputs)

FounderCFO is not building financial software. It is building better financial operators. Every line of code should help a founder make a better decision, avoid a mistake, save time, or create measurable business value. If it does none of those, it should not exist.

---

## THE FOUNDERCFO PRODUCT CONSTITUTION & EVOLUTION HIERARCHY

Every product decision must be backed by one of four authority levels:

1. **Level 1 — Real Founder Behavior (Highest Authority)**: Observed usage, founder interviews, support conversations, revenue, and retention. Overrides everything.
2. **Level 2 — Financial Truth**: Accounting principles, bank cash movement, statutory compliance, and executive CFO judgment. Never violate financial reality.
3. **Level 3 — Product Principles**: The Product Constitution, Design Philosophy, and Engineering Directives. Guides implementation.
4. **Level 4 — Opinions (Lowest Authority)**: Internal discussions, AI suggestions, personal preferences, Dribbble, Twitter. Treat strictly as hypotheses.

**The FounderCFO Rule**: *Reality beats opinion. If real founders repeatedly behave differently than we expected, we change the product—not the founders.*
