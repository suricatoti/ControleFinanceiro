---
name: generate_documentation
description: Skill executed by @architect to generate system documentation and update the wiki.
---

# Skill: System Documentation and Architecture Wiki
**Assigned to**: @architect
**Model Recommended**: `google/gemini-1.5-flash`

## Instructions
1. Review the finalized `app_build/` directory, the security reports, and the initial technical specifications.
2. For each of the technical domains listed below, check if the corresponding Markdown file already exists inside the `docs/` directory.
3. If the file **does NOT exist**, create it with a professional, comprehensive structure.
4. If the file **DOES exist**, review its content and update it incrementally to match the newly generated system architecture and features without removing valid legacy definitions.

## Documentation Domains & Target Files

### 🗄️ 1. Database Architecture
- **Target File**: `docs/database_design.md`
- **Content**: Detailed database schema, used tables/collections, field types, data relationships (ERD representation in text/mermaid), indexing strategies, and data retention rules.

### 🔌 2. API Reference & Contracts
- **Target File**: `docs/api_reference.md`
- **Content**: Available endpoints, HTTP methods, request headers, required payloads (JSON schemas), response formats (success/error codes), and authentication/authorization mechanisms.

### 🎨 3. Frontend Architecture & User Flows
- **Target File**: `docs/frontend_guide.md`
- **Content**: Overview of the user interface architecture, state management patterns, component tree, design system/UI library used, and text-based description of critical user flows (navigation, page redirections, form wizard states).

### 🧪 4. Testing Strategy & Unit Coverage
- **Target File**: `docs/testing_strategy.md`
- **Content**: Documentation of frontend and backend testing frameworks, setup and configurations for tests, list of unit and integration test suites created by the `@engineer`, mock data strategies, and instructions on how to run test suites locally.

### 🛡️ 5: OpenSpec Archive & Consolidation
1. Once the `@qa` and `@secdevops` have passed the code with ZERO DEFECTS, you must consolidate the OpenSpec files.
2. Read the active Delta Spec from `openspec/changes/<feature_name>/spec.md`.
3. Intelligently merge the `ADDED`, `MODIFIED`, and `REMOVED` rules from the Delta Spec into the main source of truth files located in `openspec/specs/`.
4. After merging, move the entire `<feature_name>` folder from `openspec/changes/` to `openspec/archive/` to maintain the historical audit trail.

### 🏗️ 6. System Components & Folder Structure
- **Target File**: `docs/system_architecture.md`
- **Content**: High-level architecture design patterns applied (e.g., MVC, Clean Architecture), modular components overview, external service integrations, and an explanation of the `app_build/` folder tree structure.

### 🚀 7. Setup & Deployment Guide
- **Target File**: `docs/setup_guide.md`
- **Content**: Prerequisites, environment variables required (`.env` templates), step-by-step local installation/startup commands, testing instructions, and deployment pipelines.