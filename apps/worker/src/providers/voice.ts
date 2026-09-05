import { KokoroMlxProvider } from "./kokoro-mlx.js";
import { MacOsSayProvider } from "./macos-say.js";
import { OpenTtsProvider, type VoiceProvider } from "./opentts.js";

class NoVoiceProvider implements VoiceProvider {
  readonly name = "none";
  async synthesize(): Promise<null> { return null; }
}

export function createVoiceProvider(): VoiceProvider {
  const provider = process.env.TTS_PROVIDER?.trim().toLowerCase();
  if (provider === "kokoro-mlx") return new KokoroMlxProvider();
  if (provider === "macos-say") return new MacOsSayProvider();
  if (provider === "opentts") return new OpenTtsProvider();
  if (provider === "none") return new NoVoiceProvider();
  return process.env.OPENTTS_URL ? new OpenTtsProvider() : new NoVoiceProvider();
}
