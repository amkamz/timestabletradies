import { redirect } from "next/navigation";

import { AppFrame, Screen, ScreenBody } from "@/components/shell/screen";
import { requireParent } from "@/lib/actions/auth";
import { serveNameOptions } from "@/lib/game/names";

import { NamePicker } from "./name-picker";

/** A6 · Name generator — 10 of each pool, all pre-vetted. */
export default async function NamePage(props: PageProps<"/onboarding/name">) {
  await requireParent();
  const { student } = await props.searchParams;
  const studentId = typeof student === "string" ? student : null;
  if (!studentId) redirect("/onboarding/students");

  // Seeded by profile id: the same kid sees the same shortlist if they come
  // back mid-setup, but different kids get different ones.
  const pools = serveNameOptions(studentId);

  return (
    <AppFrame>
      <Screen tone="paper">
        <ScreenBody className="px-5 pt-7">
          <NamePicker studentId={studentId} pools={pools} />
        </ScreenBody>
      </Screen>
    </AppFrame>
  );
}
