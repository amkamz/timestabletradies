import Link from "next/link";
import { redirect } from "next/navigation";

import { Banner, cx } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { BottomNav } from "@/components/shell/nav";
import { requireActiveStudent } from "@/lib/data/session";
import { getMastery, getUnlockState, stagesFrom } from "@/lib/data/student";
import { factKey } from "@/lib/game/mastery";
import { DEFAULT_UNLOCK_ORDER, TRADE_ZONES } from "@/lib/game/zones";

/** C1 · Trade Zones map — tables mapped to trades, in curriculum order. */
export default async function ZonesPage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const [{ unlocked }, mastery] = await Promise.all([
    getUnlockState(student.id),
    getMastery(student.id),
  ]);
  const stages = stagesFrom(mastery);

  /** Share of this table's 12 facts that have reached Blue. */
  function fluency(table: number): number {
    let blue = 0;
    for (let b = 1; b <= 12; b++) {
      if (stages.get(factKey(table, b)) === "blue") blue += 1;
    }
    return Math.round((blue / 12) * 100);
  }

  const ordered = DEFAULT_UNLOCK_ORDER.map((t) => TRADE_ZONES.find((z) => z.table === t)!).filter(
    Boolean,
  );

  return (
    <Screen tone="paper">
      <ScreenBody className="px-4 pt-7">
        <Banner tone="teal">TRADE ZONES</Banner>

        <ul className="mt-3 flex flex-1 flex-col gap-2">
          {ordered.map((zone) => {
            const isUnlocked = unlocked.includes(zone.table);
            const pct = fluency(zone.table);
            const fluent = pct === 100;

            if (!isUnlocked) {
              return (
                <li
                  key={zone.table}
                  className="flex items-center gap-2.5 rounded-xl border-[3px] border-sand-pale bg-sand-panel px-3 py-2 opacity-90"
                >
                  <span
                    aria-hidden
                    className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border-[2.5px] border-sand-pale bg-sand-fill"
                  >
                    <span className="mb-1.5 h-2 w-3 rounded-t-[5px] border-[2.5px] border-b-0 border-sand" />
                  </span>
                  <span className="flex-1">
                    <span className="block font-display text-[13px] text-sand">{zone.trade}</span>
                    <span className="block font-sans text-[10px] font-extrabold text-sand-light">
                      ×{zone.table} · locked
                    </span>
                  </span>
                </li>
              );
            }

            return (
              <li key={zone.table}>
                <Link
                  href={fluent ? `/play/boss/${zone.table}` : "/play/jobs"}
                  className="flex items-center gap-2.5 rounded-xl border-[3px] border-ink bg-white px-3 py-2 shadow-pop-sm"
                >
                  <span
                    aria-hidden
                    className={cx(
                      "flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border-[2.5px] border-ink font-display text-[15px]",
                      fluent ? "bg-teal text-white" : "bg-yellow text-ink",
                    )}
                  >
                    ×{zone.table}
                  </span>
                  <span className="flex-1">
                    <span className="block font-display text-[13px] text-ink">{zone.trade}</span>
                    <span className="block font-sans text-[10px] font-extrabold text-mud">
                      ×{zone.table} · {fluent ? "fully fluent" : `${pct}% fluent`}
                    </span>
                  </span>
                  {fluent ? (
                    <span className="rounded-full border-2 border-ink bg-red px-2 py-1 font-display text-[9px] text-white">
                      BOSS
                    </span>
                  ) : (
                    <span className="rounded-full border-2 border-ink bg-red px-2 py-1 font-display text-[9px] text-white">
                      PLAY
                    </span>
                  )}
                </Link>
              </li>
            );
          })}

          <li className="rounded-xl bg-ink px-3 py-2.5 text-center">
            <p className="font-display text-[13px] text-yellow">🔒 ×12 SITE MANAGEMENT</p>
            <p className="mt-0.5 font-sans text-[9px] font-extrabold text-[#c9c4ba]">
              Capstone — mixes every trade
            </p>
          </li>
          <li className="rounded-xl bg-slate px-3 py-2.5 text-center">
            <p className="font-display text-[13px] text-teal-light">🔒 ×13+ NEW ZONES</p>
            <p className="mt-0.5 font-sans text-[9px] font-extrabold text-stone">
              Unlock once the 12×12 grid is all blue
            </p>
          </li>
        </ul>
      </ScreenBody>

      <BottomNav />
    </Screen>
  );
}
