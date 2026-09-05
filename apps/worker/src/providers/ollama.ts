import { VideoScriptSchema, type VideoScript } from "@content-factory/shared";

export type ScriptRequest = {
  topic: string;
  language: string;
  targetDurationSec: number;
  notes?: string | null;
};

export interface ScriptProvider {
  readonly name: string;
  readonly model: string;
  generate(input: ScriptRequest): Promise<VideoScript>;
}

export class OllamaScriptProvider implements ScriptProvider {
  readonly name = "ollama";
  readonly model = process.env.OLLAMA_MODEL ?? "llama3.1:8b";
  private readonly baseUrl = process.env.OLLAMA_URL ?? "http://localhost:11434";

  async generate(input: ScriptRequest): Promise<VideoScript> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        format: "json",
        prompt: buildPrompt(input),
        options: { temperature: 0.55 }
      }),
      signal: AbortSignal.timeout(Number(process.env.LLM_TIMEOUT_MS ?? 120_000))
    });
    if (!response.ok) throw new Error(`Ollama returned HTTP ${response.status}`);
    const body = await response.json() as { response?: string };
    if (!body.response) throw new Error("Ollama response did not contain JSON text");
    let candidate: unknown;
    try { candidate = JSON.parse(body.response); }
    catch { throw new Error("Ollama returned malformed JSON"); }
    return VideoScriptSchema.parse(candidate);
  }
}

function buildPrompt(input: ScriptRequest): string {
  return `Create one original vertical-video draft about the topic below.
Return JSON only. Do not invent metrics, personal results, links or sources.
If a factual claim may be disputed or needs a current source, set fact_check_required=true and add a source_notes item with verification_status="needs_review".
Always set source_url=null. Never mark a source note as verified; only verified research input supplied outside the model may do that.
Use scene indexes starting at 0. Scene durations must sum to approximately ${input.targetDurationSec} seconds.
Each visual must be original, owned, generated, licensed stock, a screen recording, a motion graphic or a text card.
Topic: ${input.topic}
Language: ${input.language}
Target duration: ${input.targetDurationSec}
Operator notes: ${input.notes ?? "none"}

Required JSON shape:
{
  "title": "string",
  "description": "string",
  "hook": "string",
  "language": "${input.language}",
  "target_duration_sec": ${input.targetDurationSec},
  "fact_check_required": true,
  "scenes": [{
    "index": 0,
    "duration_sec": 5,
    "voiceover": "string",
    "subtitle": "string",
    "visual_type": "generated_image|owned_footage|licensed_stock|screen_recording|motion_graphic|text_card",
    "visual_prompt": "string",
    "stock_query": null,
    "transition": "cut|fade|crossfade|slide|zoom"
  }],
  "cta": "string",
  "source_notes": [{
    "claim": "string",
    "source_url": null,
    "source_title": "string",
    "verification_status": "needs_review|not_applicable",
    "note": "string"
  }]
}`;
}
