# Контракт сценария

Human-readable часть: 10 hooks, 3 angles, выбранный угол, timed script, subtitles, on-screen text, CTA, список проверки фактов.

JSON должен соответствовать `packages/shared/src/schemas/video-script.schema.ts`:

- `title`, `description`, `hook`, `language`, `target_duration_sec`, `fact_check_required`;
- `scenes[]`: `index`, `duration_sec`, `voiceover`, `subtitle`, `visual_type`, `visual_prompt`, `stock_query`, `transition`;
- `cta`, `source_notes[]`.

Не добавляй URL, которых нет во входе. Потенциально спорный claim включает `fact_check_required: true` и `[ТРЕБУЕТСЯ ФАКТЧЕК]` в заметках.
