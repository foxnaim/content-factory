# Контракт batch

CSV для текущего API: `topic,external_id,language,target_duration_sec,notes`. Рекомендуемые поля редакционного manifest: `format`, `series`, `priority`, `editorial_status`, `duplicate_of`, `fact_check_required`.

JSON: `version`, `channel`, `language`, `publication_mode: manual_only`, `max_videos_per_day`, `items[]`, `duplicate_groups[]`, `qa_sample[]`.

Точные дубли блокируют импорт. Смысловые дубли остаются видимыми для решения редактора.
