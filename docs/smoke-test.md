# Local end-to-end smoke test

Date: 2026-09-06
Host: macOS, Docker Desktop, Node.js 22, local Codex CLI subscription adapter

## Scope

The smoke test exercised the production Compose services for PostgreSQL, Redis, MinIO, API, web and the media worker. Script generation ran in a separate host worker with `WORKER_STAGES=script`; Codex ran ephemerally in a read-only temporary directory. Telegram notifications and every publication path remained disabled.

## Verified path

1. Created a project and channel through the API.
2. Imported the 10-item JSON example.
3. Replayed the same idempotency key and received the same batch.
4. Changed the body under the same idempotency key and received HTTP 409.
5. Attempted a 9-item import and received HTTP 400.
6. Queued an individual draft, then queued the remaining batch.
7. Generated and validated all 10 scripts through the local Codex CLI.
8. Confirmed that three scripts with potentially disputable claims stopped at `qa_pending`.
9. Ran the asset manifest, silent voice fallback and FFmpeg stages for the seven scripts that passed the automatic gate.
10. Downloaded six corrected outputs through browser-safe signed MinIO URLs and inspected a four-frame contact sheet for each.
11. Left five drafts at `ready_for_review`, approved one corrected draft and kept the earlier defective draft rejected.
12. Attempted a second terminal review decision on the approved draft and received HTTP 400.

## Output checks

- Container: MP4
- Video: H.264, 1080 × 1920, 30 fps
- Duration: exactly 40.000 seconds
- Output size: 271,529 bytes
- MP4 SHA-256: `ab43f2db26169b20178717a2992cf9f2d9b2e3239c35f775f08e1d38af606bc8`
- Contact-sheet SHA-256: `3804dbaa640c03f789c0cb998c59e5601eed4581257a9a90c695e64b445a1064`

The final six-output contact sheet showed every sampled subtitle state inside the vertical safe area. Its SHA-256 is `53c76aace7fac76f189e609bb82794ee3682931bdc76e2b85cedf4f2cbbc9a24`.

Final batch state:

- 10/10 scripts generated and schema-validated;
- 3 at `qa_pending` for human fact checking;
- 5 at `ready_for_review`;
- 1 approved after visual review;
- 1 rejected after visual review;
- 0 automatic publications.

## Defect caught during the same run

The first rendered draft exposed subtitle overflow. That draft was rejected through the real review endpoint. The renderer was changed to wrap subtitle lines, reduce the font size and split long tokens. Renderer tests were added, and the next draft completed all five stages on the first attempt and passed visual review.

A later multi-item retry exposed a workspace-relative Codex schema path. The failed jobs were recorded without creating duplicate scripts or assets. The adapter now resolves its default schema from the module location and honors npm's original invocation directory for an explicitly configured relative path; regression tests cover this behavior.

## Boundaries of this evidence

- The complete 10-item script batch and seven-item media path are verified. Three scripts correctly stopped before assets rather than bypassing the fact-check gate.
- The Docker media path and host Codex adapter are verified on this macOS host.
- Ollama generation quality, OpenTTS voice compatibility, Telegram delivery and a full Linux runtime remain release checks.
- Approval means editorial approval for download. It never publishes to YouTube or Telegram.
