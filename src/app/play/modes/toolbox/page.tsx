import { redirect } from "next/navigation";

import { Banner } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { requireActiveStudent } from "@/lib/data/session";
import { getUnlockState } from "@/lib/data/student";

import { ToolboxSetup } from "./toolbox-setup";

/** C6 · Toolbox Time — relaxed setup, no timer. */
export default async function ToolboxPage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  const { unlocked, divisionUnlocked } = await getUnlockState(student.id);

  return (
    <Screen tone="paper">
      <ScreenBody className="px-5 pt-7">
        <Banner tone="mint">TOOLBOX TIME</Banner>
        <p className="mt-1.5 text-center font-sans text-xs font-extrabold text-mud">
          No timer, no pressure. Set it up your way.
        </p>

        <ToolboxSetup tables={unlocked} divisionUnlocked={divisionUnlocked} />
      </ScreenBody>
    </Screen>
  );
}
