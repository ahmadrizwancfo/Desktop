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
