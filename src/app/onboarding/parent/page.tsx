import { Eyebrow } from "@/components/ui/pop";
import { AppFrame, Screen, ScreenBody } from "@/components/shell/screen";

import { ParentForm } from "./parent-form";

/** A3 · Create parent account — the root account, holds billing. */
export default function ParentAccountPage() {
  return (
    <AppFrame>
      <Screen tone="paper">
        <ScreenBody className="px-6 pt-9">
          <Eyebrow>Step 1 of 3 · Parent</Eyebrow>
          <h1 className="mt-1.5 font-display text-2xl leading-tight text-ink">
            Set up the parent account
          </h1>
          <div className="mt-5 flex flex-1 flex-col">
            <ParentForm />
          </div>
        </ScreenBody>
      </Screen>
    </AppFrame>
  );
}
