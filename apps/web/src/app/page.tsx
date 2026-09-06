import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CircleCheckBig, Eye, ListPlus, Play, ShieldCheck, Sparkles, WandSparkles } from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";

const steps = [
  { icon: ListPlus, number: "01", title: "Drop in your ideas", copy: "Import 10–1000 topics from CSV or JSON. The factory checks every row before work starts." },
  { icon: WandSparkles, number: "02", title: "Build the drafts", copy: "Scripts, scenes, a natural voice and vertical previews move through one visible queue." },
  { icon: Eye, number: "03", title: "Review every video", copy: "Watch, approve, reject or download. Nothing leaves the studio without you." }
];

export default function OverviewPage() {
  return (
    <div className="space-y-7">
      <section className="studio-hero overflow-hidden">
        <div className="relative z-10 flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-12 lg:py-14">
          <div className="eyebrow"><Sparkles className="size-4" /> Your private short-form studio</div>
          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[.96] tracking-[-.055em] sm:text-6xl xl:text-7xl">
            Turn a list of ideas into <span className="text-mint">review-ready Shorts.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">Create a whole week of vertical video drafts in one run. Keep the creative control, inspect every scene and publish only when it feels right.</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg"><Link href="/import">Start a new batch <ArrowRight className="ml-2 size-4" /></Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/queue"><Play className="mr-2 size-4" />See what is being made</Link></Button>
          </div>
          <div className="mt-9 grid max-w-xl grid-cols-3 gap-3">
            <Metric value="10–1000" label="ideas per run" />
            <Metric value="Local" label="AI and files" />
            <Metric value="You" label="approve last" />
          </div>
        </div>
        <div className="studio-visual">
          <Image src="/mascot-workshop.jpg" alt="A friendly robot welcoming a glowing idea into the Content Factory workshop" fill priority sizes="(max-width: 1024px) 100vw, 42vw" className="object-cover" />
          <div className="visual-vignette" />
          <div className="floating-status"><span className="status-dot" /><span><strong>Studio ready</strong><small>Waiting for your next batch</small></span></div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4"><div><div className="eyebrow">One calm workflow</div><h2 className="mt-3 text-3xl font-black tracking-tight">From rough topics to videos you can judge</h2></div><div className="hidden text-sm text-slate-400 md:block">Three steps. Full visibility.</div></div>
        <div className="grid gap-4 lg:grid-cols-3">
          {steps.map(({ icon: Icon, number, title, copy }) => (
            <Card key={number} className="step-card"><CardContent><div className="flex items-start justify-between"><span className="step-icon"><Icon className="size-5" /></span><span className="step-number">{number}</span></div><h3 className="mt-8 text-xl font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{copy}</p></CardContent></Card>
          ))}
        </div>
      </section>

      <section className="safety-panel">
        <div className="safety-icon"><ShieldCheck className="size-6" /></div>
        <div><div className="text-lg font-black">Everything pauses before publishing</div><p className="mt-1 text-sm leading-6 text-emerald-50/70">Every draft stops at review. You can inspect the script, sources, voice, scenes and logs before approving a download.</p></div>
        <div className="ml-auto hidden items-center gap-2 rounded-full bg-emerald-300/10 px-4 py-2 text-xs font-bold text-emerald-200 lg:flex"><CircleCheckBig className="size-4" /> Manual approval locked</div>
      </section>
    </div>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <div className="metric"><strong>{value}</strong><span>{label}</span></div>;
}
