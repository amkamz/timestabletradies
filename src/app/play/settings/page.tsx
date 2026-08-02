import { redirect } from "next/navigation";

import { Banner, PopNote } from "@/components/ui/pop";
import { Screen, ScreenBody } from "@/components/shell/screen";
import { BottomNav } from "@/components/shell/nav";
import { requireActiveStudent } from "@/lib/data/session";

import { SettingsPanel } from "./settings-panel";

/** I1 · Accessibility settings. */
export default async function SettingsPage() {
  const student = await requireActiveStudent();
  if (!student) redirect("/onboarding/students");

  return (
    <Screen tone="paper">
      <ScreenBody className="px-4 pt-7">
        <Banner tone="mint">SET IT UP YOUR WAY</Banner>

        <SettingsPanel studentId={student.id} />

        <div className="mt-4">
          <PopNote>
            These settings are just for {student.display_name} — everyone on this account has their
            own.
          </PopNote>
        </div>
      </ScreenBody>

      <BottomNav />
    </Screen>
  );
}
