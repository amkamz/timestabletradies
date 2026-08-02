import { AppFrame, Screen, ScreenBody } from "@/components/shell/screen";
import { newGateChallenge } from "@/lib/game/seed";

import { GateForm } from "./gate-form";

/** A2 · Grown-up gate. */
export default async function GatePage(props: PageProps<"/gate">) {
  const { next } = await props.searchParams;
  const target = typeof next === "string" && next.startsWith("/") ? next : "/onboarding/parent";

  const challenge = newGateChallenge();

  return (
    <AppFrame>
      <Screen tone="paper">
        <ScreenBody className="items-center px-6 pt-10 text-center">
          <span
            aria-hidden
            className="flex h-16 w-16 items-center justify-center rounded-2xl border-[3px] border-ink bg-yellow shadow-pop-sm"
          >
            <span className="mb-3 h-4 w-5 rounded-t-[9px] border-4 border-b-0 border-ink" />
          </span>

          <h1 className="mt-5 font-display text-[22px] text-ink">Grab a grown-up</h1>
          <p className="mt-2 font-sans text-sm leading-relaxed font-bold text-mud">
            Setting up, adding crew and anything to do with money is done by a parent. Ask them to
            key in the answer.
          </p>

          <GateForm next={target} challenge={challenge} />
        </ScreenBody>
      </Screen>
    </AppFrame>
  );
}
