import Link from "next/link";
import { api, type Batch } from "../../lib/api";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader } from "../../components/ui/card";
import { EmptyState } from "../../components/empty-state";

export default async function BatchesPage() {
  let batches: Batch[] = [];
  let offline = false;
  try { batches = await api<Batch[]>("/batches"); } catch { offline = true; }
  return (
    <div className="space-y-6">
      <header><div className="text-xs font-bold uppercase tracking-[.25em] text-violet-300">Production</div><h1 className="mt-2 text-4xl font-black">Batches</h1><p className="mt-2 text-zinc-500">Imports, progress and review readiness.</p></header>
      {offline && <div className="rounded-xl border border-amber-400/20 bg-amber-400/8 p-4 text-sm text-amber-100">API is offline. Start PostgreSQL, Redis, MinIO and the API to see live batches.</div>}
      {!batches.length ? <EmptyState title="No batches yet" copy="Create a project and channel, then import 10–1000 CSV or JSON items. Nothing will be published automatically." /> : (
        <div className="grid gap-4 xl:grid-cols-2">
          {batches.map((batch) => <Link key={batch.id} href={`/batches/${batch.id}`}><Card className="transition hover:-translate-y-0.5 hover:border-violet-400/35"><CardHeader className="flex flex-row items-center justify-between"><div><div className="font-bold">{batch.name}</div><div className="mt-1 text-xs text-zinc-500">{batch.channel?.name ?? "Channel"}</div></div><Badge>{batch.status}</Badge></CardHeader><CardContent className="flex justify-between text-sm text-zinc-400"><span>{batch._count?.items ?? batch.totalItems} items</span><span>{new Date(batch.createdAt).toLocaleDateString()}</span></CardContent></Card></Link>)}
        </div>
      )}
    </div>
  );
}
