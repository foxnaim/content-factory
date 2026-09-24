# Content Factory

[![CI](https://github.com/foxnaim/content-factory/actions/workflows/ci.yml/badge.svg)](https://github.com/foxnaim/content-factory/actions/workflows/ci.yml)

Self-hosted, review-first pipeline for creating **10–1000 vertical video drafts** from CSV or JSON topics.

Content Factory automates production work, not publication. Every rendered video stops at `ready_for_review`. A human can inspect the script, scenes, sources, asset manifest, logs and preview before approving, rejecting or downloading it. The project contains no YouTube upload endpoint and the Telegram integration sends readiness text only.

## What is implemented

- TypeScript monorepo with npm workspaces.
- NestJS API for projects, channels, batch import, queueing and review.
- Next.js + Tailwind + shadcn-style dashboard components.
- BullMQ workers with per-stage concurrency and exponential backoff.
- PostgreSQL/Prisma data model and durable job attempt logs.
- Redis queues with deterministic, idempotent job IDs.
- MinIO storage for manifests, audio, metadata and rendered drafts.
- Browser-safe, expiring download links through a separately configured public MinIO endpoint.
- Strict Zod LLM contract in [`packages/shared/src/schemas/video-script.schema.ts`](packages/shared/src/schemas/video-script.schema.ts).
- Content quality gate before visual work.
- Lexical duplicate detection plus an embeddings-provider interface.
- FFmpeg cartoon-board renderer with timed, burned-in English captions.
- Optional Ollama, OpenTTS, local Kokoro MLX neural voice and macOS system voice providers.
- Optional host-only Codex CLI provider that uses the operator's existing local login instead of an API key.
- Manual fact-check continuation and final approve/reject actions.
- Telegram readiness notification with an idempotent outbox; no media posting.

See [implementation status](docs/implementation-status.md) and the [local end-to-end smoke test](docs/smoke-test.md) for tested and pending parts.

Russian setup and recording guide for Claude with a local Ollama model: [Claude + Ollama + Qwen](docs/ollama-claude-local-setup.ru.md).
Latest observed release checks: [release readiness for 24 September 2026](docs/release-readiness-2026-09-24.md).

## Open-source Agent Skills

The repository includes eleven Russian-language, Codex-compatible skills under [`skills/`](skills/):

- niche research and a 30-topic plan;
- Shorts scripts with English voiceover/subtitles and strict JSON;
- qualitative retention audit;
- honest title/thumbnail ideation;
- faceless storyboard and licensed-asset manifest;
- originality/reused-content QA;
- deterministic 10–1000 item batch planning;
- Telegram repurposing with a native poll for channels without comments.
- cartoon storyboard planning with character continuity and asset provenance;
- consent-aware voice/caption planning;
- evidence-based MP4 render QA.

These skills prepare drafts. They do not guarantee views, monetization or income, and they do not publish. Missing facts, author data, screenshots and sources remain visible markers until a person supplies them. Start with the [Russian project guide](docs/project-guide.ru.md), [skill selection](docs/skill-selection.md), and [Codex guide](docs/how-to-use-with-codex.md). Inspect the complete safe demo under [`examples/demo-inputs/`](examples/demo-inputs/) and [`examples/demo-outputs/`](examples/demo-outputs/), including the [independent Codex forward-test](docs/skills-forward-test.md).

The three cartoon skills can be used without running the experimental Content Factory application. Installing them does not install FFmpeg, a voice model or an image generator; the executing agent still needs suitable tools and every result requires human review.

Validate the package and exercise the deterministic batch skill:

```bash
npm run skills:test
```

To add a skill, create `skills/<name>/SKILL.md` with `name` and a discriminating `description`, then add a request template, output contract, two good/two bad examples and a test. Follow [`AGENTS.md`](AGENTS.md) and [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Architecture

```text
Next.js dashboard → NestJS API → PostgreSQL
                         │
                         ▼
                    Redis/BullMQ → workers → Ollama or local Codex CLI
                                         ├→ Kokoro MLX, OpenTTS or macOS voice
                                         ├→ FFmpeg
                                         └→ MinIO

n8n: manual integrations/notifications only
YouTube/Telegram publication: deliberately absent
```

Full design: [target architecture](docs/target-architecture.md).
Donor findings: [donor audit](docs/donor-audit.md).

## Prerequisites

### macOS

- Docker Desktop with Compose v2+
- Node.js 22 LTS for host development
- Docker rendering is recommended on macOS because the minimal Homebrew `ffmpeg` formula does not include the required `drawtext` filter.
- For host worker rendering, install an FFmpeg build with libfreetype/drawtext, such as `ffmpeg-full`.
- Optional: Codex CLI already signed in through the Codex/ChatGPT desktop environment

The Codex adapter keeps the existing account authorization but ignores the operator's model/provider/hooks configuration by default. This prevents a personal profile from silently changing automated runs. Set `CODEX_USE_USER_CONFIG=true` only when that profile has been tested with the pipeline.

### Linux

- Docker Engine and Docker Compose plugin
- Node.js 22 LTS for host development
- FFmpeg and DejaVu fonts for host worker rendering, for example:

```bash
sudo apt-get update
sudo apt-get install -y ffmpeg fonts-dejavu-core
```

## Quick start with Docker

Docker is the supported first-run path on macOS and Linux. It pins Node and the FFmpeg capabilities used by the renderer. Host development can be checked with `npm run preflight` after `nvm use`.

1. Create local configuration:

```bash
cp .env.example .env
```

Replace every `replace-with-...` value. Do not commit `.env`.

2. Start the core services and applications:

```bash
docker compose up --build
```

3. Open:

- Dashboard: <http://localhost:3000>
- API live check: <http://localhost:3001/api/health/live>
- MinIO console: <http://localhost:9001>

4. For self-hosted script generation and voice, start the optional local-AI profile:

```bash
docker compose --profile local-ai up --build
docker compose exec ollama ollama pull llama3.1:8b
```

Set `DOCKER_OPENTTS_URL=http://opentts:5500` only after confirming the selected OpenTTS image and voice work on your CPU architecture.

On Apple Silicon macOS, install the local Kokoro neural voice once. It uses no API key; the first setup downloads model weights:

```bash
npm run setup:kokoro
```

Keep the neural voice stage on the host and rendering in Docker:

```env
TTS_PROVIDER=kokoro-mlx
KOKORO_VOICE=am_michael
KOKORO_SPEED=0.90
DOCKER_WORKER_STAGES=assets,render,notify
```

```bash
WORKER_STAGES=script,voice npm run dev:worker
```

5. Start n8n only for manual integrations:

```bash
docker compose --profile integrations up n8n
```

n8n is not a batch worker and has no automatic publishing authority.

## Host development

```bash
cp .env.example .env
npm install
npm run db:generate
npm run typecheck
npm test
npm run build
```

Start PostgreSQL, Redis and MinIO with Compose, then run in separate terminals:

```bash
npm run dev:api
npm run dev:worker
npm run dev:web
```

The sample `.env` uses `localhost` for host processes. Compose replaces database, Redis and MinIO addresses with their internal service names. PostgreSQL and Redis are published on localhost only so a host-side Codex worker can reach them.

## Use the Codex subscription locally

The `codex-cli` provider invokes the already-authenticated Codex CLI on the owner's computer. It does not read, export or copy the auth token.

Set in your host `.env`:

```env
LLM_PROVIDER=codex-cli
CODEX_CLI_PATH=/Applications/ChatGPT.app/Contents/Resources/codex
# Optional override; the monorepo schema is discovered automatically.
# CODEX_OUTPUT_SCHEMA_PATH=/absolute/path/to/video-script.schema.json
SCRIPT_CONCURRENCY=1
TTS_PROVIDER=kokoro-mlx
DOCKER_WORKER_STAGES=assets,render,notify
```

Keep the Docker worker running for assets, FFmpeg and notifications. Run a second worker on the host for scripts and the macOS voice:

```bash
WORKER_STAGES=script,voice npm run dev:worker
```

Safety properties:

- `codex exec --ephemeral` creates no persistent task session.
- The agent runs in a temporary directory with `--sandbox read-only`.
- A JSON Schema constrains the final response; Zod validates it again.
- No Codex authentication directory is mounted into a container.
- This mode is for the subscription owner on one workstation. Do not expose it as a service for other users.

Claude Code is not installed or enabled by this repository. It can later implement the same `ScriptProvider` interface after its local CLI flags and usage terms are reviewed.

## Create a project, channel and batch

Create a project:

```bash
curl -X POST http://localhost:3001/api/projects \
  -H 'content-type: application/json' \
  -d '{"name":"Build with Yan","description":"Public AI YouTube experiment"}'
```

Create a channel using the returned project ID:

```bash
curl -X POST http://localhost:3001/api/projects/PROJECT_ID/channels \
  -H 'content-type: application/json' \
  -d '{"name":"English YouTube Lab","language":"en"}'
```

Import JSON using the returned channel ID. The request must contain 10–1000 items:

```bash
curl -X POST http://localhost:3001/api/channels/CHANNEL_ID/batches/import \
  -H 'content-type: application/json' \
  -d @examples/batch-import.json
```

Inspect the imported batch, then explicitly queue it:

```bash
curl -X POST http://localhost:3001/api/batches/BATCH_ID/queue
```

## CSV format

```csv
topic,external_id,language,target_duration_sec,notes
Why one button delayed our MVP,item-001,en,35,Use an original interface teardown
```

Required column: `topic`. Optional columns: `external_id`, `language`, `target_duration_sec`, `notes`. Identical topics/settings inside one batch are rejected rather than silently duplicated.

## Status lifecycle

```text
draft → queued → scripting → script_ready → assets_generating
      → voice_generating → rendering → qa_pending
      → ready_for_review → approved | rejected
```

Potentially disputable facts stop at `qa_pending`. An operator must verify the sources and explicitly continue. Rendered videos pass file checks, then stop again at `ready_for_review` for approve/reject.

`approved` means editorial approval for download. It is not a platform compliance guarantee and triggers no publication.

## Quality and provenance

The script contract rejects unknown fields, malformed scenes, non-contiguous indexes, duration mismatches and unresolved sources that omit `fact_check_required`.

Each render writes:

- validated script version and hash;
- source/license asset manifest;
- provider/model metadata;
- job attempts and sanitized errors;
- video and metadata JSON in MinIO;
- review decision.

The MVP renderer supports two owned visual modes: a code-generated cartoon board and an illustrated storybook mode with timed scene images, slow camera motion, burned-in captions and normalized voice audio (default target: -16 LUFS). Requests for stock, owned footage or external generated images remain visible in the scene plan until an authorized asset adapter supplies a source and license record. They are not silently downloaded or copied.

The included original CRM story can be enabled for a matching batch with `RENDER_SCENE_DIR=assets/cartoon-crm-v1` on a host worker or `DOCKER_RENDER_SCENE_DIR=/app/assets/cartoon-crm-v1` in Compose. Leave both empty for unrelated topics; reusing mismatched scenes would be misleading.

For a one-off validated render from an existing script contract:

```bash
npm run build
npm run render:video -- ./script.json ./draft.mp4 ./voice.wav
```

On Apple Silicon macOS, neural voice and video can be generated together through the project:

```bash
npm run build
TTS_PROVIDER=kokoro-mlx npm run demo:video -- ./script.json ./draft-with-voice.mp4
```

This command generates speech locally through Kokoro MLX, builds the worker image if needed, and renders captions inside Docker so it does not depend on the host FFmpeg build. The lighter `TTS_PROVIDER=macos-say` remains available as a fallback. Set `DEMO_SKIP_DOCKER_BUILD=1` only when the current worker image is already built.

`kokoro-mlx` inference code is MIT licensed. Kokoro-82M model weights are Apache-2.0 and are downloaded separately from Hugging Face on first use; they are never committed to this repository.

### Animated children's-style example

The repository also includes an 18-second, fully animated vertical example in `videos/lead-rescue-cartoon`. Its robot and lead character move on a deterministic timeline; it is not a slideshow of still images. The example includes local Kokoro narration, English caption pages and small synthesized sound cues. It never publishes the result.

```bash
npm run demo:cartoon
```

The first run downloads the pinned HyperFrames CLI and the Nunito font, then writes the MP4 under `videos/lead-rescue-cartoon/renders/`. Run `npm --prefix videos/lead-rescue-cartoon run check` to validate layout, motion, contrast and runtime behavior before rendering.

The second example in [`videos/lead-rescue-cartoon-v2/`](videos/lead-rescue-cartoon-v2/) uses 12 original illustrated keyframes, local bidirectional optical-flow in-betweens, Kokoro narration, English captions and original sound cues. Its reviewed 17-second MP4 is included for direct inspection; the Python/FFmpeg renderer is reproducible and performs no network or publishing action.

## Tests and checks

```bash
npm test
npm run typecheck
npm run build
npm run compose:config
```

Tests cover the Zod video script, CSV/JSON import, lifecycle transitions, deterministic job IDs, batch status derivation, duplicate detection, quality gate and subtitle wrapping.

## Security before remote deployment

The current build is designed for local/self-hosted use. Add authentication/RBAC and TLS before exposing API, dashboard, MinIO or n8n outside localhost. Use a real secret store for multi-user deployment. Review [risk register](docs/risk-register.md).

## Donor attribution

Content Factory started from the MIT-licensed [Hritikraj8804/Autotube](https://github.com/Hritikraj8804/Autotube) proof of concept. The original donor snapshot is preserved in `legacy/autotube-v1/` with checksums. Its workflow is reference material and is not the Content Factory batch worker.

## License

MIT. See [LICENSE](LICENSE).

Contributions are welcome within the review-first safety boundary. See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
