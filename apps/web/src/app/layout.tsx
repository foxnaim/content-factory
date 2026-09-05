import type { Metadata } from "next";
import Link from "next/link";
import { Boxes, Clapperboard, Import, Layers3 } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Content Factory",
  description: "Review-first batch pipeline for vertical video drafts"
};

const navigation = [
  { href: "/", label: "Overview", icon: Boxes },
  { href: "/batches", label: "Batches", icon: Layers3 },
  { href: "/queue", label: "Queue", icon: Clapperboard },
  { href: "/import", label: "Import", icon: Import }
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="relative mx-auto min-h-screen max-w-[1600px] md:grid md:grid-cols-[245px_1fr]">
          <aside className="border-b border-white/10 bg-black/20 p-5 backdrop-blur-xl md:sticky md:top-0 md:h-screen md:border-r md:border-b-0">
            <div className="mb-8 flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-violet-500 font-black">CF</div>
              <div><div className="font-bold">Content Factory</div><div className="text-xs text-zinc-500">review-first / v0.1</div></div>
            </div>
            <nav className="flex gap-2 overflow-x-auto md:flex-col">
              {navigation.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex min-w-max items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-zinc-300 transition hover:bg-white/8 hover:text-white">
                  <Icon className="size-4" />{label}
                </Link>
              ))}
            </nav>
            <div className="mt-10 hidden rounded-2xl border border-emerald-400/20 bg-emerald-400/8 p-4 text-xs leading-5 text-emerald-100 md:block">
              <div className="mb-1 font-bold">Manual approval locked</div>
              No YouTube or Telegram publishing endpoint exists in this MVP.
            </div>
          </aside>
          <main className="min-w-0 p-5 md:p-8 lg:p-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
