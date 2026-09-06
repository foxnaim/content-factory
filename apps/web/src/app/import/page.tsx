import { ImportForm } from "../../components/import-form";

export default function ImportPage() {
  return <div className="space-y-6"><header><div className="eyebrow">New production run</div><h1 className="mt-3 text-4xl font-black">Bring in your ideas</h1><p className="mt-2 text-slate-400">Upload a list, check it, then decide when the studio starts.</p></header><ImportForm /></div>;
}
