import { api, type Item } from "../../../lib/api";
import { Badge } from "../../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../../components/ui/card";
import { ReviewActions } from "../../../components/review-actions";

type ScriptPayload = {
  title?: string;
  description?: string;
  hook?: string;
  cta?: string;
  fact_check_required?: boolean;
  scenes?: Array<{ index: number; duration_sec: number; voiceover: string; subtitle: string; visual_type: string; visual_prompt: string }>;
  source_notes?: unknown[];
};

export default async function ItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await api<Item>(`/items/${id}`);
  const script = (item.scriptVersions?.[0]?.payload ?? {}) as ScriptPayload;
  return <div className="space-y-6">
    <header className="space-y-4"><div className="flex items-center gap-3"><Badge>{item.status}</Badge><span className="text-xs uppercase tracking-[.2em] text-zinc-600">Item {item.id.slice(0, 8)}</span></div><h1 className="max-w-4xl text-4xl font-black">{item.topic}</h1><ReviewActions itemId={item.id} status={item.status} /></header>
    {item.failureMessage && <div className="rounded-xl border border-rose-400/25 bg-rose-400/8 p-4 text-sm text-rose-100">{item.failureMessage}</div>}
    <div className="grid gap-5 xl:grid-cols-[1.45fr_.8fr]">
      <div className="space-y-5">
        <Card><CardHeader><div className="text-xs uppercase tracking-[.22em] text-zinc-500">Validated script</div><h2 className="mt-2 text-2xl font-bold">{script.title ?? "Waiting for script"}</h2></CardHeader><CardContent className="space-y-5"><div><div className="text-xs font-bold uppercase text-violet-300">Hook</div><p className="mt-2 leading-7 text-zinc-300">{script.hook ?? "—"}</p></div>{script.scenes?.map((scene) => <div key={scene.index} className="rounded-xl border border-white/8 bg-black/20 p-4"><div className="flex items-center justify-between text-xs text-zinc-500"><span>Scene {scene.index + 1} / {scene.visual_type}</span><span>{scene.duration_sec}s</span></div><div className="mt-3 font-bold">{scene.subtitle}</div><p className="mt-2 text-sm leading-6 text-zinc-400">{scene.voiceover}</p><p className="mt-3 border-t border-white/8 pt-3 text-xs leading-5 text-zinc-600">Visual: {scene.visual_prompt}</p></div>)}</CardContent></Card>
        <Card><CardHeader><h2 className="font-bold">Logs</h2></CardHeader><div>{item.logs?.map((log) => <div key={log.id} className="grid gap-2 border-b border-white/8 px-5 py-4 last:border-0 sm:grid-cols-[150px_120px_1fr]"><span className="text-xs text-zinc-600">{new Date(log.createdAt).toLocaleString()}</span><span className="text-xs font-bold text-zinc-400">{log.event}</span><span className="text-sm text-zinc-300">{log.message}</span></div>)}</div></Card>
      </div>
      <div className="space-y-5">
        <Card><CardHeader><h2 className="font-bold">Item contract</h2></CardHeader><CardContent className="space-y-3 text-sm"><Row label="Language" value={item.language} /><Row label="Target" value={`${item.targetDurationSec}s`} /><Row label="Fact check" value={String(script.fact_check_required ?? "—")} /><Row label="Sources" value={String(script.source_notes?.length ?? 0)} /><Row label="Assets" value={String(item.assets?.length ?? 0)} /></CardContent></Card>
        <Card><CardHeader><h2 className="font-bold">Attempts</h2></CardHeader><CardContent className="space-y-3">{item.attempts?.map((attempt) => <div key={attempt.id} className="rounded-xl bg-black/20 p-3 text-xs"><div className="flex justify-between"><span className="font-bold">{attempt.queueName}</span><span className="text-zinc-500">#{attempt.attempt}</span></div><div className="mt-2 text-zinc-500">{attempt.outcome ?? "running"}</div></div>)}</CardContent></Card>
        <Card className="border-emerald-400/20"><CardContent className="text-sm leading-6 text-emerald-100"><strong>Review only.</strong> Approval makes the draft downloadable. It cannot publish to YouTube or Telegram.</CardContent></Card>
      </div>
    </div>
  </div>;
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 border-b border-white/8 pb-3 last:border-0 last:pb-0"><span className="text-zinc-500">{label}</span><span className="font-semibold">{value}</span></div>;
}
