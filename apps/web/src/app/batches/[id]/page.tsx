import Link from "next/link";
import { api, type Batch } from "../../../lib/api";
import { Badge } from "../../../components/ui/badge";
import { Card } from "../../../components/ui/card";

export default async function BatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const batch = await api<Batch>(`/batches/${id}`);
  return <div className="space-y-6">
    <header className="flex items-end justify-between gap-4"><div><div className="text-xs uppercase tracking-[.25em] text-violet-300">Batch / {batch.id.slice(0, 8)}</div><h1 className="mt-2 text-4xl font-black">{batch.name}</h1></div><Badge>{batch.status}</Badge></header>
    <Card className="overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-white/10 px-5 py-3 text-xs font-bold uppercase tracking-wider text-zinc-600"><span>Topic</span><span>Status</span><span>Duration</span></div>
      {batch.items?.map((item) => <Link key={item.id} href={`/items/${item.id}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-white/8 px-5 py-4 last:border-0 hover:bg-white/[0.025]"><span className="min-w-0 truncate text-sm">{item.topic}</span><Badge>{item.status}</Badge><span className="text-xs text-zinc-500">{item.targetDurationSec}s</span></Link>)}
    </Card>
  </div>;
}
