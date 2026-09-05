import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { VoiceProvider } from "./opentts.js";

export class KokoroMlxProvider implements VoiceProvider {
  readonly name = "kokoro-mlx";

  async synthesize(text: string, language: string): Promise<Buffer> {
    if (process.platform !== "darwin" || process.arch !== "arm64") {
      throw new Error("TTS_PROVIDER=kokoro-mlx requires an Apple Silicon macOS host worker");
    }
    const directory = await mkdtemp(join(tmpdir(), "content-factory-kokoro-"));
    const outputPath = join(directory, "voice.wav");
    const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
    const python = resolve(repositoryRoot, process.env.KOKORO_PYTHON ?? ".venv-kokoro/bin/python");
    const script = resolve(repositoryRoot, process.env.KOKORO_SCRIPT_PATH ?? "scripts/kokoro_tts.py");
    const virtualEnvironment = dirname(dirname(python));
    try {
      await run(python, [
        script,
        "--output", outputPath,
        "--model", process.env.KOKORO_MODEL ?? "mlx-community/Kokoro-82M-bf16",
        "--voice", process.env.KOKORO_VOICE ?? "am_michael",
        "--speed", process.env.KOKORO_SPEED ?? "0.90",
        "--language", language
      ], text, {
        ...process.env,
        VIRTUAL_ENV: virtualEnvironment,
        PATH: `${join(virtualEnvironment, "bin")}:${process.env.PATH ?? ""}`
      });
      return await readFile(outputPath);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}

async function run(command: string, args: string[], input: string, env: NodeJS.ProcessEnv): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, { env, stdio: ["pipe", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += String(chunk).slice(0, 20_000); });
    child.on("error", rejectPromise);
    child.on("close", (code) => code === 0 ? resolvePromise() : rejectPromise(new Error(`Kokoro MLX exited ${code}: ${stderr}`)));
    child.stdin.end(input);
  });
}
