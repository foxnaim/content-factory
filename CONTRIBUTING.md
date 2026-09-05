# Contributing

Content Factory accepts changes that keep the pipeline review-first, traceable and safe to run locally.

## Development check

```bash
npm ci
npm run db:generate
npm test
npm run typecheck
npm run build
npm run compose:config
```

For runtime changes, also exercise the affected API or worker stage with PostgreSQL, Redis and MinIO. Include the failure case you tested in the pull request.

## Project rules

- Never commit credentials, tokens, personal data or provider authentication directories.
- Keep YouTube and Telegram publication out of the pipeline. `approved` means ready to download.
- Keep all LLM output behind the shared Zod contract and quality gate.
- Preserve idempotency for imports, jobs, assets and notifications.
- Record source and license information for every external asset.
- Do not add view manipulation, fake accounts, platform-check bypasses or unlicensed content collection.
- Update the README and implementation status when support or verification claims change.

The donor proof of concept remains in `legacy/autotube-v1/` for attribution and audit evidence. Do not edit that snapshot unless the checksums and audit notes are updated together.
