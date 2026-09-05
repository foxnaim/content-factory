"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";

export function ReviewActions({ itemId, status }: { itemId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  async function mutate(action: string) {
    setBusy(action); setMessage("");
    const response = await fetch(`${apiUrl}/api/items/${itemId}/${action}`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ reviewer: "local-operator", reason: action === "continue" ? "Facts checked by operator" : undefined })
    });
    setMessage(response.ok ? `${action} saved` : await response.text());
    setBusy(null); router.refresh();
  }

  async function download() {
    setBusy("download");
    const response = await fetch(`${apiUrl}/api/items/${itemId}/download`);
    if (response.ok) window.open((await response.json()).url, "_blank", "noopener,noreferrer");
    else setMessage(await response.text());
    setBusy(null);
  }

  return <div className="flex flex-wrap items-center gap-3">
    {status === "draft" && <Button onClick={() => mutate("queue")} disabled={!!busy}>Queue this draft</Button>}
    {status === "qa_pending" && <Button onClick={() => mutate("continue")} disabled={!!busy}>Facts checked — continue</Button>}
    {status === "ready_for_review" && <><Button onClick={() => mutate("approve")} disabled={!!busy}>Approve draft</Button><Button variant="danger" onClick={() => mutate("reject")} disabled={!!busy}>Reject</Button></>}
    {status === "failed" && <Button variant="outline" onClick={() => mutate("retry")} disabled={!!busy}>Retry pipeline</Button>}
    {["ready_for_review", "approved"].includes(status) && <Button variant="outline" onClick={download} disabled={!!busy}>Download</Button>}
    {message && <span className="text-xs text-zinc-400">{message}</span>}
  </div>;
}
