# Аудит готовых Agent Skills

Дата проверки: 2026-09-06. Поиск выполнен через GitHub Code Search и GitHub API. На этапе аудита репозитории не клонировались, скрипты не запускались, код в Content Factory не копировался.

`Последняя активность` — дата последнего push, которую вернул GitHub API. Она показывает активность репозитория, но не гарантирует качество или поддержку конкретного skill.

| Название | URL | Лицензия | Последняя активность | Что делает | Подходит ли для Codex | Что можно взять | Риски | Вердикт |
|---|---|---:|---:|---|---|---|---|---|
| OpenAI Skills Catalog | https://github.com/openai/skills | У каждого skill отдельная; общей лицензии нет | 2026-07-14 | Каталог примеров Agent Skills для Codex | Да, но репозиторий помечен deprecated | Формат `SKILL.md`, progressive disclosure, отдельные references/scripts | Нельзя считать весь каталог одной open-source лицензией; текущие примеры перенесены в plugins | Только эталон структуры; проверять лицензию каждого skill отдельно |
| Anthropic Skills | https://github.com/anthropics/skills | Смешанная: часть Apache-2.0, document skills source-available | 2026-09-03 | Примеры skills и спецификация | В основном совместим по базовой структуре | Минимальный frontmatter, самодостаточные папки, разделение инструкций и ресурсов | Не все материалы open source; Claude-специфичные вызовы могут не работать в Codex | Только архитектурный ориентир; не копировать без проверки лицензии файла |
| content-vault / shorts-qa | https://github.com/timscheuerai/content-vault/blob/main/skills/shorts-qa/SKILL.md | MIT | 2026-08-10 | Измеряемый QA видео: decode, audio, captions, cuts, motion, fidelity, retention | Частично; команды привязаны к структуре автора | Принцип «проверять артефакт, а не пересчитывать ожидание», раздельные технический и редакторский QA | Узкие пороги SSIM и структура проекта не универсальны; нет проверки фактов и лицензий | Взять принципы QA, написать собственный контракт |
| content-vault / shorts-edit | https://github.com/timscheuerai/content-vault/blob/main/skills/shorts-edit/SKILL.md | MIT | 2026-08-10 | Монтаж talking-head, captions, motion graphics, QA | Частично | Один финальный encode, cue-anchored graphics, проверка реального кадра | Требует FFmpeg, Python, ElevenLabs API и соседние skills; жёстко привязан к macOS/бренду/проекту | Не включать код; использовать отдельные инженерные идеи |
| danvega / video-shorts | https://github.com/danvega/skills/blob/main/skills/video/shorts/SKILL.md | Не обнаружена | 2026-07-17 | Нарезка long-form в вертикальные клипы, reframe, captions | Формат совместим, исполнение окружение-зависимо | Критерии самостоятельного фрагмента, качество важнее количества, safe zones | Нет ясной лицензии; персональные пути/бренд; зависимости от других skills | Только анализ подхода, без копирования |
| AgriciDaniel / claude-shorts | https://github.com/AgriciDaniel/claude-shorts/blob/main/SKILL.md | MIT | 2026-07-11 | Long-form → short-form с Remotion, captions и оценкой сегментов | Частично | Разделение анализа, монтажного плана, рендера и проверки | Claude-ориентирован; Remotion/FFmpeg; возможны API-зависимости; сегментный score нельзя выдавать за прогноз просмотров | Кандидат для отдельного будущего импортера, не основа текущих skills |
| RichardBray / shorts-writer | https://github.com/RichardBray/skills/blob/main/shorts-writer/SKILL.md | MIT | 2026-08-18 | Написание коротких сценариев | Да на уровне инструкций | Компактный сценарный workflow и вариативность хуков | Недостаточно строгой трассировки фактов, лицензий ассетов и ручных gates | Взять идею модульности, написать с нуля |
| sprut-agent-kit / youtube-seo | https://github.com/AlekseiUL/sprut-agent-kit/blob/main/skills/youtube-seo/SKILL.md | MIT | 2026-06-06 | Titles, descriptions, chapters, tags | Частично | Отделение title, description, chapters и upload tags | Жёстко зашиты бренд/ссылка; встречаются неподтверждённые «optimal» числа и формулировки про стоп-слова; Whisper API | Не копировать; сохранить только проверку соответствия обещания содержанию |
| social-media-skills / social-seo | https://github.com/social-media-skills/skills/blob/main/skills/social-seo/SKILL.md | MIT | 2026-09-03 | Cross-platform search discovery | Да как reasoning skill | Не выдумывать search volume, использовать native autocomplete/analytics, писать под один intent | Много необязательных соседних skills; отдельные тезисы о платформах требуют актуальной проверки | Хороший источник принципов честного SEO; реализация своя |
| glebis / brand-agency | https://github.com/glebis/claude-skills/blob/main/brand-agency/SKILL.md | MIT | 2026-09-02 | Применение фиксированного brand kit | Да, но не решает short-form задачу | Явные tokens: цвет, шрифт, композиция | Чужой бренд; загрузка Google Fonts; нельзя применять как универсальный стиль | Не использовать; собственный визуальный стиль задаётся входом |
| Hermes Audience-Driven Shorts Studio / shorts-qc | https://github.com/eisenblume7/hermes-audience-driven-shorts-studio/blob/main/skills/shorts-qc/SKILL.md | Не обнаружена | 2026-08-24 | Evidence-aware pipeline и human-gated QC | Формат совместим | Трассировка claim → evidence → source, `PENDING_EDITORIAL_REVIEW`, запрет автопубликации | Нет лицензии; нельзя копировать код/текст; проект привязан к своей state machine | Самый близкий по ценностям ориентир, но только концептуальный |

## Что проверялось в содержимом

- YAML frontmatter и понятность момента применения skill.
- Лицензия на уровне репозитория или отдельного skill.
- Упоминания API-ключей, внешних endpoint, загрузчиков и платных сервисов.
- Автопубликация, обход правил, накрутка, перезаливы, серые аккаунты и обещания результата.
- Работа с фактами, источниками, правами на визуалы и ручным review.
- Возможность использовать skill как независимый модуль, а не только внутри авторского окружения.

## Итог аудита

Ни один кандидат не переносится целиком. Наш набор пишется с нуля под контракты Content Factory. Заимствуются только общие инженерные принципы: короткий discriminating frontmatter, progressive disclosure, явные входы/выходы, измеряемый технический QA, отдельный редакторский QA, provenance ассетов, проверка соответствия title/thumbnail содержанию и обязательный human review.

Нельзя заимствовать без дополнительной проверки: чужие скрипты, персональные brand kits, жёсткие числовые «формулы вирусности», интеграции публикации, неизвестные API и материалы из репозиториев без ясной лицензии.
