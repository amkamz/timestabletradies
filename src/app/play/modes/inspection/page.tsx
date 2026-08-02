import Link from "next/link";

import { Pill, PopCard, PopLink, PopNote } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";

/** C5 · Site Inspection — 25 questions, strict 6-second timer. */
export default function InspectionPage() {
  return (
    <Screen tone="red">
      <ScreenBody className="px-5 pt-7">
        <div className="flex items-center justify-between">
          <Link
            href="/play/modes"
            aria-label="Back to the training shed"
            className="pop-press flex h-8 w-8 items-center justify-center rounded-[9px] border-[3px] border-ink bg-white font-display text-ink shadow-pop-sm"
          >
            <span aria-hidden>✕</span>
          </Link>
          <Pill tone="ink">MULTIPLY ONLY</Pill>
        </div>

        <h1 className="mt-4 font-display text-[28px] text-white [text-shadow:2px_2px_0_#111]">
          Site Inspection
        </h1>
        <p className="mt-1 font-sans text-[13px] font-extrabold text-red-tint">
          A formal skills check. Twenty-five questions, six seconds each, no coasting.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <PopCard className="p-3 text-center shadow-pop">
            <p className="font-display text-xl text-ink">25</p>
            <p className="font-sans text-[9px] font-black text-mud uppercase">Questions</p>
          </PopCard>
          <PopCard className="p-3 text-center shadow-pop">
            <p className="font-display text-xl text-ink">6s</p>
            <p className="font-sans text-[9px] font-black text-mud uppercase">Per question</p>
          </PopCard>
        </div>

        <div className="mt-3">
          <PopNote tone="light">
            Need longer? The timer can be extended or switched off in Settings — it won&apos;t
            change what the questions are worth.
          </PopNote>
        </div>

        <PopLink href="/play/run?mode=inspection" tone="yellow" size="lg" full className="mt-auto">
          START INSPECTION ▸
        </PopLink>
      </ScreenBody>
    </Screen>
  );
}
