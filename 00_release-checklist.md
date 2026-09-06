# Release checklist

- [ ] `research/candidate-skills.md` содержит источники, лицензии, даты и verdict.
- [ ] Все восемь skills проходят `npm run skills:test`.
- [ ] Каждый `SKILL.md` проходит `quick_validate.py`.
- [ ] Demo inputs/outputs перечитаны человеком; факты и личные результаты не выдуманы.
- [ ] JSON сценария проходит Zod tests Content Factory.
- [ ] Batch CSV/JSON проходит импорт 10–1000 и duplicate checks.
- [ ] Asset manifest не содержит `unknown` для production-файлов.
- [ ] Секреты не попали в Git (`.env`, токены, cookies, auth files).
- [ ] README, AGENTS, CONTRIBUTING, SECURITY и implementation status актуальны.
- [ ] `npm test`, `npm run typecheck`, `npm run build`, `npm run compose:config` прошли.
- [ ] Финальные видео просмотрены на телефоне; captions и safe zones проверены.
- [ ] Публикация выполняется только вручную после отдельного решения владельца.
