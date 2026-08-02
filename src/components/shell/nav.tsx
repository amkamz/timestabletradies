"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cx } from "@/components/ui/pop";

const ITEMS = [
  { href: "/play", label: "Site", match: /^\/play$/ },
  { href: "/play/jobs", label: "Jobs", match: /^\/play\/(jobs|modes|boss)/ },
  { href: "/play/mastery", label: "Mastery", match: /^\/play\/(mastery|zones)/ },
  { href: "/play/shop", label: "Shop", match: /^\/play\/shop/ },
  { href: "/play/locker", label: "Locker", match: /^\/play\/(locker|settings)/ },
] as const;

/** Persistent bottom nav for the student app (design B1). */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="sticky bottom-0 z-10 flex h-[62px] items-center justify-around border-t-4 border-ink bg-white"
    >
      {ITEMS.map((item) => {
        const active = item.match.test(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="flex flex-1 flex-col items-center gap-1 py-2"
          >
            <span
              aria-hidden
              className={cx(
                "h-[22px] w-[22px] rounded-[7px] border-[2.5px] border-ink",
                active ? "bg-red" : "bg-white",
              )}
            />
            <span
              className={cx(
                "text-[9px] uppercase",
                active ? "font-display text-ink" : "font-sans font-black text-stone",
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
