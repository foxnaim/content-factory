import type { VideoScript } from "@content-factory/shared";
import type { DuplicateSignal } from "./duplicate-detector.js";

export type QualityGateResult = {
  passed: boolean;
  needsHumanFactCheck: boolean;
  blockers: string[];
  warnings: string[];
};

const prohibitedClaims = [
  /guaranteed\s+(income|views|monetization)/i,
  /100%\s+(monetization|success)/i,
  /earn\s+\$?\d+\s+in\s+\d+\s+days?/i,
  /fake\s+(account|address|document)/i,
  /buy\s+(views|subscribers|watch hours)/i
];

export function runQualityGate(script: VideoScript, duplicateSignals: DuplicateSignal[]): QualityGateResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const fullText = [script.title, script.description, script.hook, ...script.scenes.map((scene) => scene.voiceover), script.cta].join("\n");

  if (prohibitedClaims.some((pattern) => pattern.test(fullText))) blockers.push("Script contains a prohibited promise or evasion pattern");
  const duplicate = duplicateSignals.find((signal) => signal.shouldBlock);
  if (duplicate) blockers.push(`Script is too similar to content item ${duplicate.candidateId}`);
  if (script.scenes.some((scene) => scene.visual_type === "licensed_stock" && !scene.stock_query)) {
    blockers.push("Licensed stock scenes require a stock_query and a later license manifest");
  }
  if (script.source_notes.some((note) => note.source_url)) {
    blockers.push("Model-generated source URLs are not accepted without a verified research input adapter");
  }
  if (script.source_notes.some((note) => note.verification_status === "verified")) {
    blockers.push("A script provider cannot mark its own source notes as verified");
  }
  if (script.source_notes.length === 0 && script.fact_check_required) warnings.push("Fact checking is required but no source notes were supplied");
  if (script.scenes.some((scene) => scene.subtitle.length > 120)) warnings.push("One or more subtitles may be too long for a vertical frame");

  const unresolvedSource = script.source_notes.some((note) => note.verification_status === "needs_review");
  const needsHumanFactCheck = script.fact_check_required || unresolvedSource;
  return { passed: blockers.length === 0, needsHumanFactCheck, blockers, warnings };
}
