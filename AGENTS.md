# Role

You are the AI agent for the **Assessment** project. Work pragmatically: preserve task intent, minimize risk, and avoid overengineering.

Project scope:

- Employee assessment platform
- Telegram MiniApp
- Admin Panel
- Backend
- Telegram Bot

# Core Rules

- MUST write everything in English:
  - Responses
  - Code comments
  - Documentation
  - Commit texts

- MUST understand the task context and the target module before making changes.
- DO use simple, predictable solutions.
- AVOID assumptions:
  - If risk is high, ask.
  - Otherwise choose the safest minimal option.
- PRESERVE existing architecture, layering, and project patterns.
- Prefer editing existing files over creating new ones.
- Prefer consistency over cleverness.

# Project Context

Monorepo structure:

- `backend/` — Node.js/Express + MySQL
- `frontend/` — Telegram MiniApp (Vue 3)
- `admin-frontend/` — Admin Panel (Vue 3)
- `bot/` — Telegram bot (Telegraf)
- `docs/` — standards, contracts, requirements

Primary source-of-truth documents:

- `docs/engineering/architecture.md`
- `docs/engineering/code-standards.md`
- `docs/engineering/api-guidelines.md`
- `docs/engineering/components.md`
- `docs/openapi.yaml`
- `TASKS.md`

# Workflow

1. Before starting, MUST read relevant sections in:
   - `docs/`
   - `docs/engineering/`
   - `TASKS.md`

2. Identify:
   - affected module
   - affected layer

3. Check whether existing:
   - components
   - services
   - composables
   - repositories
     can be reused before creating new ones.

4. Make only necessary changes:
   - no extra files
   - no speculative abstractions
   - no unnecessary refactoring

5. Before starting a service, verify that no equivalent process is already running.
   Never start duplicate services/processes.

6. Before finishing:
   - run the quality checklist
   - update `TASKS.md` if needed

# Architecture Rules

Backend MUST follow MVC + Layered architecture:

```text
Routes -> Controller -> Service -> Repository -> Database
```

Reverse dependencies are FORBIDDEN.

Preferred backend module structure:

```text
module/
├── index.js
├── routes.js
├── controller.js
├── service.js
├── repository.js
├── validators.js
└── mapper.js
```

Rules:

- Cross-module imports MUST go through public `index.js`.
- Direct imports of internal module files are FORBIDDEN.
- SQL access MUST exist only in Repository layer.
- Business logic MUST exist only in Service layer.
- Validation MUST happen before Service execution.
- Controllers SHOULD remain thin.
- Repository layer MUST NOT contain business rules.
- Services MUST NOT depend on HTTP framework objects directly.

# Frontend Architecture Rules

Frontend and Admin Frontend MUST use:

- Vue 3 Composition API (`<script setup>`)
- Pinia
- composables

Preferred frontend structure:

```text
src/
├── views/
├── components/
├── composables/
├── stores/
├── api/
├── utils/
└── constants/
```

Rules:

- Avoid placing business logic directly inside components.
- Composables SHOULD encapsulate reusable stateful logic.
- API calls SHOULD be centralized and reusable.
- Reuse existing UI patterns before introducing new components.
- Prefer existing components before creating new ones.
- For new UI work, align with:
  - existing admin-frontend components
  - `docs/engineering/components.md`

# Code Standards

- MUST use UTF-8 for all files.
- MUST preserve current line endings and file encoding.
- NEVER write files in:
  - ANSI
  - ASCII
  - CP1251
  - CP1252

PowerShell rules:

- MUST explicitly use UTF-8 (`-Encoding UTF8`)
- On Windows save as UTF-8 without BOM

Use:

```powershell
[System.IO.File]::WriteAllText(..., [System.Text.UTF8Encoding]::new($false))
```

Additional rules:

- Files over 500 lines SHOULD be split by responsibility.
- Components — PascalCase
- Variables/functions — camelCase
- Constants — UPPER_SNAKE_CASE

Comments are allowed only for:

- complex logic
- workarounds
- TODO/FIXME/HACK notes

Avoid:

- redundant comments
- obvious comments
- commented-out code

# Error Handling Rules

- Async errors MUST be handled explicitly using `try/catch`.
- Errors returned to users MUST be user-friendly.
- Internal logs MAY contain technical details.
- Never expose:
  - passwords
  - tokens
  - keys
  - secrets
  - sensitive personal data

Validation rules:

- Input validation is mandatory.
- Never trust client input.
- Validate:
  - body
  - params
  - query
  - headers where applicable

# API & Data Rules

- Validate HTTP contracts against:
  - `docs/openapi.yaml`
  - `docs/engineering/api-guidelines.md`

- Avoid:
  - N+1 queries
  - redundant loading
  - overfetching

Use:

- batching
- pagination
- caching where appropriate

Database rules:

- Prefer explicit column selection over `SELECT *`.
- Large queries MUST consider indexing and execution cost.
- Pagination is required for potentially large datasets.

# Database & Migration Rules

- NEVER modify old migrations already applied in shared environments.
- Every schema change MUST use a new migration.
- Avoid destructive migrations unless explicitly required.
- Database changes MUST preserve backward compatibility when practical.
- Migration files MUST remain deterministic and repeatable.

# Testing Rules

- Reuse existing testing patterns before introducing new ones.
- Unit tests SHOULD cover critical business logic.
- Integration tests SHOULD be added for complex API flows.
- Avoid excessive mocking when real behavior can be tested safely.
- Do not create brittle snapshot-heavy tests.
- Frontend components with complex interaction SHOULD have test coverage.
- Bug fixes SHOULD include regression protection when practical.
- If tests are intentionally skipped, explain why.

# Performance Rules

- Avoid unnecessary re-renders.
- Avoid duplicate requests.
- Avoid unnecessary database queries.
- Prefer predictable performance over premature optimization.
- Lazy load heavy frontend modules when practical.
- Use memoization/caching only when justified.

# Logging & Monitoring Rules

- Logs MUST be meaningful and actionable.
- Use error-level logging only for real failures.
- Avoid noisy logs in production.
- Include contextual identifiers where useful.
- NEVER log:
  - secrets
  - passwords
  - tokens
  - authentication headers

# Refactoring Rules

- Refactoring MUST preserve existing behavior unless explicitly requested.
- Avoid large rewrites during unrelated tasks.
- Prefer incremental improvements.
- Do not introduce abstractions without repeated usage or clear benefit.
- Reduce complexity carefully without causing architecture churn.

# Environment & Secrets Safety

- NEVER commit `.env` files.
- NEVER expose secrets in logs or responses.
- NEVER overwrite existing environment configuration without explicit instruction.
- Production configuration MUST remain isolated from development configuration.
- Secrets MUST be loaded from environment configuration only.

# API Versioning Rules

- Avoid breaking existing API contracts.
- Breaking changes MUST be documented explicitly.
- Response formats SHOULD remain backward compatible whenever possible.
- Validate API changes against `docs/openapi.yaml`.

# TASKS.md Rules

- Keep only active work in `TASKS.md`.
- Use checklist format:
  - `[ ]`
  - `[x]`

- Remove:
  - completed items
  - completed sections

- If no tasks remain, clear the file.
- Keep task descriptions short and actionable.

# Dependency Rules

Before installing any library, MUST:

1. Ask user permission.
2. Explain briefly why it is needed.
3. Verify that no existing project alternative already covers the need.

Rules:

- NEVER install dependencies "just in case".
- Prefer existing project dependencies.
- Avoid introducing overlapping libraries.
- Prefer lightweight dependencies.

# Git & Branch Safety

- NEVER rewrite shared branch history.
- NEVER force-push without explicit instruction.
- Keep changes focused on task scope.
- Avoid unrelated formatting-only changes.
- Avoid mixing refactoring with feature implementation unless necessary.

# Commit Rules

- Commit text MUST be in English.
- Conventional Commits are FORBIDDEN:
  - `feat:`
  - `fix:`
  - etc.

Commit messages MUST:

- describe the result
- be concise
- reflect business outcome

Commit messages MUST NEVER include:

- file paths
- endpoints
- entity names
- table names
- migrations
- low-level technical details

If the user asks for a commit:

- provide commit text in chat
- DO NOT run `git commit`

# Definition of Done

A task is considered complete only if:

- The implementation matches task intent.
- Existing functionality is preserved.
- Layer boundaries are preserved.
- Validation and error handling are implemented.
- No debug logs remain.
- No duplicated logic was introduced.
- Documentation is updated if behavior changed.
- TASKS.md is updated accordingly.
- The solution follows existing project conventions.

# AI Agent Behavioral Constraints

- Prefer editing existing files over creating new ones.
- Prefer existing project utilities over new helpers.
- Do not introduce new architecture patterns without explicit need.
- Do not rename files, folders, or interfaces unnecessarily.
- Avoid speculative improvements outside task scope.
- When uncertain, choose the safest minimal implementation.
- Do not overengineer.
- Do not optimize prematurely.
- Do not introduce "future-proof" abstractions without evidence.

# Pre-Commit Checklist

- No debug `console.log`
- No unused imports
- No unused code
- No duplicated logic
- Errors are handled
- Input validation exists
- Layer boundaries are preserved
- Documentation updated if required
- No secrets exposed
- No unrelated changes included

# Do Not

- NEVER auto-commit without explicit request.
- NEVER install dependencies without approval.
- NEVER create unnecessary files or abstractions.
- NEVER break architecture without strong justification.
- NEVER run duplicate services/processes.
- NEVER bypass validation layers.
- NEVER place SQL outside repositories.
- NEVER place business logic inside controllers.
- NEVER expose internal implementation details to users.
- NEVER silently change API contracts.
