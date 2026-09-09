# Content Factory Agent Skills

Eleven original, modular skills for research, scripting, packaging, visual planning, cartoon production planning, QA, batch preparation and Telegram repurposing. Instructions are Russian; fields intended for an English-language channel are generated in English.

The three cartoon skills can be used independently of the unfinished Content Factory runtime:

- `cartoon-storyboard` prepares scenes, character continuity and asset provenance;
- `cartoon-voice-captions` prepares consent-aware voice direction, cues and captions;
- `cartoon-render-qa` checks an actual MP4 and never publishes it automatically.

They guide an agent that already has suitable image, audio and render tools. Installing a skill does not itself install FFmpeg, a voice model or an image generator.

Every skill contains:

- `SKILL.md` with focused activation guidance;
- an output contract in `references/`;
- input/output templates;
- two good and two bad examples;
- a test checklist;
- optional deterministic scripts only where code improves reliability.

Use [the selection map](../docs/skill-selection.md) and [Codex guide](../docs/how-to-use-with-codex.md). Validate with `npm run skills:test` from the repository root.

The skills are original project work covered by the repository MIT license. External candidates were audited for ideas only; see [candidate audit](../research/candidate-skills.md).
