# Migration plan: AutoTube donor → Content Factory MVP v2

## Guardrails

- Preserve the donor commit and its workflow under `legacy/autotube-v1/` before changing an existing file.
- Do not import donor credentials or local data.
- Keep `short_automation/workflows/autotube-complete.json` byte-for-byte unchanged during the audit and foundation work.
- Add no automatic publishing path.
- Merge in small phases that leave documentation and tests runnable.

## Phase 0 — audit and preservation

Deliverables:

- `docs/donor-audit.md`
- `docs/target-architecture.md`
- `docs/migration-plan.md`
- `docs/risk-register.md`
- `docs/proposed-files.md`
- donor backup under `legacy/autotube-v1/`
- checksum manifest for preserved files

Exit criteria:

- donor claims are separated from checked-in behavior;
- original workflow checksum is recorded;
- no secret values are present in tracked files.

## Phase 1 — typed monorepo foundation

Deliverables:

- npm workspaces and shared TypeScript configuration;
- NestJS API, Next.js dashboard and BullMQ worker applications;
- `packages/shared` with Zod contracts, CSV import and lifecycle rules;
- `packages/database` with Prisma schema;
- lint/typecheck/test scripts;
- `.env.example` and `.gitignore`.

Exit criteria:

- install succeeds on a supported Node version;
- shared schemas and unit tests pass;
- each application builds or typechecks;
- no production credentials are required for unit tests.

## Phase 2 — local infrastructure

Deliverables:

- Dockerfiles for API, web and worker;
- Compose services for PostgreSQL, Redis and MinIO;
- optional profiles for Ollama, OpenTTS and n8n;
- health checks and named volumes;
- MinIO bucket bootstrap.

Exit criteria:

- Compose configuration validates;
- PostgreSQL/Redis/MinIO health checks are defined;
- internal services do not rely on insecure fallback production secrets;
- n8n is not connected to the processing queues.

## Phase 3 — import and queue lifecycle

Deliverables:

- project/channel/batch endpoints;
- CSV and JSON import with row-level validation;
- deterministic batch/item keys;
- explicit queue command;
- BullMQ stage jobs with configurable concurrency and retry;
- structured job attempt logs.

Exit criteria:

- importing the same request with the same idempotency key creates no duplicate batch or items;
- 10–1000 row limits are enforced;
- invalid rows are reported without fabricated replacements;
- lifecycle tests cover legal and illegal transitions.

## Phase 4 — script and quality gate

Deliverables:

- provider-neutral LLM adapter;
- Ollama implementation and local Codex CLI adapter;
- strict `VideoScriptSchema` parsing;
- factual-claim flag checks;
- lexical duplicate detection implementation;
- embeddings duplicate detector interface;
- immutable script versions.

Exit criteria:

- malformed output fails before asset work;
- disputed facts pause at `qa_pending`;
- near-duplicate scripts in one batch are rejected or held;
- every script version has a hash and provider metadata.

## Phase 5 — assets, voice and FFmpeg

Deliverables:

- MinIO repository and presigned URLs;
- asset-provider and TTS-provider interfaces;
- source/license manifest validation;
- FFmpeg renderer using argument arrays;
- output video, metadata JSON and manifest export.

Exit criteria:

- the built-in renderer emits only project-generated text cards with a required manifest; external asset adapters stay disabled until license/source validation exists;
- a retry cannot create duplicate assets for unchanged input;
- render errors are visible and resumable;
- output is never published automatically.

## Phase 6 — dashboard and review

Deliverables:

- batch/queue pages;
- item detail, script, scenes, logs and preview;
- approve/reject controls with reason;
- download/export action;
- readiness-only Telegram notification.

Exit criteria:

- reviewer can trace each output to script and assets;
- approval does not call YouTube or Telegram media-posting APIs;
- notifier triggers only after drafts become ready for review;
- duplicate notifications are prevented with an outbox key.

## Phase 7 — hardening

- integration tests with disposable PostgreSQL/Redis/MinIO;
- permission and upload abuse tests;
- queue recovery and worker-kill tests;
- storage retention policy;
- backup/restore runbook;
- dependency and container pinning;
- performance test at 10, 100 and 1000 imported items without running all expensive providers.

## Rollback

The donor remains runnable only as a historical reference. Rollback for MVP v2 means reverting the new monorepo commit; it does not mean overwriting `legacy/`. Database migrations are additive during MVP. Destructive migrations require a separate backup and explicit operator plan.
