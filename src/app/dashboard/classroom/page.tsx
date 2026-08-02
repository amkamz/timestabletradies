import { PopCard, PopNote } from "@/components/ui/pop";
import { MasteryGrid } from "@/components/mastery/grid";
import { ClassMasteryOverlay } from "@/components/mastery/class-overlay";
import { AssignmentForm, CreateClassForm } from "@/components/dashboard/classroom-forms";
import { requireParent } from "@/lib/actions/auth";
import { getMastery, stagesFrom } from "@/lib/data/student";
import { createClient } from "@/lib/supabase/server";

/** H8 · Classroom assign + H9 · Class Mastery overlay. */
export default async function ClassroomPage(props: PageProps<"/dashboard/classroom">) {
  const { userId } = await requireParent();
  const supabase = await createClient();

  const { data: classrooms } = await supabase
    .from("classrooms")
    .select("*")
    .eq("teacher_id", userId)
    .order("created_at", { ascending: true });

  const classes = classrooms ?? [];
  const { class: classParam } = await props.searchParams;
  const selected = classes.find((c) => c.id === classParam) ?? classes[0] ?? null;

  if (!selected) {
    return (
      <>
        <h1 className="font-display text-2xl text-ink">Classroom</h1>
        <p className="mt-1 font-sans text-sm font-bold text-mud">
          Set focus tables for a group, and see everyone&apos;s mastery in one view.
        </p>
        <div className="mt-5 max-w-md">
          <CreateClassForm />
        </div>
      </>
    );
  }

  const { data: enrolled } = await supabase
    .from("classroom_students")
    .select("student_id")
    .eq("classroom_id", selected.id);

  const studentIds = (enrolled ?? []).map((e) => e.student_id);
  const { data: students } = studentIds.length
    ? await supabase.from("students").select("id, display_name").in("id", studentIds)
    : { data: [] };

  const roster = students ?? [];
  const grids = await Promise.all(
    roster.map(async (student) => ({
      student,
      stages: stagesFrom(await getMastery(student.id)),
    })),
  );

  return (
    <>
      <h1 className="font-display text-2xl text-ink">{selected.name}</h1>
      <p className="mt-1 font-sans text-sm font-bold text-mud">
        Join code <span className="font-mono tracking-widest text-ink">{selected.join_code}</span> ·{" "}
        {roster.length} student{roster.length === 1 ? "" : "s"}
      </p>

      <section className="mt-6 grid gap-5 md:grid-cols-2">
        <AssignmentForm classroomId={selected.id} roster={roster} />
        <CreateClassForm />
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg text-ink">Class mastery overlay</h2>
        <p className="mt-1 font-sans text-xs font-bold text-mud">
          Every grid stacked together — the share of the class confident on each fact. Low numbers
          are worth reteaching to the whole group.
        </p>

        {grids.length === 0 ? (
          <div className="mt-3">
            <PopNote>No students have joined this class yet.</PopNote>
          </div>
        ) : (
          <PopCard className="mt-3 p-4">
            <ClassMasteryOverlay grids={grids.map((g) => g.stages)} />
          </PopCard>
        )}
      </section>

      {grids.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display text-lg text-ink">Roster view</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {grids.map(({ student, stages }) => (
              <PopCard key={student.id} className="p-3">
                <h3 className="font-display text-sm text-ink">{student.display_name}</h3>
                <div className="mt-2">
                  <MasteryGrid stages={stages} compact />
                </div>
              </PopCard>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
