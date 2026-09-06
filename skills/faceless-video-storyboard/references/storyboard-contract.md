# Контракт storyboard

Для каждой сцены: `index`, `start_sec`, `duration_sec`, `voiceover`, `visual_type`, `visual_description`, `stock_query`, `generation_prompt`, `transition`, `on_screen_text`, `safe_zone_note`, `asset_ids[]`.

Manifest для каждого ассета: `asset_id`, `scene_index`, `source`, `owner`, `license`, `license_url`, `retrieved_at`, `allowed_use`, `verification_status`.

Допустимые `verification_status`: verified, generated_terms_checked, owned, needs_verification, blocked. Последние два не допускаются в production.
