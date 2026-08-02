"use client";

import { cx } from "@/components/ui/pop";

/**
 * Number keypad used by the type-the-answer formats (B5, B6).
 * Real buttons, so it is fully keyboard- and screen-reader-navigable; the
 * physical number keys work too via the parent's key handler.
 */
export function Keypad({
  onDigit,
  onBackspace,
  onSubmit,
  disabled,
  compact,
}: {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  const keyClass = cx(
    "pop-press rounded-2xl border-[3px] border-ink bg-white text-center font-display text-ink shadow-pop",
    compact ? "py-2.5 text-xl" : "py-3 text-[22px]",
  );

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <button key={d} type="button" className={keyClass} onClick={() => onDigit(d)} disabled={disabled}>
          {d}
        </button>
      ))}
      <button
        type="button"
        className={cx(keyClass, "bg-bone text-xl")}
        onClick={onBackspace}
        disabled={disabled}
        aria-label="Delete last digit"
      >
        <span aria-hidden>⌫</span>
      </button>
      <button type="button" className={keyClass} onClick={() => onDigit("0")} disabled={disabled}>
        0
      </button>
      <button
        type="button"
        className={cx(keyClass, "bg-teal text-white")}
        onClick={onSubmit}
        disabled={disabled}
        aria-label="Check answer"
      >
        <span aria-hidden>✓</span>
      </button>
    </div>
  );
}
