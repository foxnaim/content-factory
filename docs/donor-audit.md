# Donor audit: Hritikraj8804/Autotube

Audit date: 2026-09-05
Donor commit: `f531ea6` (`Update README.md`)
Scope: static review of the cloned repository. No donor workflow files were changed before this audit.

## Executive assessment

The donor is a useful proof of concept for composing one vertical slideshow from one manually entered topic. It is not a working batch platform yet.

The repository documentation describes a larger system than the checked-in implementation. The exported n8n workflow contains a seven-node, single-item chain using Groq for both script and speech, then calls a Flask endpoint. There is no YouTube upload node in that workflow. PostgreSQL, Redis, Ollama and OpenTTS are present in Compose, but the checked-in workflow does not use them. The Python container sleeps indefinitely and does not start the documented API automatically.

The safest migration path is to preserve the donor as a read-only reference, reuse the rendering ideas and local-service options, and replace n8n orchestration with a typed API, BullMQ workers, PostgreSQL state, MinIO assets and a mandatory review gate.

## Inventory: what actually exists

| Service or component | Present | Used by checked-in workflow | Finding |
|---|---:|---:|---|
| n8n | Yes | Yes | Main orchestrator; manual trigger and one linear execution. Uses SQLite despite a PostgreSQL service being defined. |
| Ollama | Compose only | No | Container exists, docs describe Llama 3.1, but workflow calls Groq instead. No model bootstrap is automated. |
| OpenTTS | Compose only | No | Container exists, but workflow calls Groq PlayAI TTS instead. |
| Python API | Partial | Intended | `video_api.py` exposes `/health`, `/generate`, `/info`; Compose starts the container with `sleep infinity`, does not install dependencies, does not expose port 5001 and does not start Flask. |
| PostgreSQL | Compose only | No | Service exists, but n8n is configured with `DB_TYPE=sqlite`; application data models do not exist. |
| Redis | Compose only | No | Service exists as a volume-backed cache but no code connects to it. There is no queue. |
| FFmpeg/MoviePy | Source only | Intended | MoviePy rendering code exists, but the base `python:3.11-slim` image does not install FFmpeg or Python packages. No requirements file is checked in. |
| YouTube integration | Documentation only | No | README/docs claim upload support, but exported workflow ends at `Final Output`; no YouTube node, OAuth handling or upload code exists. |
| AI image generation | Yes | Via Python intent | Pollinations GET endpoint and Hugging Face inference endpoint are hardcoded in `ai_generator.py`. |
| FileBrowser | Yes | Not in pipeline | Mounts the entire `short_automation` directory at `/srv`, which is broader access than the new review UI needs. |

## Current execution path

```text
Manual Trigger
  → Set Topic (one hardcoded topic)
  → Groq chat completion
  → regex parsing with fallback text
  → Groq PlayAI speech
  → timestamped WAV in /videos
  → Flask /generate
  → MoviePy slideshow + external images
  → Final Output text
```

The path has no durable content item, batch, stage transition, idempotency key, review decision, asset manifest, retry policy or job log.

## Parts designed for one video

1. `Set Topic` contains one literal topic and the workflow uses `$input.first()` throughout.
2. The parser references `$('Set Topic').first()` and returns exactly one item.
3. Audio and video filenames use timestamps with second precision, not stable item IDs.
4. `/generate` is synchronous and blocks until rendering finishes.
5. The API accepts one hook/content/CTA/title object rather than a scene contract.
6. `create_youtube_short` targets exactly 30 seconds and truncates content to three lines.
7. Rendering uses process-global constants for size, FPS and duration.
8. No queue or concurrency control exists.
9. No database record links topic, script, sources, assets, audio and result.
10. The final node produces a single output object and has no review state.

## Hardcoded configuration

- Topic: `5 AI tools that will change your life in 2025`.
- Groq models: `llama-3.1-8b-instant` and `playai-tts`.
- Voice: `Fritz-PlayAI`.
- Prompt language, duration and output structure.
- Hashtags including `viral`, `trending`, `ai`, `automation`, `2025`.
- Internal URLs such as `http://python:5001/generate`.
- Pollinations and Hugging Face model endpoints.
- Paths rooted at `/videos` and `/scripts`.
- Video resolution, 30 FPS, 30-second duration, fonts, colors and scene count.
- Compose container names, exposed host ports and timezone `Asia/Kolkata`.
- Default credentials in Compose: n8n `admin/admin`, PostgreSQL `n8n_password`, and a known n8n encryption-key fallback.
- Unpinned `latest` container images for n8n, Ollama, OpenTTS and FileBrowser.

## Credentials and security

Positive: the exported workflow references an n8n credential by identifier rather than embedding the Groq token. `.env.example` contains placeholders.

Risks:

1. Compose supplies insecure fallback passwords and encryption key if `.env` is absent.
2. n8n basic authentication defaults to disabled in Compose.
3. FileBrowser mounts the full project directory, including possible `.env` and n8n data.
4. `/generate` has no authentication, authorization, rate limit or payload schema.
5. Client-controlled `outputPath` is passed to filesystem operations, creating a path traversal/write risk.
6. Flask returns full tracebacks and exception strings to callers.
7. External image responses are written without validating MIME type, dimensions or maximum size.
8. No checksum, content provenance or malware/content safety step exists.
9. No account security guidance is enforced in code.

## Error handling and retry

- External image generation catches all exceptions, prints a line and may reuse the previous image. That can silently duplicate scenes.
- Hugging Face handles one `503` model-loading response with `sleep`, but has no bounded general retry, jitter or retry classification.
- Pollinations performs one request with a 60-second timeout and no retry.
- Groq nodes define timeouts but no explicit retry policy in the exported workflow.
- Script parsing uses regex and fabricated fallback phrases instead of rejecting malformed model output.
- `/generate` performs synchronous work and returns a generic 500; there is no resumable checkpoint.
- MoviePy errors can fall back to a solid background or omit audio, yet the pipeline can continue as if successful.
- No dead-letter queue, attempt log or operator action exists.

## External, paid and unstable dependencies

| Dependency | Local/external | Cost/stability observation | Migration treatment |
|---|---|---|---|
| Groq chat/TTS | External | Requires credentials; models, pricing, quotas and availability can change. | Provider adapter; optional, never hardcoded. Validate all output. |
| Pollinations image endpoint | External | Unauthenticated public endpoint; terms, rate limits and model behavior can change. | Optional experimental adapter only; strict download validation and provenance. |
| Hugging Face Inference | External | Token may be required; model cold starts, quotas and endpoint lifecycle vary. | Optional provider adapter with bounded retry. |
| Ollama | Local | No per-call API fee, but hardware/RAM and model download are required. | Keep as preferred local LLM adapter. |
| OpenTTS | Local | Image is unpinned and project/voice support may vary by architecture. | Keep behind TTS adapter; document tested voices/images. |
| MoviePy | Local library | Source targets MoviePy 2.x but dependencies are not pinned. | Replace primary renderer with direct FFmpeg orchestration; keep ideas only. |
| FFmpeg | Local binary | Stable but codec availability differs by image/platform. | Keep; pin container and probe capabilities at startup. |
| YouTube API | External | Quotas, OAuth and platform policy apply. | Remove publishing from MVP; export only. |

## Preserve, replace, remove

### Preserve

- MIT license and donor attribution.
- Original workflow as an immutable reference under `legacy/`.
- 9:16, 1080×1920, 30 FPS defaults as overridable presets.
- Ken Burns/crossfade concept.
- Ollama and OpenTTS as optional self-hosted providers.
- n8n for manual integrations and readiness notifications.
- Docker-based local developer experience.

### Replace

- n8n orchestration → NestJS API + BullMQ workers.
- regex LLM parsing → strict JSON contract validated with Zod.
- synchronous `/generate` → durable jobs and explicit state transitions.
- timestamp filenames → project/batch/item IDs plus content hashes.
- shared host folder → MinIO object storage and signed downloads.
- print statements → structured job logs in PostgreSQL.
- implicit fallbacks → typed errors, retry classification and visible failures.
- MoviePy as primary renderer → FFmpeg command builder with manifests.
- broad FileBrowser mount → purpose-built review/download UI.

### Remove from active MVP

- Automatic YouTube publishing.
- “viral/trending” prompt defaults and fabricated fallback copy.
- insecure default credentials.
- public host ports for internal-only services unless explicitly needed.
- `latest` image tags in production guidance.
- any instruction for bypassing regional, identity or monetization controls.

## Audit conclusion

The donor is valuable as a visual proof of concept and integration reference. It should not be extended in place into a 1000-item batch system. The new system needs durable state, backpressure, idempotency, storage isolation, validated contracts, explicit quality gates and manual approval from the start.
