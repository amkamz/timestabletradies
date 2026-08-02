import { redirect } from "next/navigation";

import { ArtSlot, Banner, PopCard, PopLink, cx } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { BottomNav } from "@/components/shell/nav";
import { requireActiveStudent } from "@/lib/data/session";
import { getRareItems } from "@/lib/data/student";
import { HOUSE_STAGES, RARE_HOUSE_ITEMS, stageProgress } from "@/lib/game/progression";

/** D4 · House Project stages — the long-term reward track. */
export default async function HousePage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const rare = await getRareItems(student.id);
  const rareKeys = new Set(rare.map((r) => r.item_key));
  const currentIndex = student.house_stage;
  const finished = currentIndex >= HOUSE_STAGES.length - 1;

  if (finished) redirect("/play/house/move-in");

  return (
    <Screen tone="paper">
      <ScreenBody className="px-4 pt-7">
        <Banner tone="teal">HOUSE PROJECT</Banner>

        <ol className="mt-3 flex flex-col gap-2">
          {HOUSE_STAGES.slice(0, -1).map((stage, i) => {
            const done = i < currentIndex;
            const active = i === currentIndex;
            const pct = active ? stageProgress(currentIndex, student.house_loads) : done ? 100 : 0;

            return (
              <li
                key={stage.key}
                aria-current={active ? "step" : undefined}
                className={cx(
                  "rounded-xl border-[3px] px-3 py-2.5",
                  active
                    ? "border-ink bg-white shadow-pop"
                    : done
                      ? "border-teal bg-teal-tint"
                      : "border-sand-pale bg-sand-panel",
                )}
              >
                <div className="flex items-center gap-2.5">
                  <span
                    aria-hidden
                    className={cx(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-[2.5px] font-display text-[11px]",
                      done
                        ? "border-ink bg-teal text-white"
                        : active
                          ? "border-ink bg-yellow text-ink"
                          : "border-sand-pale bg-sand-fill text-sand",
                    )}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className="flex-1">
                    <span
                      className={cx(
                        "block font-display text-[13px]",
                        done ? "text-teal-deep" : active ? "text-ink" : "text-sand",
                      )}
                    >
                      {stage.name}
                    </span>
                    {active ? (
                      <span className="block font-sans text-[10.5px] font-extrabold text-mud">
                        {student.house_loads}/{stage.loads} {stage.unit}
                      </span>
                    ) : null}
                  </span>
                  {done ? (
                    <span className="font-sans text-[10px] font-black text-teal">DONE</span>
                  ) : null}
                </div>

                {active ? (
                  <div className="mt-2 h-3 overflow-hidden rounded-full border-2 border-ink bg-[#eee]">
                    <div className="h-full bg-teal" style={{ width: `${pct}%` }} />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ol>

        {/* Rare items — the collectible layer, boss battles only. */}
        <section className="mt-4">
          <h2 className="font-sans text-[10px] font-black tracking-wide text-mud uppercase">
            Rare items · boss battle rewards
          </h2>
          <ul className="mt-2 grid grid-cols-2 gap-2">
            {RARE_HOUSE_ITEMS.slice(0, 6).map((item) => {
              const won = rareKeys.has(item.key);
              return (
                <li key={item.key}>
                  <PopCard
                    flat
                    className={cx(
                      "h-full p-2.5",
                      won ? "border-ink bg-yellow-tint" : "border-sand-pale bg-sand-panel",
                    )}
                  >
                    <p
                      className={cx(
                        "font-display text-[11px]",
                        won ? "text-ink" : "text-sand",
                      )}
                    >
                      {won ? "★ " : "🔒 "}
                      {item.name}
                    </p>
                    <p className="mt-0.5 font-sans text-[10px] font-bold text-mud">
                      {won ? item.blurb : `Beat the ×${item.zone} boss`}
                    </p>
                  </PopCard>
                </li>
              );
            })}
          </ul>
        </section>

        <ArtSlot label={"HOUSE ART\n(current stage)"} className="mt-4 h-[120px] w-full flex-col" />

        <PopLink href="/play/jobs" tone="red" size="lg" full className="mt-4">
          EARN MORE MATERIALS ▸
        </PopLink>
      </ScreenBody>

      <BottomNav />
    </Screen>
  );
}
