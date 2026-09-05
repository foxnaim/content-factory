# Content Factory target architecture (MVP v2)

## Goals

- Import 10–1000 topics from CSV or JSON.
- Turn each topic into a traceable vertical-video draft.
- Limit resource use with queue concurrency and backpressure.
- Validate every LLM result before expensive visual generation.
- Preserve sources, licenses, prompts, hashes and job logs.
- Require a human approve/reject decision.
- Export files and metadata; never publish automatically.

## System context

```text
Browser
  │
  ▼
Next.js dashboard ──────► NestJS API ──────► PostgreSQL
                               │                  ▲
                               │ enqueue          │ status/logs
                               ▼                  │
                            Redis/BullMQ ─────► Node workers
                                                    │
                       ┌────────────────────────────┼─────────────────┐
                       ▼                            ▼                 ▼
                   LLM adapter                  TTS adapter        FFmpeg
                 (Ollama/external)           (OpenTTS/external)      │
                       │                            │                 │
                       └────────────────────────────┴──────► MinIO ◄──┘
                                                               │
                                              signed preview/download URLs

n8n ◄── manual webhook/readiness event only; never owns batch execution
Telegram ◄── one notification when drafts are ready for review; no media posting
```

## Monorepo layout

```text
apps/
  api/        NestJS HTTP API and enqueue commands
  web/        Next.js dashboard
  worker/     BullMQ processors and provider adapters
packages/
  shared/     Zod schemas, contracts, status machine, CSV parser
  database/   Prisma schema/client and migrations
legacy/
  autotube-v1/  preserved donor snapshot
```

## Domain model

- **Project**: a workspace owned by an operator.
- **Channel**: target editorial identity and defaults; not a publishing credential.
- **Batch**: one import and its configuration, idempotency key and aggregate status.
- **ContentItem**: one topic moving through the lifecycle.
- **ScriptVersion**: validated script payload, model/provider metadata and content hash.
- **Scene**: normalized scene records derived from the accepted script.
- **Asset**: input/output object with checksum, source, license and generation metadata.
- **JobAttempt**: queue name, attempt, timing, outcome and sanitized error.
- **ItemLog**: operator-readable structured events.
- **ReviewDecision**: approve/reject, actor, reason and timestamp.

## Lifecycle

```text
draft → queued → scripting → script_ready
                         └──► failed

script_ready → quality gate
  ├── fact check or human issue → qa_pending
  ├── duplicate/low quality     → rejected
  └── pass                      → assets_generating

assets_generating → voice_generating → rendering → qa_pending
      │                    │              │
      └────────────────────┴──────────────┴──► failed

qa_pending → ready_for_review → approved
                           └──► rejected

failed → the recorded failed stage through an explicit, metadata-validated retry command
rejected → draft only through an explicit revision command
```

Status transitions are checked by a shared state machine. API and worker may not assign arbitrary states.

## Queues and idempotency

Queues:

- `content-script`
- `content-assets`
- `content-voice`
- `content-render`
- `content-notify`

Each BullMQ `jobId` is deterministic: `{stage}:{contentItemId}:{inputHash}`. Re-enqueueing the same stage with unchanged input is a no-op. Database unique constraints protect batch imports and stage outputs from duplicates even if a job is delivered more than once.

Retry policy:

- Retry only temporary failures: timeouts, connection resets, HTTP 408/425/429 and most 5xx responses.
- Exponential backoff with environment-controlled attempts and delay.
- Never retry validation, license, policy or unsupported-format failures automatically.
- Store every attempt and the final sanitized error.

Concurrency is set per stage through environment variables so FFmpeg cannot starve lightweight jobs.

## LLM boundary

The LLM returns JSON matching `VideoScriptSchema`. Unknown fields are rejected. No regex parsing or permissive fallback text is allowed.

Processing:

1. Parse JSON.
2. Validate with Zod.
3. Normalize whitespace and durations.
4. Verify total scene duration against target duration tolerance.
5. Run prohibited-claim and missing-source checks.
6. Compare topic, title and script through a pluggable duplicate detector.
7. Save immutable script version and content hash.
8. Stop at `qa_pending` when factual claims require review.
9. Only then enqueue visual generation.

## Quality gate

Before assets:

- valid contract and non-empty scenes;
- hook and title are not near-duplicates of another item in the batch;
- scene duration sum is plausible;
- potentially disputable claims set `fact_check_required=true` and include source notes/placeholders;
- no fabricated metrics, links, personal results or monetization promises;
- each scene has an original visual plan;
- stock queries do not request copyrighted clips or identifiable private people;
- duplicate detector interface returns below configured thresholds or a human override exists.

The initial duplicate detector is deterministic lexical similarity. An embeddings implementation can be added through the same interface later.

## Storage and asset manifest

MinIO buckets:

- `content-factory-source`
- `content-factory-work`
- `content-factory-output`

Every asset records:

- object key, media type, byte length and SHA-256;
- source type (`generated`, `owned`, `licensed-stock`, `public-domain`);
- source URL or internal origin;
- license identifier and evidence object key when applicable;
- generator/provider/model and prompt hash when generated;
- content item and scene relation;
- creation time and operator notes.

Review/download uses short-lived presigned URLs. The API never exposes raw storage credentials.

## API surface

Minimum endpoints:

- `POST /projects`, `GET /projects`
- `POST /projects/:projectId/channels`, `GET /projects/:projectId/channels`
- `POST /channels/:channelId/batches/import` (CSV or JSON + idempotency key)
- `GET /batches`, `GET /batches/:id`
- `POST /batches/:id/queue`
- `GET /items/:id`
- `POST /items/:id/retry`
- `POST /items/:id/approve`
- `POST /items/:id/reject`
- `GET /items/:id/logs`
- `GET /items/:id/download`
- `GET /health/live`, `GET /health/ready`

There is deliberately no publish endpoint.

## Dashboard

- Batches: progress, counts by status and import errors.
- Queue: active/waiting/delayed/failed jobs and stage concurrency.
- Video item: topic, script, scenes, sources, asset manifest and attempt logs.
- Preview: signed MP4 URL and metadata.
- Review: approve/reject with reason.
- Download: video, metadata JSON and manifest.

## Security boundaries

- `.env` is ignored; only `.env.example` is committed.
- Provider credentials live only in environment variables or external secret stores.
- Logs redact tokens, authorization headers and query signatures.
- API validates upload type/size and uses generated object keys.
- No client-supplied filesystem path reaches FFmpeg.
- Worker subprocesses receive explicit argument arrays, never shell-concatenated commands.
- Containers run without unnecessary host mounts.
- Telegram notifier sends text readiness summaries only after `ready_for_review`.
- Approval changes state; it does not trigger publication.

## Architecture decisions

1. **BullMQ owns batch execution.** It provides backpressure, deterministic job IDs, retry metadata and concurrency without forcing n8n to act as a compute scheduler.
2. **PostgreSQL is the source of truth.** Redis is disposable queue infrastructure, not durable content state.
3. **MinIO stores media.** Database rows store metadata and object keys, avoiding giant blobs and unsafe shared folders.
4. **Direct FFmpeg is the renderer.** It reduces hidden behavior and lets commands/manifests be reproduced.
5. **n8n is an edge integration.** Its failure cannot corrupt the batch state machine.
6. **Human review is terminal for MVP.** Approved content remains exportable; no automatic publishing exists.

## Subscription-backed local agent option

For a single-owner workstation, the script stage can use the locally installed, already-authenticated Codex CLI with `LLM_PROVIDER=codex-cli`. The adapter runs `codex exec` in an ephemeral temporary directory with a read-only sandbox and a strict output schema. It never reads or copies the login token itself.

This is intentionally a host-only convenience, not a server API: subscription access must not be repackaged or exposed to other users. Container and multi-user deployments should use Ollama or an explicitly supported provider API. A Claude CLI adapter can implement the same `ScriptProvider` interface when Claude Code is installed and its local automation terms/flags have been reviewed; it is not enabled blindly.
