# EE Knowledge v1.0.0-rc.1 Release Checklist

## Candidate

- Version: `v1.0.0-rc.1`
- Branch: `release/v1.0.0-rc.1`
- Base stable: `07c598cfa511f4dc7bfeb5b847eebb8436cabe0b`
- Previous formal release: `v0.6.0`
- Scope: final product readiness, full regression, documentation consistency and release metadata.
- New product features: None.

## Product Definition

Personal v1 follows `docs/MASTER_SPEC.md` §11: a stable, long-term, single-user electronic-information knowledge and learning system for professional study, review, interview preparation and self-hosted accumulation.

The following remain outside v1: multi-user and SaaS, AI Assistant, RAG, embeddings, vector databases, complex knowledge graphs, a dedicated interview platform, a national school database, FSRS and complex recommendations. They are `Post-v1 / Only if Needed`.

## Feature Freeze

- Only release blockers, regression corrections, documentation truth and release metadata are in scope.
- No new route, domain model, storage backend, import format, UI redesign, AI capability or synchronization protocol.
- v0.6.0 formal release artifacts remain frozen.

## Core Capability Matrix

Each status is backed by the listed verification command.

| Module | Verification source | Status |
| --- | --- | --- |
| Knowledge Foundation | `verify:demo`, `verify:content`, `verify:structure` | PASS |
| Learning Content | `verify:learning-content` | PASS |
| Quick Learn | `verify:quick-learning` | PASS |
| Review | `verify:review` | PASS |
| Practice | `verify:practice` | PASS |
| Wrong Answers | `verify:practice` | PASS |
| Statistics | `verify:statistics` | PASS |
| Authentication | `verify:auth`, `verify:runtime` | PASS |
| PWA / Mobile | `verify:pwa`, `verify:runtime` | PASS |
| Self-host | `verify:deploy`, `verify:runtime` | PASS |
| Backup / Restore | `verify:backup` | UNAVAILABLE LOCALLY (sqlite3 CLI missing; GitHub CI gate required) |
| Material Import | `verify:material-import`, `verify:content` | PASS |
| Admin / Structure | `verify:admin-query`, `verify:structure` | PASS |
| Knowledge Bundle v1 | `verify:content` | PASS |

## Product Acceptance

### Knowledge Foundation

- Course → Book → recursive Chapter → KnowledgePoint navigation
- Markdown, GFM, KaTeX, formulas, examples, relations and image abstraction
- Search, favorites, notes, study progress, admin content management and structure management
- Knowledge Bundle remains `schemaVersion = 1.0`

### Learning Loop

- Learning content includes common mistakes, mastery criteria and common questions/answers.
- Quick Learn, simple interval review, review history, objective practice grading, subjective self-rating, wrong answers and statistics are covered by the regression matrix.

### Personal Cloud and Security

- Single-user, environment-backed authentication with signed HttpOnly sessions and private-by-default routes.
- PWA/mobile navigation, safe-area spacing, touch targets and narrow layouts remain covered by static contracts.
- Linux self-host uses server-side SQLite, Native Node, systemd and Caddy; production binds to `127.0.0.1:3000`.

### Data Safety

- `db:check`, cold/live/scheduled backup, Primary retention, optional Secondary backup, SHA-256, SQLite integrity checks, restore source validation, pre-restore backup, staged restore, post-restore integrity and sidecar fail-closed behavior remain covered.
- The implementation does not claim transaction-level atomic filesystem restore or zero-loss guarantees.

### Personal Material Import

- Markdown/TXT, PDF text-layer and DOCX raw-text extraction use manual editable confirmation, source metadata and atomic create-only writes.
- No OCR, raw file persistence, automatic book splitting or learning side effects.

## Cross-AI Maintainability

The repository documents the product, current version, completed scope, architecture, database, decisions, deployment path, intentionally excluded capabilities and verification commands in `README.md`, `START_HERE.md`, `AGENTS.md`, `docs/MASTER_SPEC.md`, `docs/PROJECT_STATUS.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/DECISIONS.md` and `docs/ROADMAP.md`. A new AI can continue without chat history.

## Automated Regression

The complete `verify:*` matrix is read from `package.json` and includes the commands listed in the final report. `release:check` remains the main gate and runs the PWA, auth, deploy, backup, MVP, typecheck, lint, build and runtime checks. Verification uses disposable SQLite where the script creates a database; no personal database is seeded or restored.

## Database and Dependencies

- Prisma schema changed: No.
- New migration: No.
- Existing migration modified: No.
- Seed changed: No.
- New dependency or devDependency: None.
- Dependency version changes: None.
- Lockfile package count: `590`.

## Target Environment Boundaries

These remain manual acceptance checks and are not automated PASS claims in this environment:

- Orange Pi/RK3588: Not tested
- systemd real service: Not tested
- Caddy public HTTPS: Not tested
- Android PWA installation: Not tested
- USB/NAS: Not tested

The repository CI proves production-like preflight, localhost runtime, static systemd/Caddy templates and static PWA/mobile contracts only.

## Stable Promotion Gate

- RC PR #32: merged.
- RC merge main: `d75061fdabc93dd3a7fd3aff44456d06d822f56c`.
- Stable PR #33: branch `release/v1.0.0`, based on the RC merge main.
- The stable tag and GitHub Release remain pending until Stable PR #33 is merged and the final `main` CI succeeds.
- This stable promotion branch creates no tag and no GitHub Release.
