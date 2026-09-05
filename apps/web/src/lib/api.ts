const API_URL = process.env.API_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/api${path}`, { ...init, cache: "no-store" });
  if (!response.ok) throw new Error(`API ${response.status}: ${await response.text()}`);
  return response.json() as Promise<T>;
}

export type Item = {
  id: string;
  batchId: string;
  topic: string;
  language: string;
  targetDurationSec: number;
  status: string;
  failureMessage?: string | null;
  createdAt: string;
  scriptVersions?: Array<{ id: string; version: number; payload: Record<string, unknown>; createdAt: string }>;
  assets?: Array<{ id: string; kind: string; objectKey: string; mediaType: string; byteLength: string }>;
  attempts?: Array<{ id: string; queueName: string; attempt: number; outcome?: string; errorMessage?: string; startedAt: string }>;
  logs?: Array<{ id: string; level: string; event: string; message: string; createdAt: string }>;
};

export type Batch = {
  id: string;
  name: string;
  status: string;
  totalItems: number;
  createdAt: string;
  channel?: { name: string };
  items?: Item[];
  _count?: { items: number };
};
