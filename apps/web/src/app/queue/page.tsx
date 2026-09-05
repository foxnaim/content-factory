import { api } from "../../lib/api";
import { Card, CardContent, CardHeader } from "../../components/ui/card";

type QueueSummary = { stage: string; queue: string; counts: Record<string, number> };

export default async function QueuePage() {
  let queues: QueueSummary[] = [];
  let offline = false;
  try { queues = await api<QueueSummary[]>("/queue"); } catch { offline = true; }
  return <div className="space-y-6"><header><div className="text-xs font-bold uppercase tracking-[.25em] text-violet-300">Operations</div><h1 className="mt-2 text-4xl font-black">Queue</h1><p className="mt-2 text-zinc-500">Backpressure and attempts by stage.</p></header>
    {offline && <div className="rounded-xl border border-amber-400/20 bg-amber-400/8 p-4 text-sm text-amber-100">Queue metrics are unavailable while the API or Redis is offline.</div>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{queues.map((queue) => <Card key={queue.stage}><CardHeader><div className="text-xs uppercase tracking-[.2em] text-zinc-500">{queue.queue}</div><h2 className="mt-2 text-xl font-bold capitalize">{queue.stage}</h2></CardHeader><CardContent className="grid grid-cols-3 gap-3">{Object.entries(queue.counts).map(([name, value]) => <div key={name} className="rounded-xl bg-black/25 p-3"><div className="text-2xl font-black">{value}</div><div className="mt-1 text-[10px] uppercase text-zinc-600">{name}</div></div>)}</CardContent></Card>)}</div>
  </div>;
}
