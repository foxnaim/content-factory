import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { VoiceProvider } from "./opentts.js";

export class MacOsSayProvider implements VoiceProvider {
  readonly name = "macos-say";

  async synthesize(text: string, _language: string): Promise<Buffer> {
    if (process.platform !== "darwin") {
      throw new Error("TTS_PROVIDER=macos-say is available only on macOS host workers");
    }
    const directory = await mkdtemp(join(tmpdir(), "content-factory-voice-"));
    const aiffPath = join(directory, "voice.aiff");
    const wavPath = join(directory, "voice.wav");
    try {
      await run("say", [
        "-v", process.env.MACOS_TTS_VOICE ?? "Samantha",
        "-r", process.env.MACOS_TTS_RATE ?? "175",
        "-o", aiffPath,
        text
      ]);
      await run(process.env.FFMPEG_PATH ?? "ffmpeg", [
        "-y", "-hide_banner", "-loglevel", "error",
        "-i", aiffPath,
        "-ar", "48000", "-ac", "1", "-c:a", "pcm_s16le", wavPath
      ]);
      return await readFile(wavPath);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}

async function run(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += String(chunk).slice(0, 20_000); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}: ${stderr}`)));
  });
}
