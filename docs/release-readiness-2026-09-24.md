# Release readiness — 24 September 2026

This file records observed checks. It does not replace a clean-machine release test.

## Passed

- `npm ci` completed in a selective clean copy with Node dependencies installed from the lockfile.
- `npm test`: 11 test files, 40 tests passed.
- `npm run typecheck`: shared, database, API, worker and web passed.
- Production builds passed for shared, database, API and worker.
- Next.js production build passed with the supported webpack builder. Turbopack could not bind an internal local port in the restricted test sandbox; this was an environment restriction, not a TypeScript or page build error.
- Docker Compose configuration validates with `.env.example`.
- PostgreSQL migration completed in the earlier unrestricted smoke-test.
- API and dashboard routes returned HTTP 200 in the earlier unrestricted smoke-test.
- A 10-item batch imported, deterministic replay returned the same batch, a changed payload under the same idempotency key returned HTTP 409, and duplicate topics returned HTTP 400.
- A real Codex subscription run produced a Zod-valid 35-second script, stored it in PostgreSQL and moved the item to `script_ready` without a separate model API key.
- MinIO server and client images were replaced with pinned Quay images whose manifests exist.
- MinIO reached healthy state, `minio-init` created source/work/output buckets, and API readiness reported database, Redis and object storage reachable.
- The installed local `qwen2.5-coder:14b` model returned `LOCAL_OK` in a direct Ollama CLI test before the sandbox was restricted.

## Fixed during readiness work

- Codex CLI automation ignores personal model/provider configuration by default while preserving the signed-in account authorization.
- One-based scene indexes from an otherwise valid model response are normalized deterministically before Zod validation.
- Script-only workers no longer require MinIO.
- The renderer fails early with an actionable error when FFmpeg lacks `drawtext`.
- Docker MinIO references no longer use the removed Docker Hub images.
- MinIO healthcheck uses the image-supported `mc ready local` command.
- `.dockerignore` excludes host dependencies, builds, videos, local outputs and secrets from Docker contexts.
- Worker APT installation retries transient downloads.
- `.nvmrc` and preflight checks make the required Node and FFmpeg capabilities explicit.

## Still required before calling the public release complete

1. Run the Docker worker through `assets → voice → render → notify` for the tested `script_ready` item.
2. Confirm the resulting MP4 with `ffprobe`, minimum file size, expected 9:16 dimensions and duration close to the script target.
3. Confirm the MP4 and metadata appear in MinIO and the item reaches `ready_for_review`.
4. Exercise approve, reject and download from the dashboard on that real rendered item.
5. Repeat the documented quick start on a clean macOS or Linux checkout.

The current restricted task sandbox cannot access the Docker Desktop socket or localhost services, so the final render check remains pending. Do not advertise the repository as fully release-ready until these five checks pass.

