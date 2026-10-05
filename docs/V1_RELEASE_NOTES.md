# EE Knowledge v1.0.0

## What EE Knowledge v1 Is

EE Knowledge v1 is a single-user, personal, long-term electronic-information knowledge and learning system. It supports undergraduate professional study, graduate interview preparation, review, gap finding and long-term accumulation across embedded systems, AI, Edge AI and related engineering topics.

## Knowledge System

The knowledge path is Course → Book → Chapter → KnowledgePoint, with recursive chapter structure. The system supports Markdown/GFM, KaTeX, structured formulas, examples, knowledge relations, image/provider abstraction, search, favorites, notes, study progress, content administration, structure management and Knowledge Bundle v1 (`schemaVersion = 1.0`).

## Learning System

Knowledge learning content includes common mistakes, mastery criteria and common questions with short, standard and deep answers. Quick Learn, simple interval review, review history, objective practice grading, subjective self-rating, wrong answers and learning statistics form the learning loop. Review scheduling remains simple interval scheduling; v1 does not claim FSRS or an adaptive AI tutor.

## Personal Cloud and Mobile

v1 keeps the single-user, private-by-default model with environment-backed credentials and signed HttpOnly sessions. PWA and mobile navigation are designed for one server-side SQLite data source. Linux self-host uses Native Node, systemd and Caddy, with the production service bound to `127.0.0.1:3000`.

## Personal Material Import

The import workflow supports Markdown/TXT, PDF text-layer extraction and DOCX raw-text extraction. Each import is manually confirmed and editable, records source metadata and creates KnowledgePoint content with atomic create-only semantics. v1 does not include OCR, raw file persistence or automatic book splitting.

## Data Safety

The release includes read-only database integrity checks, cold/live/scheduled backup, Primary retention, optional mounted Secondary backup, SHA-256 and SQLite integrity verification, restore source validation, pre-restore backup, staged restore, post-restore integrity checks and fail-closed journal/WAL/SHM sidecar handling. The implementation does not promise zero-loss recovery or transaction-level atomic filesystem restore.

## Self-host and Release Quality

The repository includes production preflight, disposable SQLite runtime smoke, GitHub CI and release checks covering authentication, learning navigation, material import, backup/restore, self-host contracts, PWA/mobile contracts, type checking, lint, build and runtime behavior. The v1 release adds no Prisma schema change, migration, seed change or dependency upgrade.

## What v1 Deliberately Does Not Include

AI Assistant, AI Provider integrations, RAG, embeddings, vector databases, complex knowledge graphs, multi-user accounts, RBAC, SaaS, complex object storage, real-time synchronization, an independent interview platform, a national school database, voice interviews, FSRS and complex recommendation algorithms remain `Post-v1 / Only if Needed`.

## Upgrade from v0.6.0

v1.0.0 adds no new Prisma migration. For a self-hosted installation, stop the service, make a backup, update with `git pull --ff-only`, run `npm ci`, build, then start the service. The systemd startup sequence remains `deploy:check` → `db` → `db:check` → `start:prod`.

## Target-environment Boundary

Orange Pi/RK3588, a real systemd service, Caddy public HTTPS, Android PWA installation and USB/NAS backup remain manual target acceptance checks. They are not represented as automated PASS results when those environments have not been connected and tested.

