import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { VideoScriptSchema } from "@content-factory/shared";
import { createVoiceProvider } from "../apps/worker/dist/providers/voice.js";

const [inputArg, outputArg] = process.argv.slice(2);
if (!inputArg || !outputArg) {
  console.error("Usage: TTS_PROVIDER=kokoro-mlx npm run demo:video -- <script.json> <output.mp4>");
  process.exit(2);
}

const script = VideoScriptSchema.parse(JSON.parse(await readFile(resolve(inputArg), "utf8")));
const voiceProvider = createVoiceProvider();
const audio = await voiceProvider.synthesize(script.scenes.map((scene) => scene.voiceover).join(" "), script.language);
if (!audio) throw new Error("The selected voice provider returned no audio. Set TTS_PROVIDER=kokoro-mlx, macos-say, or configure OpenTTS.");

const outputPath = resolve(outputArg);
await mkdir(dirname(outputPath), { recursive: true });
const directory = await mkdtemp(join(process.cwd(), ".content-factory-demo-"));
const scriptPath = join(directory, "script.json");
const audioPath = join(directory, "voice.wav");
try {
  await writeFile(scriptPath, JSON.stringify(script));
  await writeFile(audioPath, audio);
  if (process.env.DEMO_SKIP_DOCKER_BUILD !== "1") {
    await run("docker", ["compose", "--env-file", ".env.example", "build", "worker"]);
  }
  await run("docker", [
    "run", "--rm",
    "-v", `${directory}:/input:ro`,
    "-v", `${dirname(outputPath)}:/exports`,
    process.env.DEMO_WORKER_IMAGE ?? "content-factory-worker",
    "node", "scripts/render-video.mjs",
    "/input/script.json", `/exports/${basename(outputPath)}`, "/input/voice.wav"
  ]);
  const rendered = await stat(outputPath);
  if (rendered.size < 10_000) throw new Error("The demo render is unexpectedly small");
  console.log(JSON.stringify({
    output: outputPath,
    bytes: rendered.size,
    voice_provider: voiceProvider.name,
    renderer: "cartoon-board-v1",
    render_runtime: "docker"
  }));
} finally {
  await rm(directory, { recursive: true, force: true });
}

async function run(command, args) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", rejectPromise);
    child.on("close", (code) => code === 0 ? resolvePromise() : rejectPromise(new Error(`${command} exited ${code}`)));
  });
}
