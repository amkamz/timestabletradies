import Link from "next/link";

import { signOut } from "@/lib/actions/auth";
import { requireParent } from "@/lib/actions/auth";

const TABS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/progress", label: "Progress" },
  { href: "/dashboard/modes", label: "Modes" },
  { href: "/dashboard/family", label: "Family" },
  { href: "/dashboard/crew", label: "Crew" },
  { href: "/dashboard/classroom", label: "Classroom" },
  { href: "/dashboard/billing", label: "Billing" },
] as const;

/**
 * Parent / teacher dashboard (spec §12).
 *
 * A desktop-first layout rather than the phone frame — this is where the
 * grown-up work happens, and it is the *only* place billing exists.
 * `requireParent` bounces grandparents out to their sticker-only view.
 */
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  await requireParent();

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b-4 border-ink bg-paper">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4">
          <Link href="/dashboard" className="font-display text-lg text-ink">
            Times Table Tradies
          </Link>

          <nav aria-label="Dashboard" className="flex flex-wrap gap-1.5">
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="rounded-lg border-[2.5px] border-ink bg-white px-2.5 py-1 font-sans text-xs font-black text-ink"
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/play"
              className="rounded-lg border-[2.5px] border-ink bg-teal px-2.5 py-1 font-display text-xs text-white"
            >
              Kids&apos; app
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg border-[2.5px] border-ink bg-white px-2.5 py-1 font-sans text-xs font-black text-ink"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-5 py-8">
        {children}
      </main>
    </div>
  );
}
