# Сопоставление статусов

Редакционный skill планирует контент до и после работы приложения. Текущий runtime Content Factory использует более подробные технические статусы.

| Редакционный статус | Runtime Content Factory |
|---|---|
| `idea` | ещё не импортирован или `draft` после импорта |
| `research` | внешний редакционный этап до queue |
| `script_draft` | `scripting` или `script_ready` |
| `review` | ручной просмотр сценария до визуалов |
| `approved` | разрешение продолжить производство; не равно финальному runtime `approved` |
| `rendered` | `rendering` завершён |
| `qa_pending` | `qa_pending` |
| `ready_to_publish` | `ready_for_review` и отдельно одобрен редактором |
| `published` | внешняя ручная запись; runtime не публикует |
| `rejected` | `rejected` |

Не передавай редакционный `published` в worker и не добавляй upload job.
