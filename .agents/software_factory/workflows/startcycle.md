---
description: Autonomous Software Factory Cycle (Spec-Driven)
---

**Trigger**: `/startcycle`

---

## 🧹 PRE-CYCLE CONTEXT RESET
> **`🧹 /clear` Directive**: Automatically purge previous conversation history before initializing a new software factory cycle. This guarantees a 100% clean context window, eliminates token bloat from past tasks, and prevents hallucinations from stale conversation state.

---

## Phase 1: Design, Specification & Architecture (Propose)
1. **@pm** executes `skills/write_specs.md` based on the user's prompt.
    - *Context Optimization*: If the user prompt is underspecified or ambiguous, **@pm** invokes **`💬 /grill-me`** mode to run an interactive interview with the user.
    - *OpenSpec Action*: Reads `openspec/specs/` and creates a **Delta Spec** (`openspec/changes/delta_xxx.md`) detailing exactly what will be added, modified, or removed.
    - 🛑 **[HUMAN-IN-THE-LOOP]**: Execution PAUSES here. User MUST read and approve the Delta Spec.
2. **@designer** executes `skills/generate_assets.md`.
    - *Action*: Injects color palettes, style tokens, and generates/maps visual assets based on the Delta Spec.
3. **@architect** executes `skills/design_architecture.md`.
    - 🛑 **[HUMAN-IN-THE-LOOP]**: Execution PAUSES here for user to approve the Tech Stack and Design Pattern.

---

## 📦 PHASE TRANSITION COMPACTION
> **`📦 /compact` Directive**: Execute context compaction before moving to Phase 2. Summarizes Phase 1 discussions into a lightweight summary containing ONLY the approved Delta Spec, Design Tokens, and Architecture Blueprint. This frees up maximum token headroom for Phase 2 code generation.

---

## Phase 2: Implementation (Apply)
4. **@engineer** executes `skills/generate_code.md`.
    - *OpenSpec Constraint*: The engineer is strictly locked to the approved Delta Spec. They scaffold the app, write code, and build unit tests inside `app_build/` mapping ONLY to the approved changes.

---

## Phase 3: Quality & Security Loop (Validate)
> **`🎯 /goal` Autonomous Execution Mode**: Enable autonomous multi-step loop execution. The system will iterate through security auditing, QA validation, and surgical bug refactoring without requiring human approval at every step until 100% test passing is achieved.

5. **@secdevops** executes `skills/security_code_audit.md` (SAST & Auto-patching).
6. **@qa** executes `skills/audit_code.md` (Functional checks & Edge cases).
    - *Validation Check*: @qa evaluates the code explicitly AGAINST the acceptance criteria in the Delta Spec.

### [CRITICAL CHECK] Validation Gate
- **IF** @qa or @secdevops finds ANY errors, bugs, or vulnerabilities:
    - **THEN** **@engineer** executes `skills/refactor_code.md` (Surgical fixing).
    - *OpenSpec Constraint*: @engineer ONLY alters code related to the specific bug reported. No global refactoring allowed.
    - *Context Management*: If the loop repeats more than 2 times, trigger **`📦 /compact`** to compress past test logs and retain only active defect reports.
    - **CIRCUIT BREAKER**: If the exact same bug persists for 3 consecutive loops, **PAUSE** execution and ask the human user for manual intervention.
    - **GOTO** Step 5 (Repeat the validation loop).
- **ELSE**:
    - **PROCEED** to Phase 4.

---

## Phase 4: Offensive Security
7. **@pentester** executes `skills/execute_pentest.md` to simulate advanced black-box attacks.
    - **IF** @pentester breaks the system or finds a critical exploit:
        - **THEN** **@engineer** executes `skills/refactor_code.md` specifically to patch the PoC exploit.
        - **GOTO** Step 5 (Re-verify the entire pipeline).

---

## Phase 5: Knowledge Consolidation (Archive)
8. **@architect** executes `skills/generate_documentation.md`.
    - *OpenSpec Action*: Compiles/updates the living technical wiki inside `docs/`. 
    - *Consolidation*: **Merges** the approved Delta Spec into the main `openspec/specs/` folder and moves the temporary Delta file to `openspec/archive/`.
    - **`🧠 /learn` Directive**: Extract newly discovered edge cases, bug fixes, or security guidelines from this cycle and append them to `.agents/project_standards.md` to prevent recurrence in future cycles.
9. **@engineer** executes the necessary terminal commands inside the `app_build/` directory to install dependencies and START/RESTART the application.
10. **System** outputs a final success message along with the cumulative token consumption summary across all agents:
    - "✅ **Cycle Complete!** Feature implemented, audited, tested, and archived."

---

## 📊 CUMULATIVE TELEMETRY REPORT SCHEMA
Each agent step must output its telemetry block:

| Phase | Agent | Model Used | Est. Input Tokens | Est. Output Tokens | Est. Total Tokens |
|-------|-------|------------|-------------------|--------------------|-------------------|
| Phase 1 | `@pm` | google/gemini-1.5-flash | ~3,500 | ~850 | ~4,350 |
| Phase 1 | `@designer` | google/gemini-1.5-flash | ~2,800 | ~600 | ~3,400 |
| Phase 1 | `@architect` | anthropic/claude-3-5-sonnet | ~5,200 | ~1,200 | ~6,400 |
| Phase 2 | `@engineer` | anthropic/claude-3-5-sonnet | ~14,500 | ~3,200 | ~17,700 |
| Phase 3 | `@secdevops` | google/gemini-1.5-pro | ~18,000 | ~1,500 | ~19,500 |
| Phase 3 | `@qa` | google/gemini-1.5-flash | ~6,000 | ~900 | ~6,900 |
| Phase 4 | `@pentester` | anthropic/claude-3-5-sonnet | ~12,000 | ~1,800 | ~13,800 |
| Phase 5 | `@architect` | anthropic/claude-3-5-sonnet | ~4,500 | ~1,100 | ~5,600 |