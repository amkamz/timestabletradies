"use client";

import { useTransition } from "react";

import { PopCard, PopToggle, cx } from "@/components/ui/pop";
import { useA11y } from "@/components/a11y/a11y-provider";
import { saveSettings } from "@/lib/actions/settings";

/**
 * I1 · Accessibility settings (spec §13).
 *
 * Changes apply instantly in the client (so the effect is visible while you
 * choose) and are persisted per student, so siblings sharing the account
 * keep their own setup.
 */
export function SettingsPanel({ studentId }: { studentId: string }) {
  const { settings, update } = useA11y();
  const [, startTransition] = useTransition();

  function set(patch: Partial<typeof settings>) {
    update(patch);
    startTransition(async () => {
      await saveSettings(studentId, patch);
    });
  }

  return (
    <div className="mt-4 flex flex-col gap-2.5">
      <PopToggle
        checked={settings.read_aloud}
        onChange={(v) => set({ read_aloud: v })}
        label="Read questions aloud"
        hint="Word problems and questions are spoken."
      />
      <PopToggle
        checked={settings.dyslexia_font}
        onChange={(v) => set({ dyslexia_font: v })}
        label="Dyslexia-friendly font"
        hint="Wider letter shapes and spacing."
      />
      <PopToggle
        checked={settings.high_contrast}
        onChange={(v) => set({ high_contrast: v })}
        label="High contrast"
        hint="Stronger colours and heavier outlines."
      />
      <PopToggle
        checked={settings.reduced_motion}
        onChange={(v) => set({ reduced_motion: v })}
        label="Reduce motion"
        hint="Turns off animations and celebrations."
      />

      <PopCard className="p-3">
        <fieldset>
          <legend className="font-sans text-[11px] font-black tracking-wide text-mud uppercase">
            Timers
          </legend>
          <p className="mt-1 font-sans text-[11px] font-bold text-mud">
            Every timed mode can be slowed down or switched off. It never changes what a question
            is worth.
          </p>
          <div className="mt-2.5 flex gap-2">
            {(
              [
                { key: "standard", label: "Normal" },
                { key: "extended", label: "Double time" },
                { key: "off", label: "No timer" },
              ] as const
            ).map((option) => (
              <button
                key={option.key}
                type="button"
                aria-pressed={settings.timer_mode === option.key}
                onClick={() => set({ timer_mode: option.key })}
                className={cx(
                  "pop-press flex-1 rounded-[10px] border-[2.5px] border-ink py-2 text-center font-display text-[11px]",
                  settings.timer_mode === option.key ? "bg-teal text-white" : "bg-white text-ink",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>
      </PopCard>

      <PopCard className="p-3">
        <label htmlFor="text-scale" className="font-sans text-[11px] font-black tracking-wide text-mud uppercase">
          Text size
        </label>
        <input
          id="text-scale"
          type="range"
          min={0.9}
          max={1.6}
          step={0.1}
          value={settings.text_scale}
          onChange={(e) => set({ text_scale: Number(e.target.value) })}
          className="mt-2 w-full accent-[#17b5a4]"
        />
        <p className="mt-1 font-sans text-[11px] font-bold text-mud">
          {Math.round(settings.text_scale * 100)}% · your device&apos;s own text size setting still
          applies on top.
        </p>
      </PopCard>
    </div>
  );
}
