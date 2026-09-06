# Реальная проверка Agent Skills

Дата: 2026-09-06.

## Проверенный сценарий

Отдельный `codex exec` был запущен в ephemeral/read-only режиме. Он получил только задачу применить `skills/shorts-scriptwriter/SKILL.md`, вход `examples/demo-inputs/shorts-script-request.json` и строгую JSON Schema проекта. Готовый ответ сохранён как `examples/demo-outputs/forward-test-video-script.json`.

## Результат

- Codex прочитал `SKILL.md` и только указанную им reference `video-script-contract.md`.
- Ответ прошёл JSON Schema на стороне Codex CLI.
- Ответ повторно прошёл `VideoScriptSchema` (Zod) внутри Content Factory.
- Язык: English; целевая и суммарная длительность: 35 секунд; 7 непрерывных сцен.
- В ответе нет внешних URL, client metrics или обещаний результата.
- Fictional UI явно маркируется как demo, финал остаётся draft for human review.

## Что ещё проверено

- Все восемь skills проходят официальный `quick_validate.py` из `skill-creator`.
- Общий структурный/security validator проверяет frontmatter, обязательные разделы, ресурсы, примеры, ссылки, unfinished TODO и очевидные token patterns.
- Batch planner прошёл positive test на 10 тем и negative test на точный дубль.
- Проектный Vitest проверяет Zod-контракт обоих сценариев, импорт batch, asset blockers и длину Telegram-поста.

Эта проверка подтверждает формат и наблюдаемое поведение на одном тестовом запросе. Она не гарантирует одинаковое качество любого LLM-ответа; каждый результат всё равно проходит schema, quality gate и human review.
