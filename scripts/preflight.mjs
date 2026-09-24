import { spawnSync } from "node:child_process";

const failures = [];
const warnings = [];
const [major, minor, patch] = process.versions.node.split(".").map(Number);

if (major !== 22 || minor < 22 || (minor === 22 && patch < 3)) {
  failures.push(`Node 22.22.3+ is required; found ${process.versions.node}. Use nvm use or Docker Compose.`);
}

const ffmpeg = spawnSync(process.env.FFMPEG_PATH ?? "ffmpeg", ["-hide_banner", "-filters"], { encoding: "utf8" });
if (ffmpeg.error) {
  warnings.push("FFmpeg is not available on the host. Docker rendering can still be used.");
} else if (ffmpeg.status !== 0) {
  warnings.push(`FFmpeg capability check failed with exit code ${ffmpeg.status}. Docker rendering is recommended.`);
} else if (!/\bdrawtext\b/.test(`${ffmpeg.stdout}\n${ffmpeg.stderr}`)) {
  warnings.push("Host FFmpeg has no drawtext filter. Use the Docker worker, or install ffmpeg-full on macOS.");
}

for (const warning of warnings) console.warn(`WARN: ${warning}`);
if (failures.length) {
  for (const failure of failures) console.error(`ERROR: ${failure}`);
  process.exit(1);
}
console.log("Content Factory preflight passed.");
