#!/usr/bin/env node

import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = resolve(repositoryRoot, "skills");
const requiredSkills = [
  "youtube-niche-research",
  "shorts-scriptwriter",
  "shorts-retention-audit",
  "youtube-title-thumbnail",
  "faceless-video-storyboard",
  "youtube-originality-qa",
  "content-factory-batch-planner",
  "telegram-repurpose",
];
const requiredHeadings = [
  "## Ограничения и что нельзя утверждать",
  "## Контроль качества перед выдачей результата",
];
const demoOutputs = {
  "youtube-niche-research": "niche-research.md",
  "shorts-scriptwriter": "forward-test-video-script.json",
  "shorts-retention-audit": "retention-audit.md",
  "youtube-title-thumbnail": "title-thumbnail.md",
  "faceless-video-storyboard": "storyboard.json",
  "youtube-originality-qa": "originality-qa.md",
  "content-factory-batch-planner": "batch/batch-manifest.json",
  "telegram-repurpose": "telegram-package.md",
};

async function filesBelow(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = resolve(directory, entry.name);
    return entry.isDirectory() ? filesBelow(absolute) : [absolute];
  }));
  return nested.flat();
}

for (const skillName of requiredSkills) {
  const skillRoot = resolve(skillsRoot, skillName);
  const skillFile = resolve(skillRoot, "SKILL.md");
  const content = await readFile(skillFile, "utf8");
  assert.match(content, /^---\nname: [a-z0-9-]+\ndescription: .+\n---/s, `${skillName}: invalid frontmatter`);
  assert.match(content, new RegExp(`^name: ${skillName}$`, "m"), `${skillName}: name mismatch`);
  assert.ok(!content.includes("TODO"), `${skillName}: unfinished TODO`);
  for (const heading of requiredHeadings) assert.ok(content.includes(heading), `${skillName}: missing ${heading}`);
  for (const folder of ["references", "templates", "examples", "tests"]) {
    const files = await filesBelow(resolve(skillRoot, folder));
    assert.ok(files.length > 0, `${skillName}: ${folder} is empty`);
  }
  const examples = await readFile(resolve(skillRoot, "examples/good-and-bad.md"), "utf8");
  assert.equal((examples.match(/^## Хороший пример /gm) ?? []).length, 2, `${skillName}: needs two good examples`);
  assert.equal((examples.match(/^## Плохой пример /gm) ?? []).length, 2, `${skillName}: needs two bad examples`);
  const localLinks = [...content.matchAll(/\]\((?!https?:|#)([^)]+)\)/g)].map((match) => match[1]);
  for (const localLink of localLinks) await access(resolve(skillRoot, localLink));
  await access(resolve(repositoryRoot, "examples/demo-outputs", demoOutputs[skillName]));
}

const allSkillFiles = (await filesBelow(skillsRoot)).filter((file) => !file.includes("node_modules"));
for (const file of allSkillFiles) {
  if (!/\.(md|ya?ml|mjs)$/.test(file)) continue;
  const content = await readFile(file, "utf8");
  assert.ok(!/[0-9]{8,10}:AA[A-Za-z0-9_-]{25,}/.test(content), `${file}: possible Telegram bot token`);
  assert.ok(!/sk-[A-Za-z0-9_-]{24,}/.test(content), `${file}: possible API key`);
  assert.ok(!/viral guaranteed|guaranteed monetization|guaranteed views/i.test(content), `${file}: prohibited promise`);
}

console.log(`skills validation: ${requiredSkills.length} skills, ${allSkillFiles.length} files, passed`);
