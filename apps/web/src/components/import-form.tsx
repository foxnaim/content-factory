"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader } from "./ui/card";

const sample = `topic,external_id,language,target_duration_sec,notes
Why one button delayed our MVP,item-01,en,35,Use an original interface teardown
How a small CRM loses leads,item-02,en,40,Show a process map
AI agents need acceptance tests,item-03,en,45,No unsupported benchmarks
The cost of manual copy paste,item-04,en,35,Use a measurable workflow
What makes a useful product demo,item-05,en,40,Original screen recording
Three failure points in web forms,item-06,en,40,Security review required
Why automation needs an owner,item-07,en,35,Show incident timeline
The shortest onboarding path,item-08,en,45,Use a product experiment
What a release gate should catch,item-09,en,40,Practical checklist
How to review an AI script,item-10,en,40,Show before and after`;

export function ImportForm() {
  const [channelId, setChannelId] = useState("");
  const [name, setName] = useState("First public sprint");
  const [data, setData] = useState(sample);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setResult("");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/channels/${channelId}/batches/import`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, format: "csv", data, idempotency_key: `web-${channelId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` })
      });
      setResult(response.ok ? `Created batch ${(await response.json()).id}` : await response.text());
    } catch (error) { setResult(String(error)); }
    finally { setBusy(false); }
  }

  return <Card><CardHeader><h2 className="font-bold">CSV import</h2><p className="mt-1 text-sm text-zinc-500">A batch must contain between 10 and 1000 valid rows.</p></CardHeader><CardContent className="space-y-4">
    <label className="block text-sm"><span className="mb-2 block text-zinc-400">Channel UUID</span><input value={channelId} onChange={(event) => setChannelId(event.target.value)} placeholder="Create a project/channel through the API first" /></label>
    <label className="block text-sm"><span className="mb-2 block text-zinc-400">Batch name</span><input value={name} onChange={(event) => setName(event.target.value)} /></label>
    <label className="block text-sm"><span className="mb-2 block text-zinc-400">CSV</span><textarea className="min-h-80 font-mono text-xs leading-5" value={data} onChange={(event) => setData(event.target.value)} /></label>
    <div className="flex items-center gap-4"><Button onClick={submit} disabled={busy || !channelId}>{busy ? "Importing…" : "Validate and import"}</Button><span className="text-xs text-zinc-500">Import does not start rendering or publishing.</span></div>
    {result && <pre className="overflow-auto rounded-xl bg-black/30 p-4 text-xs text-zinc-300">{result}</pre>}
  </CardContent></Card>;
}
