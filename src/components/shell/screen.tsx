import Link from "next/link";
import type { ReactNode } from "react";

import { cx } from "@/components/ui/pop";

/**
 * The app is drawn as a phone in the design doc but ships as a responsive
 * web app too (spec §1). On a phone it runs full-bleed; on a desktop it sits
 * in a centred column on the worksite canvas, which keeps the intended
 * proportions instead of stretching the UI across a 27" monitor.
 */
export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh justify-center bg-canvas sm:p-6">
      <div className="relative flex w-full max-w-[440px] flex-col sm:rounded-[36px] sm:border-[6px] sm:border-slate-deep sm:shadow-phone sm:overflow-hidden">
        {children}
      </div>
    </div>
  );
}

type ScreenTone = "paper" | "teal" | "red" | "blue" | "orange" | "ink" | "yellow";

const TONE_BG: Record<ScreenTone, string> = {
  paper: "bg-paper text-ink",
  teal: "bg-teal text-white",
  red: "bg-red text-white",
  blue: "bg-blue text-white",
  orange: "bg-orange text-white",
  ink: "bg-ink text-white",
  yellow: "bg-yellow text-ink",
};

/**
 * One screen. `tone` picks the background treatment from the design doc:
 * paper screens get the dotted texture, saturated screens get the light one.
 */
export function Screen({
  children,
  tone = "paper",
  className,
}: {
  children: ReactNode;
  tone?: ScreenTone;
  className?: string;
}) {
  return (
    <div className={cx("relative flex min-h-dvh flex-1 flex-col sm:min-h-[720px]", TONE_BG[tone])}>
      <div
        aria-hidden
        className={cx(
          "pointer-events-none absolute inset-0",
          tone === "paper" ? "pop-dots opacity-50" : "pop-dots-light",
        )}
      />
      <div className={cx("relative flex flex-1 flex-col", className)}>{children}</div>
    </div>
  );
}

/** Body region of a screen, with the standard gutters. */
export function ScreenBody({
  children,
  className,
  id = "main",
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <main id={id} className={cx("flex flex-1 flex-col gap-3 px-5 py-6", className)}>
      {children}
    </main>
  );
}

/** Top bar for immersive screens — a close button and a run progress strip. */
export function PlayHeader({
  closeHref,
  label,
  progressLabel,
  progressValue,
}: {
  closeHref: string;
  label: string;
  progressLabel: string;
  progressValue: number;
}) {
  const pct = Math.max(0, Math.min(100, progressValue));
  return (
    <header className="flex items-center gap-3 px-4 pt-4">
      <Link
        href={closeHref}
        aria-label="Leave this job"
        className="pop-press flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-[3px] border-ink bg-white font-display text-ink shadow-pop-sm"
      >
        <span aria-hidden>✕</span>
      </Link>
      <div className="flex-1">
        <div className="flex justify-between font-display text-[11px] text-white">
          <span className="uppercase">{label}</span>
          <span>{progressLabel}</span>
        </div>
        <div
          className="mt-1 h-3 overflow-hidden rounded-full border-2 border-ink bg-black/25"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress: ${progressLabel}`}
        >
          <div className="h-full bg-yellow transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </header>
  );
}
