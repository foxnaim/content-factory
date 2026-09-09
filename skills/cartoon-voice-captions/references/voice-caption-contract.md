# Контракт результата

Верни JSON: `language`, `duration_sec`, `voice`, `cues[]`, `captions[]`, `audio_assets[]`, `mix_targets`, `review_blockers[]`.

`voice` содержит `source`, `voice_id`, `style`, `speed`, `consent_status`, `license_status`. Cues содержат индекс, сцену, начало, конец, текст и direction. Captions содержат индекс, начало, конец, текст, число строк и safe zone.
