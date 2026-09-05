import { afterEach, describe, expect, it } from "vitest";
import { createVoiceProvider } from "../src/providers/voice.js";

const originalProvider = process.env.TTS_PROVIDER;

afterEach(() => {
  if (originalProvider === undefined) delete process.env.TTS_PROVIDER;
  else process.env.TTS_PROVIDER = originalProvider;
});

describe("voice provider selection", () => {
  it("can deliberately create silent drafts", () => {
    process.env.TTS_PROVIDER = "none";
    expect(createVoiceProvider().name).toBe("none");
  });

  it("selects the host-only macOS voice provider explicitly", () => {
    process.env.TTS_PROVIDER = "macos-say";
    expect(createVoiceProvider().name).toBe("macos-say");
  });

  it("selects the local neural Kokoro provider explicitly", () => {
    process.env.TTS_PROVIDER = "kokoro-mlx";
    expect(createVoiceProvider().name).toBe("kokoro-mlx");
  });
});
