import Link from "next/link";
import { ArrowRight, CheckCircle2, Database, HardDrive, ShieldCheck, Workflow } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";

const stages = ["Import", "Script", "Quality gate", "Assets", "Voice", "FFmpeg", "Review"];
const features = [
  { icon: Workflow, title: "BullMQ", copy: "Bounded stage queues and retries" },
  { icon: Database, title: "PostgreSQL", copy: "Durable content state and logs" },
  { icon: HardDrive, title: "MinIO", copy: "Sources, manifests and outputs" },
  { icon: ShieldCheck, title: "Review gate", copy: "Approve, reject or download" }
];

export default function OverviewPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
        <div>
          <div className="mb-3 text-xs font-bold uppercase tracking-[.28em] text-violet-300">Build with Yan / open system</div>
          <h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">10–1000 video drafts.<br /><span className="text-zinc-500">Zero automatic publishing.</span></h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400">A self-hosted content pipeline with durable jobs, strict contracts, source manifests and a human review gate.</p>
        </div>
        <Button asChild size="lg"><Link href="/import">Import a batch <ArrowRight className="ml-2 size-4" /></Link></Button>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {features.map(({ icon: Icon, title, copy }) => (
          <Card key={title}><CardContent className="space-y-4"><Icon className="size-6 text-violet-300" /><div><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm leading-6 text-zinc-500">{copy}</p></div></CardContent></Card>
        ))}
      </section>

      <Card className="overflow-hidden">
        <div className="border-b border-white/10 p-5"><div className="text-xs font-bold uppercase tracking-[.22em] text-zinc-500">Pipeline contract</div></div>
        <div className="grid md:grid-cols-7">
          {stages.map((stage, index) => (
            <div key={stage} className="relative border-b border-white/8 p-5 md:border-r md:border-b-0 last:border-0">
              <div className="mb-8 text-xs text-zinc-600">0{index + 1}</div>
              <div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 className="size-4 text-emerald-300" />{stage}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
