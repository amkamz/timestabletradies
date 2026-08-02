"use client";

import { useState } from "react";

import { STICKERS } from "@/lib/game/billing";
import { createClient } from "@/lib/supabase/client";
import type { StickerRow } from "@/lib/supabase/types";

/**
 * Stickers waiting for the kid (spec §2). Light-touch encouragement from a
 * grandparent — no message body, nothing to reply to, no sender contact.
 */
export function StickerInbox({ stickers }: { stickers: StickerRow[] }) {
  const [open, setOpen] = useState(true);
  if (!open || stickers.length === 0) return null;

  const glyphs = stickers
    .map((s) => STICKERS.find((k) => k.key === s.sticker_key))
    .filter((s): s is (typeof STICKERS)[number] => Boolean(s));

  async function dismiss() {
    setOpen(false);
    const supabase = createClient();
    await supabase
      .from("stickers")
      .update({ seen_at: new Date().toISOString() })
      .in(
        "id",
        stickers.map((s) => s.id),
      );
  }

  return (
    <div
      role="status"
      className="anim-rise mb-2.5 flex items-center gap-3 rounded-2xl border-[3px] border-ink bg-teal p-2.5 shadow-pop-sm"
    >
      <span aria-hidden className="text-2xl">
        {glyphs[0]?.glyph ?? "⭐"}
      </span>
      <p className="flex-1 font-sans text-[12px] leading-tight font-black text-white">
        {glyphs.length === 1
          ? `Someone sent you a sticker: “${glyphs[0]?.label}”`
          : `${glyphs.length} stickers came in for you!`}
      </p>
      <button
        type="button"
        onClick={dismiss}
        className="pop-press rounded-xl border-[2.5px] border-ink bg-white px-2.5 py-1 font-display text-[11px] text-ink"
      >
        NICE!
      </button>
    </div>
  );
}
