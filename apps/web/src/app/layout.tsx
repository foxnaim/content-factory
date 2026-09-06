import type { Metadata } from "next";
import Link from "next/link";
import { Clapperboard, GalleryVerticalEnd, Import, Layers3, Sparkles } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Content Factory",
  description: "Review-first batch pipeline for vertical video drafts"
};

const navigation = [
  { href: "/", label: "Studio", icon: Sparkles },
  { href: "/batches", label: "Production runs", icon: Layers3 },
  { href: "/queue", label: "Review queue", icon: Clapperboard },
  { href: "/import", label: "New batch", icon: Import }
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell relative mx-auto min-h-screen max-w-[1680px] md:grid md:grid-cols-[270px_1fr]">
          <aside className="studio-sidebar border-b p-5 md:sticky md:top-0 md:h-screen md:border-r md:border-b-0 md:p-6">
            <div className="mb-8 flex items-center gap-3">
              <div className="brand-mark"><GalleryVerticalEnd className="size-5" /></div>
              <div><div className="font-black tracking-tight">Content Factory</div><div className="text-xs text-slate-500">creative studio / local</div></div>
            </div>
            <nav className="studio-nav flex gap-2 overflow-x-auto md:flex-col">
              {navigation.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex min-w-max items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/8 hover:text-white">
                  <Icon className="size-4" />{label}
                </Link>
              ))}
            </nav>
            <div className="privacy-note mt-10 hidden p-4 text-xs leading-5 md:block">
              <div className="mb-2 flex items-center gap-2 font-bold text-emerald-100"><span className="status-dot" /> Your drafts stay private</div>
              Nothing publishes until you review and approve it.
            </div>
          </aside>
          <main className="min-w-0 p-4 sm:p-6 md:p-8 lg:p-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
