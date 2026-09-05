# Planned file set for MVP v2

This list was created after the donor audit and before implementation.

```text
content-factory/
├── .env.example
├── .gitignore
├── .nvmrc
├── Dockerfile.api
├── Dockerfile.web
├── Dockerfile.worker
├── README.md
├── docker-compose.yml
├── package.json
├── package-lock.json
├── tsconfig.base.json
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── health.controller.ts
│   │       ├── projects.controller.ts
│   │       ├── batches.controller.ts
│   │       ├── items.controller.ts
│   │       └── services/
│   │           ├── batches.service.ts
│   │           ├── queue.service.ts
│   │           └── storage.service.ts
│   ├── web/
│   │   ├── package.json
│   │   ├── next.config.mjs
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.mjs
│   │   └── src/
│   │       ├── app/
│   │       ├── components/
│   │       └── lib/
│   └── worker/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── pipeline.worker.ts
│           ├── quality-gate.ts
│           ├── duplicate-detector.ts
│           ├── providers/
│           ├── renderer/
│           └── notifier/
├── packages/
│   ├── shared/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── schemas/video-script.schema.ts
│   │   │   ├── schemas/import.schema.ts
│   │   │   ├── contracts/jobs.ts
│   │   │   ├── lifecycle.ts
│   │   │   └── csv.ts
│   │   └── test/
│   └── database/
│       ├── package.json
│       ├── tsconfig.json
│       ├── prisma/schema.prisma
│       └── src/index.ts
├── docs/
│   ├── donor-audit.md
│   ├── target-architecture.md
│   ├── migration-plan.md
│   ├── risk-register.md
│   ├── proposed-files.md
│   └── implementation-status.md
└── legacy/
    └── autotube-v1/
        ├── README.md
        ├── short_automation/
        └── SHA256SUMS
```

The checked-in donor workflow remains unchanged. New functionality is implemented beside it and the preserved snapshot records the migration source.
