# Content Factory: что мы сделали и как этим пользоваться

## Что это за проект

Content Factory — self-hosted система для пакетной подготовки 10–1000 черновиков вертикальных видео. Она помогает пройти путь от списка тем до сценария, ассетов, голоса, рендера и ручного review. Она не накручивает показатели и не публикует ролики автоматически.

Проект начался с MIT-репозитория Autotube. Исходный donor сохранён в `legacy/`, а рабочая архитектура написана как TypeScript-монорепозиторий:

- `apps/web` — dashboard;
- `apps/api` — NestJS API;
- `apps/worker` — BullMQ workers;
- `packages/shared` — Zod/JSON contracts и lifecycle;
- `packages/database` — PostgreSQL/Prisma;
- Redis — очереди и retry;
- MinIO — исходники и готовые файлы;
- FFmpeg — рендер;
- n8n — только ручные интеграции/уведомления;
- `skills/` — редакционные Agent Skills для Codex/совместимых агентов.

## Как проходит один ролик

1. Автор выбирает тему или создаёт batch через `youtube-niche-research` и `content-factory-batch-planner`.
2. `shorts-scriptwriter` готовит English script/voiceover/subtitles и строгий JSON.
3. `shorts-retention-audit` проверяет первые секунды, payoff и слабые места.
4. `youtube-title-thumbnail` готовит честную упаковку.
5. `faceless-video-storyboard` создаёт сцены и manifest прав на ассеты.
6. `youtube-originality-qa` ищет copied/reused/generic/unsupported риски.
7. После явной queue action workers создают ассеты, голос и MP4. Временные ошибки повторяются с exponential backoff, job IDs защищают от дублей.
8. Спорные факты останавливаются на `qa_pending`; готовое видео — на `ready_for_review`.
9. Человек смотрит сценарий, sources, manifest, logs и preview, затем выбирает approve/reject/download.
10. Публикация выполняется вручную вне Content Factory.

## Первый запуск на macOS/Linux

```bash
cp .env.example .env
npm install
npm run db:generate
docker compose up --build
```

Открыть dashboard: `http://localhost:3000`. API: `http://localhost:3001/api/health/live`. MinIO console: `http://localhost:9001`.

Для локального нейронного голоса на Apple Silicon:

```bash
npm run setup:kokoro
```

Для использования своей подписки Codex на стадии сценария укажи локальный `LLM_PROVIDER=codex-cli` по инструкции [how-to-use-with-codex.md](how-to-use-with-codex.md). Авторизационные файлы не копируются в Docker.

## Как подготовить batch

Самый простой вход — JSON из 10–1000 объектов или CSV с колонками:

```csv
topic,external_id,language,target_duration_sec,notes
Why form leads disappear,item-001,en,35,Use an owned screen recording
```

Проверить и нормализовать список до API:

```bash
node skills/content-factory-batch-planner/scripts/normalize-batch.mjs \
  --input examples/demo-inputs/batch-topics.json \
  --out-dir /tmp/content-factory-batch \
  --channel "Build with Yan" \
  --language en \
  --max-per-day 2
```

Скрипт создаст `normalized.csv` и `batch-manifest.json`, но не поставит ничего на публикацию.

## Как использовать skills без запуска сервера

Открой репозиторий в Codex и напиши:

```text
Используй skills/shorts-scriptwriter/SKILL.md и мой вход ниже.
Верни English script и JSON для Content Factory. Ничего не публикуй.
```

Готовую цепочку можно посмотреть в `examples/demo-inputs/` и `examples/demo-outputs/`. Реальный независимый прогон Codex описан в [skills-forward-test.md](skills-forward-test.md).

## Как проверить, что проект не сломан

```bash
npm run skills:test
npm test
npm run typecheck
npm run build
npm run compose:config
```

Для видео отдельно проверяются stream/duration/decode/audio/captions и реальные preview-кадры. Готовые детские demo находятся в `videos/lead-rescue-cartoon` и `videos/lead-rescue-cartoon-v2`.

## Что обязательно проверить руками

- каждый факт и источник;
- реальные данные/скрины автора;
- license/terms каждого ассета;
- соответствие title/thumbnail содержанию;
- субтитры и safe zones на телефоне;
- отсутствие секретов и личных данных;
- финальное видео перед ручной публикацией.

Полные ограничения: [content safety policy](content-safety-policy.md) и [manual review workflow](manual-review-workflow.md).
