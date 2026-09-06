# Использование с Codex

## Вариант 1: из репозитория

Открой Content Factory как проект в Codex и попроси применить skill по пути, например:

```text
Используй skills/shorts-scriptwriter/SKILL.md.
Тема: Why web-form leads disappear.
Аудитория: owners of small service businesses.
Язык: en. Длительность: 35 секунд.
Не добавляй факты, которых нет во входе.
Сохрани результат как черновик для review.
```

Codex прочитает `SKILL.md`, а затем только нужные references/templates. Такой способ не изменяет глобальную установку.

## Вариант 2: локальная установка skills

Скопируй нужные каталоги в пользовательскую папку Codex и перезапусти Codex:

```bash
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R skills/shorts-scriptwriter "${CODEX_HOME:-$HOME/.codex}/skills/"
cp -R skills/shorts-retention-audit "${CODEX_HOME:-$HOME/.codex}/skills/"
```

После перезапуска skill можно вызвать как `$shorts-scriptwriter`. Устанавливай только нужные модули; не копируй секреты и `.env`.

## Codex subscription внутри worker

Приложение умеет использовать уже авторизованный локальный Codex CLI для стадии script. В `.env` на компьютере владельца:

```env
LLM_PROVIDER=codex-cli
CODEX_CLI_PATH=/Applications/ChatGPT.app/Contents/Resources/codex
SCRIPT_CONCURRENCY=1
```

Запусти script/voice worker на host, а assets/render/notify в Docker, как описано в README. Авторизационные файлы Codex не монтируются в контейнер и не передаются пользователям проекта.

Текущий `codex-cli` provider использует строгую JSON Schema сценария. Skills улучшают редакционную подготовку, но не отменяют Zod-валидацию, quality gate и human review.

## Claude Code

Базовый `SKILL.md` использует общий Agent Skills формат, поэтому Claude Code может читать его напрямую по пути проекта. Без установки:

```text
Прочитай skills/faceless-video-storyboard/SKILL.md и примени его к утверждённому сценарию.
```

Claude CLI на машине аудита не установлен, поэтому локальная установка и отдельный `ScriptProvider` пока не заявлены как проверенные. Перед добавлением автоматического адаптера нужно проверить актуальные CLI flags, условия подписки и изоляцию auth-файлов. До этого используйте path invocation и сохраняйте результат как черновик.

## Проверка установки

```bash
npm run skills:test
```

Дополнительно каждый skill можно проверить официальным локальным validator из `skill-creator`:

```bash
python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/shorts-scriptwriter
```
