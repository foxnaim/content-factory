import type { VideoScript } from "@content-factory/shared";

export type DuplicateCandidate = {
  id: string;
  topic: string;
  script: VideoScript;
};

export type DuplicateSignal = {
  candidateId: string;
  topicSimilarity: number;
  titleSimilarity: number;
  scriptSimilarity: number;
  shouldBlock: boolean;
};

export interface DuplicateDetector {
  compare(topic: string, script: VideoScript, candidates: DuplicateCandidate[]): Promise<DuplicateSignal[]>;
}

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>;
}

export class EmbeddingDuplicateDetector implements DuplicateDetector {
  constructor(private readonly provider: EmbeddingProvider) {}

  async compare(topic: string, script: VideoScript, candidates: DuplicateCandidate[]): Promise<DuplicateSignal[]> {
    if (!candidates.length) return [];
    const currentText = flatten(script);
    const texts = [topic, script.title, currentText, ...candidates.flatMap((item) => [item.topic, item.script.title, flatten(item.script)])];
    const vectors = await this.provider.embed(texts);
    return candidates.map((candidate, index) => {
      const offset = 3 + index * 3;
      const topicSimilarity = cosine(vectors[0]!, vectors[offset]!);
      const titleSimilarity = cosine(vectors[1]!, vectors[offset + 1]!);
      const scriptSimilarity = cosine(vectors[2]!, vectors[offset + 2]!);
      return { candidateId: candidate.id, topicSimilarity, titleSimilarity, scriptSimilarity, shouldBlock: titleSimilarity >= 0.9 || scriptSimilarity >= 0.92 };
    });
  }
}

export class LexicalDuplicateDetector implements DuplicateDetector {
  async compare(topic: string, script: VideoScript, candidates: DuplicateCandidate[]): Promise<DuplicateSignal[]> {
    return candidates.map((candidate) => {
      const topicSimilarity = jaccard(topic, candidate.topic);
      const titleSimilarity = jaccard(script.title, candidate.script.title);
      const scriptSimilarity = jaccard(flatten(script), flatten(candidate.script));
      return {
        candidateId: candidate.id,
        topicSimilarity,
        titleSimilarity,
        scriptSimilarity,
        shouldBlock: topicSimilarity >= 0.9 || titleSimilarity >= 0.82 || scriptSimilarity >= 0.88
      };
    });
  }
}

function flatten(script: VideoScript): string {
  return [script.hook, ...script.scenes.map((scene) => scene.voiceover), script.cta].join(" ");
}

function tokens(value: string): Set<string> {
  return new Set(value.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(/\s+/).filter((part) => part.length > 2));
}

function jaccard(left: string, right: string): number {
  const a = tokens(left);
  const b = tokens(right);
  if (!a.size && !b.size) return 1;
  const intersection = [...a].filter((token) => b.has(token)).length;
  return intersection / new Set([...a, ...b]).size;
}

function cosine(a: number[], b: number[]): number {
  const dot = a.reduce((sum, value, index) => sum + value * (b[index] ?? 0), 0);
  const normA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
  const normB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));
  return normA && normB ? dot / (normA * normB) : 0;
}
