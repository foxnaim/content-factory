import { Card, CardContent } from "./ui/card";

export function EmptyState({ title, copy }: { title: string; copy: string }) {
  return <Card><CardContent className="py-14 text-center"><h2 className="text-lg font-bold">{title}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-zinc-500">{copy}</p></CardContent></Card>;
}
