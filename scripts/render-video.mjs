import { copyFile, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { VideoScriptSchema } from "@content-factory/shared";
import { FfmpegRenderer } from "../apps/worker/dist/renderer/ffmpeg.js";

const [inputArg, outputArg, audioArg, sceneDirectoryArg] = process.argv.slice(2);
if (!inputArg || !outputArg) {
  console.error("Usage: node scripts/render-video.mjs <script.json> <output.mp4> [voice.wav] [scene-image-directory]");
  process.exit(2);
}

const inputPath = resolve(inputArg);
const outputPath = resolve(outputArg);
const audioPath = audioArg ? resolve(audioArg) : undefined;
const sceneImagePaths = sceneDirectoryArg
  ? (await readdir(resolve(sceneDirectoryArg))).filter((name) => /\.(png|jpe?g|webp)$/i.test(name)).sort().map((name) => resolve(sceneDirectoryArg, name))
  : [];
const script = VideoScriptSchema.parse(JSON.parse(await readFile(inputPath, "utf8")));
const renderer = new FfmpegRenderer();
const result = await renderer.render(script, audioPath, sceneImagePaths);
try {
  await copyFile(result.videoPath, outputPath);
  console.log(outputPath);
} finally {
  await result.cleanup();
}
