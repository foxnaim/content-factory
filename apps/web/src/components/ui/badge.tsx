import type { HTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const colors: Record<string, string> = {
  approved: "bg-emerald-400/15 text-emerald-200 ring-emerald-400/25",
  ready_for_review: "bg-cyan-400/15 text-cyan-100 ring-cyan-400/25",
  rejected: "bg-rose-400/15 text-rose-200 ring-rose-400/25",
  failed: "bg-rose-400/15 text-rose-200 ring-rose-400/25",
  qa_pending: "bg-amber-400/15 text-amber-100 ring-amber-400/25",
  rendering: "bg-violet-400/15 text-violet-100 ring-violet-400/25"
};

export function Badge({ className, children, ...props }: HTMLAttributes<HTMLSpanElement>) {
  const status = String(children ?? "");
  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", colors[status] ?? "bg-white/8 text-zinc-300 ring-white/10", className)} {...props}>{children}</span>;
}
