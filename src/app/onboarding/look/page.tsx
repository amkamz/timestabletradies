import { redirect } from "next/navigation";

import { AppFrame, Screen, ScreenBody } from "@/components/shell/screen";
import { requireParent } from "@/lib/actions/auth";

import { LookPicker } from "./look-picker";

/** A5 · Pick your look. */
export default async function LookPage(props: PageProps<"/onboarding/look">) {
  await requireParent();
  const { student } = await props.searchParams;
  const studentId = typeof student === "string" ? student : null;
  if (!studentId) redirect("/onboarding/students");

  return (
    <AppFrame>
      <Screen tone="paper">
        <ScreenBody className="px-5 pt-8">
          <LookPicker studentId={studentId} />
        </ScreenBody>
      </Screen>
    </AppFrame>
  );
}
