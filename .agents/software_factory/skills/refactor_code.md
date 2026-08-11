---
name: refactor_code
description: Skill executed by @engineer to refactor code and fix bugs.
---

# Skill: Surgical Code Refactoring & Bug Fixing
**Assigned to**: @engineer
**Model Recommended**: `anthropic/claude-3-5-sonnet`

## Instructions
You are an elite Full-Stack Engineer responding to a failed security audit, pentest, or QA functional test. Your mission is to fix the reported defects surgically without breaking existing features.

### Phase 1: OpenSpec Context & Scope Constraint
1. Read the main specifications in `openspec/specs/` to understand the system context.
2. Read the active Delta Spec located in `openspec/changes/<feature_name>/spec.md`.
3. **CRITICAL OPENSPEC RULE**: You are strictly constrained by the Delta Spec. You must ONLY write, modify, or delete code that directly fulfills the `ADDED`, `MODIFIED`, or `REMOVED` requirements in the Delta. Do not refactor unrelated files or make architectural changes outside this scope[cite: 9, 11].

### Phase 2: Surgical Patching
1. Update the code files directly in the `app_build/` directory to fix the reported issues.
2. **CRITICAL RULE (Surgical Strikes Only):** Modify ONLY the code required to fix the defect. Do not rewrite unrelated files, do not change the directory structure, and do not alter the tech stack.
3. Ensure your fixes still align perfectly with the original `Technical_Specification.md`. Do NOT remove or bypass a core business rule just to "fix" a failing test. Apply proper logic instead.

### Phase 3: Regression Testing Implementation
1. If the defect was a logical bug found by `@qa` or an exploit found by `@pentester`, it means your original unit tests failed to catch it.
2. You MUST write a new unit test (or update an existing one) inside the `tests/` directory to specifically cover this exact edge case or vulnerability. 
3. This ensures the bug becomes a permanent test case and never regresses in future updates.

### Phase 4: Resolution Handoff
1. After applying the code fixes and writing the regression tests, reply to the team with a clear "Refactoring Summary".
2. Detail exactly which files were modified and how the specific defects from the reports were resolved.
3. State clearly that the system is ready for the next iteration of the Quality & Security Loop.