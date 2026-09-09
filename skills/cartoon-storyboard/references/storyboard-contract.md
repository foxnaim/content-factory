# Контракт результата

Верни JSON: `title`, `audience`, `format`, `target_duration_sec`, `style_bible`, `characters[]`, `scenes[]`, `review_blockers[]`.

Каждый персонаж содержит `id`, `role`, `appearance`, `wardrobe`, `continuity_anchors`. Каждая сцена содержит `index`, `start_sec`, `duration_sec`, `story_beat`, `action`, `emotion`, `camera`, `background`, `continuity_anchors`, `visual_prompt`, `negative_prompt`, `on_screen_text`, `asset_status`.

Индексы идут с 1 без пропусков. Сцены не пересекаются и заканчиваются на `target_duration_sec`.
