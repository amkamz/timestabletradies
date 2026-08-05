"use client";

import { ArtSlot, Brick, Coin, PopButton, PopCard, PopLink } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { stageAt, stageProgress } from "@/lib/game/progression";
import type { RunResult } from "@/lib/actions/play";

/** B9 · Job complete — accuracy, average time, and what it earned. */
export function ResultsScreen({
  label,
  result,
  saving,
  homeHref,
  onAgain,
  headline = "JOB DONE!",
}: {
  label: string;
  result: RunResult | null;
  saving: boolean;
  homeHref: string;
  onAgain: () => void;
  /** Modes that don't end in a finished job say something else — "TIMBER!". */
  headline?: string;
}) {
  if (saving || !result) {
    return (
      <Screen tone="paper">
        <ScreenBody className="items-center justify-center">
          <p className="font-display text-lg text-ink" role="status">
            Banking your work…
          </p>
        </ScreenBody>
      </Screen>
    );
  }

  const accuracy = Math.round(result.accuracy * 100);
  const avgSeconds = (result.avgMs / 1000).toFixed(1);
  const stage = stageAt(result.houseStage);
  const progress = stageProgress(result.houseStage, result.houseLoads);

  return (
    <Screen tone="paper">
      <ScreenBody className="items-center px-5 pt-7">
        <h1 className="anim-pop-in inline-block -rotate-3 rounded-2xl border-4 border-ink bg-yellow px-5 py-2 font-display text-[22px] text-ink shadow-pop">
          {headline}
        </h1>

        <ArtSlot label={"STAR /\nCONFETTI"} className="mt-4 h-[110px] w-[110px] flex-col" />
        <p className="mt-2 font-display text-[15px] text-ink">{label}</p>

        <PopCard className="mt-3.5 grid w-full grid-cols-3 gap-2 p-3.5 text-center shadow-pop">
          <Stat value={`${accuracy}%`} label="Accuracy" tone="text-teal" />
          <Stat value={`${avgSeconds}s`} label="Avg time" tone="text-red" />
          <Stat value={`${result.correct}/${result.total}`} label="Correct" tone="text-ink" />
        </PopCard>

        <div className="mt-2.5 flex w-full gap-2.5">
          <PopCard className="flex flex-1 items-center justify-center gap-2 py-2.5 shadow-pop">
            <Coin size={20} />
            <span className="font-display text-base text-ink" aria-hidden>
              +{result.coins}
            </span>
            <span className="sr-only">{result.coins} coins earned</span>
          </PopCard>
          <PopCard className="flex flex-1 items-center justify-center gap-2 py-2.5 shadow-pop">
            <Brick size={20} />
            <span className="font-display text-base text-ink" aria-hidden>
              +{result.materials}
            </span>
            <span className="sr-only">{result.materials} loads of materials banked</span>
          </PopCard>
        </div>

        <div className="mt-2.5 w-full rounded-2xl border-[3px] border-ink bg-teal p-3 text-center text-white">
          <p className="font-display text-xs uppercase">Materials banked</p>
          <p className="font-sans text-[11px] font-black text-teal-mist">
            {stage.name} stage → {progress}%
          </p>
        </div>

        {/* Milestones stack up under the summary rather than interrupting it. */}
        <div className="mt-2.5 flex w-full flex-col gap-2">
          {result.height !== undefined ? (
            result.newPersonalBest ? (
              <Milestone tone="yellow">
                ⚑ New record — {result.height} planks, beating {result.previousBest}!
              </Milestone>
            ) : (
              <Milestone tone="teal">
                Height {result.height}. Your record is still {result.previousBest}.
              </Milestone>
            )
          ) : null}
          {result.distance !== undefined ? (
            <Milestone tone={result.place === 1 ? "yellow" : "teal"}>
              🏁 {ordinal(result.place ?? 0)} of {result.fieldSize} · {result.distance} lengths
            </Milestone>
          ) : null}
          {result.coinsCapped ? (
            <Milestone tone="teal">
              Nice work — coins are capped for today, but the record still counts.
            </Milestone>
          ) : null}
          {result.stagesCompleted.map((s) => (
            <Milestone key={s.key} tone="teal">
              🎉 {s.name} is finished — on to the next stage!
            </Milestone>
          ))}
          {result.levelsGained > 0 ? (
            <Milestone tone="yellow">
              ⬆ Sparky&apos;s City reached level {result.cityLevel}!
            </Milestone>
          ) : null}
          {result.streakPointsAwarded > 0 ? (
            <Milestone tone="yellow">
              🔥 Ten days on the trot — {result.streakPointsAwarded} streak point
              {result.streakPointsAwarded === 1 ? "" : "s"} banked.
            </Milestone>
          ) : null}
          {result.streakTiersLost > 0 ? (
            // Stated plainly and without scolding. A missed day costs one step
            // off the rate, never the points already earned, and a child who is
            // told that clearly is more likely to come back tomorrow.
            <Milestone tone="teal">
              Your streak dropped a step while you were away — the points you
              earned are safe.
            </Milestone>
          ) : null}
          {result.divisionUnlockedFor ? (
            <Milestone tone="teal">
              ÷ Division for ×{result.divisionUnlockedFor} is now unlocked.
            </Milestone>
          ) : null}
          {result.rareItem ? (
            <Milestone tone="yellow">★ Rare item won: {result.rareItem.name}</Milestone>
          ) : null}
          {result.newTable ? (
            <Milestone tone="yellow">
              🔓 Every fact went Blue — the ×{result.newTable} zone is open!
            </Milestone>
          ) : null}
        </div>

        <div className="mt-auto flex w-full gap-2.5 pt-4">
          <PopButton tone="white" size="md" className="flex-1" onClick={onAgain}>
            AGAIN
          </PopButton>
          <PopLink href={homeHref} tone="red" size="md" className="flex-[1.4]">
            BACK TO SITE
          </PopLink>
        </div>
      </ScreenBody>
    </Screen>
  );
}

function ordinal(n: number): string {
  const suffix = n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}

function Stat({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div>
      <p className={`font-display text-xl ${tone}`}>{value}</p>
      <p className="font-sans text-[9px] font-black text-mud uppercase">{label}</p>
    </div>
  );
}

function Milestone({ children, tone }: { children: React.ReactNode; tone: "teal" | "yellow" }) {
  return (
    <p
      role="status"
      className={
        tone === "teal"
          ? "anim-rise rounded-xl border-2 border-dashed border-teal bg-teal-tint px-3 py-2 font-sans text-[11.5px] font-bold text-teal-deep"
          : "anim-rise rounded-xl border-2 border-dashed border-amber bg-yellow-tint px-3 py-2 font-sans text-[11.5px] font-bold text-amber-deep"
      }
    >
      {children}
    </p>
  );
}
