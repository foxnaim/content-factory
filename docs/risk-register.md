# Risk register

Scale: likelihood and impact from 1 (low) to 5 (high). Score = likelihood × impact.

| ID | Risk | L | I | Score | Mitigation | Detection/owner |
|---|---|---:|---:|---:|---|---|
| R01 | 1000-item import overwhelms CPU/GPU/provider quota | 4 | 5 | 20 | Stage queues, concurrency env vars, backpressure, per-batch pause | Queue depth/latency; operator |
| R02 | Duplicate delivery creates duplicate scripts/assets/videos | 4 | 5 | 20 | Deterministic job IDs, unique DB keys, input hashes, idempotent object keys | Duplicate constraint events; API/worker |
| R03 | LLM returns invalid or invented content | 4 | 5 | 20 | Strict Zod parse, source notes, fact-check flag, no permissive fallback | Quality-gate failures; editor |
| R04 | Generated items become too similar within a batch | 4 | 4 | 16 | Lexical detector now, embeddings interface later, hold/reject threshold | Similarity report; editor |
| R05 | Unlicensed stock or copied visuals enter a render | 3 | 5 | 15 | Required source/license manifest and evidence before render | Manifest gate; asset owner |
| R06 | Automatic notification accidentally becomes publishing | 2 | 5 | 10 | Telegram adapter accepts readiness text only; no media publish service or YouTube credentials | Contract/integration tests; maintainer |
| R07 | Credentials leak through repository or logs | 3 | 5 | 15 | `.env` ignore, placeholders, redaction, no query signatures in logs | secret scan; maintainer |
| R08 | FFmpeg command injection or path traversal | 3 | 5 | 15 | Generated object keys, temp dirs, `spawn` argument arrays, allowlisted codecs | security tests; worker |
| R09 | Provider outage/rate limit stalls batches | 4 | 4 | 16 | Timeout, retry classification, exponential backoff, provider adapters, pause | error rate; worker/operator |
| R10 | Permanent validation errors retry forever | 3 | 4 | 12 | Non-retryable typed errors and max attempts | attempts/exhausted jobs; worker |
| R11 | Redis loss is treated as data loss | 2 | 5 | 10 | PostgreSQL source of truth; reconciliation command is required before production | reconciliation report; API |
| R12 | PostgreSQL/MinIO state diverges | 3 | 4 | 12 | Checksums and metadata now; orphan scan and repair job required before production | integrity job; operator |
| R13 | Huge files exhaust local disk | 4 | 4 | 16 | Local-only default; quotas, cleanup and work-bucket TTL required before remote use | disk/object usage alert; operator |
| R14 | Local AI model exceeds host memory | 4 | 3 | 12 | optional Compose profile, documented model sizing, concurrency 1 default | health/OOM events; operator |
| R15 | OpenTTS image/model is unavailable on host architecture | 3 | 3 | 9 | provider interface, pinned tested image, external/local fallback documentation | readiness check; maintainer |
| R16 | `latest` dependency update breaks reproducibility | 4 | 4 | 16 | pin npm lockfile and container versions; scheduled updates | CI/build; maintainer |
| R17 | Review queue becomes bottleneck | 4 | 3 | 12 | Visible item states and clear rejection reasons now; review filters and age alerts planned | age at `ready_for_review`; editor |
| R18 | Approval is mistaken for platform compliance guarantee | 3 | 4 | 12 | approval language says editorial acceptance only; current platform checklist | checklist revision date; editor |
| R19 | Unsupported/fake URLs are generated as sources | 3 | 5 | 15 | Current model output is blocked from supplying URLs or self-verifying sources; a verified research adapter is future work | quality gate; editor |
| R20 | Telegram bot token gains excessive permissions | 2 | 4 | 8 | notifications-only bot/chat, token outside repo, no channel posting code | bot permission review; operator |
| R21 | API endpoints are exposed without auth | 3 | 5 | 15 | local-only default binding; auth/RBAC required before remote deployment | deployment checklist; maintainer |
| R22 | Malicious CSV/JSON payload causes resource abuse | 3 | 4 | 12 | file/row/field limits, MIME parsing, formula neutralization on export | import rejects; API |
| R23 | Donor attribution/license is lost | 2 | 3 | 6 | preserve MIT license, legacy snapshot and attribution | release checklist; maintainer |
| R24 | User expects financial results from the tool | 3 | 4 | 12 | describe it as draft production/review system; never promise views, YPP or income | copy review; project owner |

## Release blockers

The following risks block a public release until their mitigations are verified: R02, R03, R05, R06, R07, R08, R12, R21 and R23.
