# Implementation status

Updated: 2026-09-06

## Verified locally

- Donor cloned at commit `f531ea6`.
- Donor workflow preserved unchanged; original and legacy SHA-256 match.
- TypeScript monorepo dependencies install.
- Prisma Client generation succeeds.
- 31 unit tests pass across 9 test files.
- TypeScript typecheck passes for API, web, worker, database and shared packages.
- Production builds pass for NestJS, worker and Next.js.
- A clean GitHub Actions Linux runner passes install, Prisma generation, 25 tests, typecheck, production build and Compose configuration validation.
- Next.js generated all static/dynamic routes successfully.
- `docker compose --env-file .env.example config --quiet` passes.
- Three Telegram media teasers were separately rendered for the public build log.
- Local Codex CLI is present and exposes `exec`, `--ephemeral`, `--sandbox`, `--output-schema` and `--output-last-message` options.
- Docker images for API, worker and web build and start on macOS.
- PostgreSQL, Redis and MinIO readiness is checked by the API.
- A full 10-item batch was generated through the local Codex subscription adapter after exercising idempotent replay, conflicting replay, invalid 9-item import, individual queueing and stage-aware retry.
- Seven drafts reached the renderer. Six corrected outputs passed contact-sheet inspection: five remain `ready_for_review` and one was approved through the API. Three items stopped at `qa_pending` because their scripts require human fact checking.
- The first smoke draft exposed subtitle overflow, was rejected through the API, and led to a tested renderer fix.
- The upgraded `cartoon-board-v1` renderer produced a 40-second 1080×1920 H.264 draft with AAC audio and burned-in English captions inside Docker. Its macOS voice was generated through the project provider without an external API.
- Kokoro-82M was installed in an isolated Python 3.12 environment on Apple Silicon and produced a valid 48 kHz WAV through the project bridge. Model weights remain outside Git.
- The `storybook-clay-v1` renderer produced a 40-second illustrated draft from four original, recorded scene assets. The default demo expands them deterministically across seven scripted scenes.
- The children's cartoon v2 example uses 12 original image-generated keyframes, local bidirectional optical-flow in-betweens, a 30 fps camera pass, Kokoro narration, original sound cues and burned English captions. Its 17-second 720x1280 review MP4 passed stream, duration, freeze, black-frame and loudness checks.

## Implemented

| Area | Status | Notes |
|---|---|---|
| Project/channel API | Implemented | Create/list endpoints. |
| CSV/JSON batch import | Implemented | 10–1000 items, row errors, duplicate rejection. |
| Idempotency | Implemented | Batch key + import hash, item hashes, BullMQ job IDs, object keys. |
| Lifecycle | Implemented | Shared legal transition rules and tests. |
| Stage queues/retry | Implemented | Five queues, configurable concurrency, exponential backoff. |
| Logs/errors | Implemented | PostgreSQL attempts/logs, bounded sanitized errors. |
| LLM schema | Implemented | Strict JSON Schema plus Zod validation. |
| Quality gate | Implemented | Claims, source state, subtitle length, stock-query and duplicate checks. |
| Duplicate detection | Implemented | Lexical implementation; embeddings interface ready. |
| Asset manifest | Implemented | Generated source/license manifest stored in MinIO. |
| TTS | Implemented on Apple Silicon | Local `kokoro-mlx` neural voice and `macos-say` fallback verified; OpenTTS remains optional. |
| Rendering | Implemented | Code-generated cartoon board plus optional illustrated storybook scenes, motion, captions and metadata export. |
| Dashboard | Implemented | Overview, batches, queue, import, item/script/scenes/logs/review/download. |
| Manual review | Implemented | Fact-check continuation and final approve/reject. |
| Telegram | Implemented | Readiness text only, disabled by default, idempotent outbox. |
| n8n | Constrained | Optional profile; no batch or publishing role. |
| Codex subscription adapter | Implemented | Host-only, ephemeral, read-only sandbox, strict schema. |
| Claude subscription adapter | Interface only | Claude CLI was not installed on the audit machine; no unverified flags were added. |

## Not yet claimed as verified end-to-end

- Full Compose image build and startup on Linux. macOS is verified.
- Every item in one 10-item batch through rendered MP4. The complete script batch is verified, while three items deliberately stopped at the fact-check gate.
- Live Ollama model generation quality for a selected model.
- Live OpenTTS voice name and output format across CPU architectures.
- Telegram readiness delivery with a real bot/chat.
- Remote deployment security: authentication/RBAC and TLS are required first.

These are explicit release checks, not hidden gaps. The repository is suitable as a public MVP source release with these limits stated; a production deployment or stable `v1.0.0` release requires the remaining checks.

## Intentionally absent

- YouTube upload.
- Telegram media posting.
- Scheduled automatic publication.
- Account/SIM/VPN/payment workarounds.
- View/subscriber/watch-hour manipulation.
- Unlicensed content scraping or reuse.
- Promised views, revenue or monetization outcomes.

## Next verification sequence

1. Fact-check the three gated scripts and run their remaining media stages.
2. Verify a selected Ollama model and prompt on a clean machine.
3. Verify OpenTTS voice selection and audio format on macOS and Linux.
4. Revoke the previously exposed Telegram token, create a replacement, then verify one deduplicated readiness message.
5. Repeat the core Compose runtime smoke test on Linux.

Detailed evidence: [local end-to-end smoke test](smoke-test.md).
