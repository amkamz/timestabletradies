/**
 * Toolbox Pop primitives.
 *
 * Every screen in the app is built from these. The look — 3px ink borders,
 * hard offset shadows, Titan One display type — comes straight from
 * "Times Table Tradie - Screens.dc.html".
 *
 * Interactive primitives render real buttons/inputs so keyboard and
 * screen-reader users get the semantics for free (WCAG 2.2 AA baseline).
 */
import Link from "next/link";
import type { ComponentProps, ElementType, ReactNode } from "react";

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ button */

type PopTone = "red" | "teal" | "yellow" | "white" | "ink" | "blue";

const TONE: Record<PopTone, string> = {
  red: "bg-red text-white",
  teal: "bg-teal text-white",
  yellow: "bg-yellow text-ink",
  white: "bg-white text-ink",
  ink: "bg-ink text-yellow",
  blue: "bg-blue text-white",
};

const SIZE = {
  sm: "px-3 py-2 text-sm rounded-xl",
  md: "px-4 py-3 text-base rounded-2xl",
  lg: "px-5 py-4 text-lg rounded-2xl",
} as const;

type PopButtonProps = {
  tone?: PopTone;
  size?: keyof typeof SIZE;
  full?: boolean;
  sub?: ReactNode;
  children: ReactNode;
};

const buttonBase =
  "pop-press inline-flex flex-col items-center justify-center border-[3px] border-ink font-display leading-tight shadow-pop text-center";

export function PopButton({
  tone = "teal",
  size = "md",
  full,
  sub,
  children,
  className,
  ...rest
}: PopButtonProps & ComponentProps<"button">) {
  return (
    <button
      className={cx(buttonBase, TONE[tone], SIZE[size], full && "w-full", className)}
      {...rest}
    >
      <span>{children}</span>
      {sub ? <span className="font-sans text-[0.68em] font-black opacity-80">{sub}</span> : null}
    </button>
  );
}

export function PopLink({
  tone = "teal",
  size = "md",
  full,
  sub,
  children,
  className,
  ...rest
}: PopButtonProps & ComponentProps<typeof Link>) {
  return (
    <Link
      className={cx(buttonBase, TONE[tone], SIZE[size], full && "w-full", className)}
      {...rest}
    >
      <span>{children}</span>
      {sub ? <span className="font-sans text-[0.68em] font-black opacity-80">{sub}</span> : null}
    </Link>
  );
}

/* -------------------------------------------------------------------- card */

export function PopCard({
  children,
  className,
  tone = "white",
  flat,
  as: As = "div",
  ...rest
}: {
  children: ReactNode;
  className?: string;
  tone?: "white" | "ink" | "teal" | "yellow" | "transparent";
  flat?: boolean;
  as?: "div" | "section" | "li" | "article";
} & Omit<ComponentProps<"div">, "ref">) {
  // DOM event handlers are element-specific, so the varying `as` element is
  // widened here rather than threading a generic through every call site.
  const Component = As as ElementType;
  const tones = {
    white: "bg-white border-ink",
    ink: "bg-ink border-ink text-white",
    teal: "bg-teal border-ink text-white",
    yellow: "bg-yellow border-ink",
    transparent: "bg-transparent border-sand-light border-dashed",
  };
  return (
    <Component
      className={cx(
        "rounded-2xl border-[3px] p-3",
        tones[tone],
        !flat && "shadow-pop-sm",
        className,
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}

/* ------------------------------------------------------------------- pills */

export function Pill({
  children,
  tone = "ink",
  className,
}: {
  children: ReactNode;
  tone?: "ink" | "red" | "teal" | "yellow" | "white" | "blue" | "slate" | "sand";
  className?: string;
}) {
  const tones = {
    ink: "bg-ink text-yellow",
    red: "bg-red text-white",
    teal: "bg-teal text-white",
    yellow: "bg-yellow text-ink",
    white: "bg-white text-ink",
    blue: "bg-blue text-white",
    slate: "bg-slate text-white",
    sand: "bg-sand text-white",
  };
  return (
    <span
      className={cx(
        "inline-block rounded-full px-3 py-1 font-display text-xs",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** The rotated banner used as a screen heading (e.g. "THE JOB BOARD"). */
export function Banner({
  children,
  tone = "teal",
  as: As = "h1",
}: {
  children: ReactNode;
  tone?: "teal" | "yellow" | "ink" | "red" | "mint";
  as?: "h1" | "h2";
}) {
  const tones = {
    teal: "bg-teal text-white",
    yellow: "bg-yellow text-ink",
    ink: "bg-ink text-yellow",
    red: "bg-red text-white",
    mint: "bg-teal-light text-ink",
  };
  return (
    <div className="text-center">
      <As
        className={cx(
          "inline-block -rotate-[1.5deg] rounded-xl border-[3px] border-ink px-4 py-1 font-display text-sm",
          tones[tone],
        )}
      >
        {children}
      </As>
    </div>
  );
}

/** Small uppercase mono eyebrow, e.g. "STEP 1 OF 3 · PARENT". */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx("font-mono text-[11px] tracking-[0.16em] text-mud uppercase", className)}>
      {children}
    </p>
  );
}

/** Small bold sans label above a field or stat. */
export function FieldLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx("font-sans text-[11px] font-black tracking-wide text-mud", className)}>
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------- progress */

export function ProgressBar({
  value,
  label,
  tone = "teal",
  className,
}: {
  /** 0–100 */
  value: number;
  label: string;
  tone?: "teal" | "yellow";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={cx("h-3.5 overflow-hidden rounded-full border-2 border-ink bg-black/15", className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cx("h-full transition-[width] duration-300", tone === "teal" ? "bg-teal" : "bg-yellow")}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------- coins */

export function Coin({ size = 17 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full border-2 border-ink"
      style={{
        width: size,
        height: size,
        background: "radial-gradient(circle at 35% 30%, #ffe08a, #f4b71e)",
      }}
    />
  );
}

export function Brick({ size = 17 }: { size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-[3px] border-2 border-ink bg-brick"
      style={{ width: size, height: size * 0.7 }}
    />
  );
}

/** Coin + amount, announced properly to screen readers. */
export function CoinTally({ amount, size = 17 }: { amount: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-display text-ink">
      <Coin size={size} />
      <span aria-hidden>{amount.toLocaleString()}</span>
      <span className="sr-only">{amount.toLocaleString()} coins</span>
    </span>
  );
}

export function BrickTally({ amount, size = 17 }: { amount: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-display text-ink">
      <Brick size={size} />
      <span aria-hidden>{amount.toLocaleString()}</span>
      <span className="sr-only">{amount.toLocaleString()} loads of materials</span>
    </span>
  );
}

/* ------------------------------------------------------- art placeholders */

/**
 * Labelled placeholder standing in for character/house art. The design doc
 * keeps these explicit so an illustrator can be briefed per slot — they are
 * decorative to assistive tech, with the real meaning carried by nearby text.
 */
export function ArtSlot({
  label,
  className,
  tone = "ink",
}: {
  label: string;
  className?: string;
  tone?: "ink" | "light" | "red";
}) {
  const tones = {
    ink: "border-ink text-ink pop-hatch",
    light: "border-white text-white pop-hatch-light",
    red: "border-ink text-ink pop-hatch-red",
  };
  return (
    <div
      aria-hidden
      className={cx(
        "flex items-center justify-center rounded-2xl border-[3px] border-dashed text-center font-mono text-[10px] leading-relaxed",
        tones[tone],
        className,
      )}
    >
      {label.split("\n").map((line) => (
        <span key={line} className="block">
          {line}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ toggle */

export function PopToggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-[3px] border-ink bg-white p-3 shadow-pop-sm">
      <span>
        <span className="block font-sans text-[13px] font-black text-ink">{label}</span>
        {hint ? <span className="block font-sans text-[11px] font-bold text-mud">{hint}</span> : null}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cx(
          "relative h-6 w-11 shrink-0 rounded-full border-[2.5px] border-ink transition-colors peer-focus-visible:outline-4 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue",
          checked ? "bg-teal" : "bg-sand-fill",
        )}
      >
        <span
          className={cx(
            "absolute top-[1px] h-[17px] w-[17px] rounded-full border-2 border-ink bg-white transition-[left]",
            checked ? "left-[22px]" : "left-[2px]",
          )}
        />
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------- input */

export function PopInput({
  label,
  hint,
  id,
  className,
  ...rest
}: { label: string; hint?: string } & ComponentProps<"input">) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-sans text-[11px] font-black tracking-wide text-mud uppercase">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={hintId}
        className={cx(
          "w-full rounded-xl border-[3px] border-ink bg-white px-3.5 py-3 font-sans text-sm font-extrabold text-ink placeholder:font-bold placeholder:text-sand",
          className,
        )}
        {...rest}
      />
      {hint ? (
        <p id={hintId} className="font-sans text-[11px] font-bold text-mud">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------- note */

/** Dashed callout, e.g. the "billing never lives in the kids' app" note. */
export function PopNote({
  children,
  tone = "teal",
}: {
  children: ReactNode;
  tone?: "teal" | "light" | "yellow";
}) {
  const tones = {
    teal: "border-teal bg-teal-tint text-teal-deep",
    light: "border-white bg-black/15 text-white",
    yellow: "border-yellow bg-yellow/15 text-yellow",
  };
  return (
    <p
      className={cx(
        "rounded-xl border-2 border-dashed px-3 py-2.5 font-sans text-[11.5px] leading-snug font-bold",
        tones[tone],
      )}
    >
      {children}
    </p>
  );
}
