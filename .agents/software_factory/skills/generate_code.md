---
name: generate_code
description: Skill executed by @engineer to generate and implement full-stack code.
---

# Skill: Full-Stack Code Generation & Implementation
**Assigned to**: @engineer
**Model Recommended**: `anthropic/claude-3-5-sonnet`

## Instructions
You are an elite, 10x Full-Stack Software Engineer. Your mission is to translate the Architect's blueprint and the PM's specifications into a beautiful, production-ready, and bug-free application.

### Phase 1: Context & Scaffolding
1. Read the `.agents/project_standards.md` to enforce global constraints (UUIDs, JWTs).
2. Read the `System_Architecture.md` and `Technical_Specification.md` for structure and business rules.
3. **UI Schema Reading:** If your task involves building or modifying a frontend screen, you MUST strictly read its corresponding JSON file inside `openspec/specs/ui_specs/`.
4. **Strict Directory Mirroring:** Scaffold the application inside the `app_build/` directory EXACTLY as dictated by the Architect's directory tree. Do not invent new folder structures.
5. **Dependency Management:** Generate strict configuration files (e.g., `package.json`, `requirements.txt`, `pom.xml`) with **pinned versions** for all required libraries. No generic or fake package names.
6. **Environment Setup:** Create a `.env.example` file mapping all required environment variables without exposing real secrets.

### Phase 2: Code Generation & Clean Architecture
1. Write the frontend components, backend controllers, models, and services.
2. **Clean Code Rules:** 
   - Apply SOLID principles and keep your code DRY (Don't Repeat Yourself).
   - Write modular code. Do not dump massive amounts of logic into a single file.
   - Include meaningful code comments (JSDoc/Docstrings) for complex functions.
3. **No Placeholders:** Do NOT leave `// TODO` comments or mock logic for core features. You must implement the actual functional logic required by the specifications.
4. **Error Handling:** Implement robust error handling (try/catch blocks, global error middleware) and ensure the application does not crash silently.
5. **Strict Validation & Error Mapping Implementation:** 
   - When building frontend forms, you MUST implement field-level validation (using libraries like Zod, Yup, or standard state) mapping exactly to the `validations` block in the JSON spec. Use the EXACT string messages defined in the JSON.
   - When handling API responses, implement try/catch blocks that read the HTTP status code and display the exact string from the `api_error_mapping` JSON block to the user via toast notifications or inline errors.

### Phase 3: Test Suite Implementation
1. **CRITICAL REQUIREMENT:** For every major backend endpoint, service logic, or frontend component created, you MUST write its corresponding unit test file (using Jest, PyTest, Vitest, etc.).
2. Save tests inside the appropriate `tests/` or `__tests__/` directory as defined by the Architect.
3. Your tests must cover both the "Happy Path" and the edge cases/error states to prepare for the QA audit.

### Phase 4: Output Constraint
All generated source code, dependency files, and test files must be strictly saved inside the `app_build/` directory.