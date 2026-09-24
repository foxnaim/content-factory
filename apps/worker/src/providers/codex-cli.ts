import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { VideoScriptSchema, type VideoScript } from "@content-factory/shared";
import type { ScriptProvider, ScriptRequest } from "./ollama.js";

/**
 * Uses the operator's already-authenticated local Codex CLI session.
 * This adapter is host-only: do not mount CODEX_HOME or subscription auth into a server container.
 */
export class CodexCliScriptProvider implements ScriptProvider {
  readonly name = "codex-cli";
  readonly model = process.env.CODEX_MODEL || "subscription-default";
  private readonly executable = process.env.CODEX_CLI_PATH || "codex";
  private readonly schemaPath = resolveSchemaPath(process.env.CODEX_OUTPUT_SCHEMA_PATH);

  async generate(input: ScriptRequest): Promise<VideoScript> {
    const directory = await mkdtemp(join(tmpdir(), "content-factory-codex-"));
    const outputPath = join(directory, "video-script.json");
    const args = [
      "exec",
      ...(process.env.CODEX_USE_USER_CONFIG === "true" ? [] : ["--ignore-user-config"]),
      "--ephemeral",
      "--sandbox", "read-only",
      "--skip-git-repo-check",
      "--cd", directory,
      "--output-schema", this.schemaPath,
      "--output-last-message", outputPath,
      "--color", "never"
    ];
    if (process.env.CODEX_MODEL) args.push("--model", process.env.CODEX_MODEL);
    args.push("-");

    try {
      await runWithInput(this.executable, args, prompt(input), Number(process.env.CODEX_TIMEOUT_MS ?? 180_000));
      const candidate = JSON.parse(await readFile(outputPath, "utf8")) as unknown;
      return VideoScriptSchema.parse(normalizeOneBasedSceneIndexes(candidate));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}

export function normalizeOneBasedSceneIndexes(candidate: unknown): unknown {
  if (!candidate || typeof candidate !== "object" || !("scenes" in candidate)) return candidate;
  const scenes = (candidate as { scenes?: unknown }).scenes;
  if (!Array.isArray(scenes) || scenes.length === 0) return candidate;
  const isStrictlyOneBased = scenes.every((scene, position) => (
    Boolean(scene) && typeof scene === "object" && (scene as { index?: unknown }).index === position + 1
  ));
  if (!isStrictlyOneBased) return candidate;
  return {
    ...(candidate as Record<string, unknown>),
    scenes: scenes.map((scene, position) => ({ ...(scene as Record<string, unknown>), index: position }))
  };
}

export function resolveSchemaPath(configuredPath?: string): string {
  if (configuredPath) {
    if (isAbsolute(configuredPath)) return configuredPath;
    return resolve(process.env.INIT_CWD ?? process.cwd(), configuredPath);
  }
  return resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../../../../packages/shared/src/schemas/video-script.schema.json"
  );
}

function prompt(input: ScriptRequest): string {
  return `You are creating one original vertical-video draft for a human review queue.
Return only data matching the supplied JSON schema.
Do not browse, run commands, modify files or invent metrics, links, personal results or sources.
Set source_url=null. Use verification_status="needs_review" for claims that need checking and "not_applicable" for original process guidance. Never mark a source as verified.
Mark potentially disputable facts with fact_check_required=true and verification_status="needs_review".
Use original text-card or motion-graphic visual concepts unless the operator notes owned/licensed material.
Scene durations must sum to approximately ${input.targetDurationSec} seconds.
Scene indexes must be consecutive integers starting at 0: 0, 1, 2, and so on, with no gaps.
The language field must exactly equal "${input.language}" and target_duration_sec must exactly equal ${input.targetDurationSec}.

Topic: ${input.topic}
Language: ${input.language}
Target duration: ${input.targetDurationSec} seconds
Operator notes: ${input.notes ?? "none"}`;
}

async function runWithInput(executable: string, args: string[], input: string, timeoutMs: number): Promise<void> {
  await new Promise<void>((resolvePromise, reject) => {
    const child = spawn(executable, args, { stdio: ["pipe", "ignore", "pipe"], env: process.env });
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Codex CLI timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stderr.on("data", (chunk) => { stderr = (stderr + String(chunk)).slice(-20_000); });
    child.on("error", (error) => { clearTimeout(timer); reject(error); });
    child.on("close", (code) => {
      clearTimeout(timer);
      code === 0 ? resolvePromise() : reject(new Error(`Codex CLI exited ${code}: ${stderr}`));
    });
    child.stdin.end(input);
  });
}
