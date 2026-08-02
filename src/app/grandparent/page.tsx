import { redirect } from "next/navigation";

import { PopCard, PopNote } from "@/components/ui/pop";
import { TradieAvatar } from "@/components/shell/hud";
import { signOut } from "@/lib/actions/auth";
import { sendSticker } from "@/lib/actions/family";
import { STICKERS } from "@/lib/game/billing";
import { getFamilyContext } from "@/lib/data/session";

/**
 * I2 · Grandparent sticker send.
 *
 * The entire grandparent surface. No stats, no billing, no crew management,
 * no free-text messaging — just a way to cheer a grandchild on (spec §2).
 */
export default async function GrandparentPage() {
  const context = await getFamilyContext();
  if (!context) redirect("/sign-in");
  // Parents have the full dashboard; this view is only for the narrow role.
  if (context.role === "parent") redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b-4 border-ink bg-paper">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <p className="font-display text-lg text-ink">Times Table Tradies</p>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border-[2.5px] border-ink bg-white px-2.5 py-1 font-sans text-xs font-black text-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-2xl px-5 py-8">
        <h1 className="font-display text-2xl text-ink">Send a sticker</h1>
        <p className="mt-1 font-sans text-sm font-bold text-mud">
          Pick a tradie, pick a sticker. It turns up next time they open the app.
        </p>

        <div className="mt-4">
          <PopNote>
            Your account is set up just for encouragement — you won&apos;t see scores, progress or
            anything to do with billing.
          </PopNote>
        </div>

        <div className="mt-6 flex flex-col gap-4">
          {context.students.map((student) => (
            <PopCard key={student.id} className="p-4">
              <div className="flex items-center gap-3">
                <TradieAvatar student={student} size={44} />
                <p className="font-display text-lg text-ink">{student.display_name}</p>
              </div>

              <ul className="mt-3 grid grid-cols-4 gap-2">
                {STICKERS.map((sticker) => (
                  <li key={sticker.key}>
                    <form action={sendSticker}>
                      <input type="hidden" name="student_id" value={student.id} />
                      <input type="hidden" name="sticker_key" value={sticker.key} />
                      <button
                        type="submit"
                        className="pop-press flex w-full flex-col items-center gap-1 rounded-xl border-[3px] border-ink bg-white px-2 py-3 shadow-pop-sm"
                      >
                        <span aria-hidden className="text-2xl">
                          {sticker.glyph}
                        </span>
                        <span className="font-sans text-[10px] leading-tight font-black text-ink">
                          {sticker.label}
                        </span>
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </PopCard>
          ))}

          {context.students.length === 0 ? (
            <p className="font-sans text-sm font-bold text-mud">
              No grandchildren linked to this account yet.
            </p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
