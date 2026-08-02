import { ArtSlot, PopLink } from "@/components/ui/pop";
import { AppFrame, Screen, ScreenBody } from "@/components/shell/screen";

/** A1 · Welcome — first launch. */
export default function WelcomePage() {
  return (
    <AppFrame>
      <Screen tone="teal">
        <div aria-hidden className="pop-hazard absolute top-[150px] right-0 left-0 h-3.5" />

        <ScreenBody className="items-center gap-0 px-6 pt-14 text-center">
          <h1 className="leading-[0.9]">
            <span className="block font-display text-[34px] text-white [text-shadow:3px_3px_0_#111]">
              TIMES TABLE
            </span>
            <span className="block font-display text-[44px] text-yellow [text-shadow:3px_3px_0_#111]">
              TRADIE
            </span>
          </h1>

          <ArtSlot
            tone="light"
            label={"HERO TRADIE\n+ TOOLBELT\nART"}
            className="mt-[150px] h-[150px] w-[150px] flex-col"
          />

          <p className="mt-6 font-sans text-sm font-bold text-teal-wash">
            Take on jobs, earn coins, and build your own house from the foundations up.
          </p>

          <div className="mt-auto flex w-full flex-col gap-2.5 pt-8">
            <PopLink href="/gate?next=/onboarding/parent" tone="red" size="lg" full>
              START A NEW SITE
            </PopLink>
            <PopLink href="/sign-in" tone="white" size="md" full>
              I ALREADY HAVE ONE
            </PopLink>
          </div>
        </ScreenBody>
      </Screen>
    </AppFrame>
  );
}
