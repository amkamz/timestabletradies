"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { StudentSettingsRow } from "@/lib/supabase/types";

export type A11ySettings = Pick<
  StudentSettingsRow,
  "read_aloud" | "dyslexia_font" | "high_contrast" | "reduced_motion" | "text_scale" | "timer_mode"
>;

type A11yContextValue = {
  settings: A11ySettings;
  update: (patch: Partial<A11ySettings>) => void;
  /** Speak text via the platform voice, when read-aloud is on (spec §13). */
  speak: (text: string) => void;
  /** Timer length after the student's timer preference is applied. */
  resolveTimer: (baseSeconds: number) => number | null;
};

const A11yContext = createContext<A11yContextValue | null>(null);

const STORAGE_KEY = "ttt_a11y";

export function A11yProvider({
  settings: initial,
  children,
}: {
  settings: A11ySettings;
  children: React.ReactNode;
}) {
  const [settings, setSettings] = useState<A11ySettings>(initial);

  // Reflect preferences onto <html> so the CSS in globals.css can act on them,
  // and persist so the inline boot script can apply them before first paint.
  useEffect(() => {
    const root = document.documentElement;
    if (settings.dyslexia_font) root.dataset.font = "dyslexic";
    else delete root.dataset.font;

    if (settings.high_contrast) root.dataset.contrast = "high";
    else delete root.dataset.contrast;

    if (settings.reduced_motion) root.dataset.motion = "reduced";
    else delete root.dataset.motion;

    root.style.setProperty("--a11y-text-scale", String(settings.text_scale));

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Private browsing — preferences just won't survive a reload.
    }
  }, [settings]);

  const value = useMemo<A11yContextValue>(
    () => ({
      settings,
      update: (patch) => setSettings((s) => ({ ...s, ...patch })),
      speak: (text: string) => {
        if (!settings.read_aloud) return;
        if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      },
      resolveTimer: (baseSeconds: number) => {
        // Every timed mode can be extended or switched off entirely (spec §13).
        if (settings.timer_mode === "off") return null;
        if (settings.timer_mode === "extended") return Math.round(baseSeconds * 2);
        return baseSeconds;
      },
    }),
    [settings],
  );

  return <A11yContext.Provider value={value}>{children}</A11yContext.Provider>;
}

export function useA11y(): A11yContextValue {
  const ctx = useContext(A11yContext);
  if (!ctx) {
    // Screens outside /play (onboarding, dashboard) render without the
    // provider; fall back to sensible defaults rather than throwing.
    return {
      settings: {
        read_aloud: false,
        dyslexia_font: false,
        high_contrast: false,
        reduced_motion: false,
        text_scale: 1,
        timer_mode: "standard",
      },
      update: () => {},
      speak: () => {},
      resolveTimer: (s) => s,
    };
  }
  return ctx;
}
