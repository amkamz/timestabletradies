import { redirect } from "next/navigation";

import { Eyebrow, PopCard, PopLink } from "@/components/ui/pop";
import { AppFrame, Screen, ScreenBody } from "@/components/shell/screen";
import { TradieAvatar } from "@/components/shell/hud";
import { requireParent } from "@/lib/actions/auth";
import { FAMILY_LIMITS, PLANS } from "@/lib/game/billing";
import { createClient } from "@/lib/supabase/server";

import { AddStudentForm } from "./add-student-form";

/** A4 · Add a student — up to 5 profiles per account. */
export default async function StudentsPage() {
  const { familyId } = await requireParent();
  const supabase = await createClient();

  const [{ data: students }, { data: family }] = await Promise.all([
    supabase
      .from("students")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true }),
    supabase.from("families").select("plan").eq("id", familyId).single(),
  ]);

  const roster = students ?? [];
  const plan = PLANS[(family?.plan ?? "annual") as "annual" | "monthly"];
  const nextUnnamed = roster.find((s) => !s.onboarded_at);

  // Everyone's set up — straight into the app.
  if (roster.length > 0 && !nextUnnamed) redirect("/play");

  return (
    <AppFrame>
      <Screen tone="paper">
        <ScreenBody className="px-5 pt-9">
          <Eyebrow>Step 2 of 3 · Profiles</Eyebrow>
          <h1 className="mt-1.5 font-display text-2xl leading-tight text-ink">
            Who&apos;s on the crew?
          </h1>

          <ul className="mt-4 flex flex-col gap-2.5">
            {roster.map((student) => (
              <PopCard as="li" key={student.id} className="flex items-center gap-3 py-2.5">
                <TradieAvatar student={student} size={40} />
                <span className="flex-1">
                  <span className="block font-display text-[15px] text-ink">
                    {student.display_name}
                  </span>
                  <span className="block font-sans text-[11px] font-extrabold text-mud">
                    {[student.age ? `Age ${student.age}` : null, student.year_level]
                      .filter(Boolean)
                      .join(" · ") || "Ready to set up"}
                  </span>
                </span>
                <span
                  className={
                    student.onboarded_at
                      ? "font-sans text-[11px] font-black text-teal"
                      : "font-sans text-[11px] font-black text-amber-deep"
                  }
                >
                  {student.onboarded_at ? "READY" : "NEEDS A LOOK"}
                </span>
              </PopCard>
            ))}
          </ul>

          {roster.length < FAMILY_LIMITS.maxStudents ? (
            <div className="mt-3">
              <AddStudentForm />
            </div>
          ) : (
            <p className="mt-3 font-sans text-[11.5px] font-bold text-mud">
              That&apos;s the full crew — {FAMILY_LIMITS.maxStudents} profiles is the limit.
            </p>
          )}

          <p className="mt-3.5 font-sans text-[11.5px] leading-snug font-bold text-mud">
            {roster.length} of {FAMILY_LIMITS.maxStudents} profiles used · each extra child is{" "}
            {plan.period === "year" ? "$25/year" : "$2/month"}
          </p>

          {nextUnnamed ? (
            <PopLink
              href={`/onboarding/look?student=${nextUnnamed.id}`}
              tone="teal"
              size="lg"
              full
              className="mt-auto"
            >
              NEXT: PICK LOOKS
            </PopLink>
          ) : null}
        </ScreenBody>
      </Screen>
    </AppFrame>
  );
}
