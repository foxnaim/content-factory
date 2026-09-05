import { ImportForm } from "../../components/import-form";

export default function ImportPage() {
  return <div className="space-y-6"><header><div className="text-xs font-bold uppercase tracking-[.25em] text-violet-300">Input</div><h1 className="mt-2 text-4xl font-black">Import a batch</h1><p className="mt-2 text-zinc-500">Validate first. Queue explicitly after inspection.</p></header><ImportForm /></div>;
}
