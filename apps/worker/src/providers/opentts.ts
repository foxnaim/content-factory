export interface VoiceProvider {
  readonly name: string;
  synthesize(text: string, language: string): Promise<Buffer | null>;
}

export class OpenTtsProvider implements VoiceProvider {
  readonly name = "opentts";
  private readonly baseUrl = process.env.OPENTTS_URL?.replace(/\/$/, "");

  async synthesize(text: string, _language: string): Promise<Buffer | null> {
    if (!this.baseUrl) return null;
    const url = new URL(`${this.baseUrl}/api/tts`);
    url.searchParams.set("voice", process.env.OPENTTS_VOICE ?? "en_US-amy-medium");
    url.searchParams.set("text", text);
    const response = await fetch(url, { signal: AbortSignal.timeout(Number(process.env.TTS_TIMEOUT_MS ?? 120_000)) });
    if (!response.ok) throw new Error(`OpenTTS returned HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }
}
