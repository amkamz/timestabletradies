import { PopCard, PopNote } from "@/components/ui/pop";
import { TradieAvatar } from "@/components/shell/hud";
import { InvitePanel } from "@/components/dashboard/invite-panel";
import { requireParent } from "@/lib/actions/auth";
import { removeStudent } from "@/lib/actions/onboarding";
import { FAMILY_LIMITS } from "@/lib/game/billing";
import { levelLabel } from "@/lib/game/city-level";
import { createClient } from "@/lib/supabase/server";

/** H5 · Family & profiles — plus H7, grandparent invites. */
export default async function FamilyPage() {
  const { familyId } = await requireParent();
  const supabase = await createClient();

  const [{ data: students }, { data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("students")
      .select("*")
      .eq("family_id", familyId)
      .order("created_at", { ascending: true }),
    supabase.from("family_members").select("*").eq("family_id", familyId),
    supabase.from("invites").select("*").eq("family_id", familyId).is("redeemed_at", null),
  ]);

  const roster = students ?? [];
  const parents = (members ?? []).filter((m) => m.role === "parent");
  const grandparents = (members ?? []).filter((m) => m.role === "grandparent");

  return (
    <>
      <h1 className="font-display text-2xl text-ink">Family &amp; profiles</h1>
      <p className="mt-1 font-sans text-sm font-bold text-mud">
        {roster.length} of {FAMILY_LIMITS.maxStudents} student profiles ·{" "}
        {parents.length} of {FAMILY_LIMITS.maxParents} parent accounts
      </p>

      <section className="mt-6">
        <h2 className="font-display text-lg text-ink">Students</h2>
        <ul className="mt-2 grid gap-3 sm:grid-cols-2">
          {roster.map((student) => (
            <PopCard as="li" key={student.id} className="flex items-center gap-3 p-3">
              <TradieAvatar student={student} size={44} />
              <div className="flex-1">
                <p className="font-display text-base text-ink">{student.display_name}</p>
                <p className="font-sans text-[11px] font-black text-red uppercase">
                  {levelLabel(student.city_xp)}
                </p>
                <p className="font-sans text-[11px] font-bold text-mud">
                  {[student.age ? `Age ${student.age}` : null, student.year_level]
                    .filter(Boolean)
                    .join(" · ") || "No year set"}
                </p>
              </div>
              <form action={removeStudent}>
                <input type="hidden" name="student_id" value={student.id} />
                <button
                  type="submit"
                  className="rounded-lg border-2 border-ink bg-white px-2 py-1 font-sans text-[10px] font-black text-red"
                >
                  Remove
                </button>
              </form>
            </PopCard>
          ))}
        </ul>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2">
        <div>
          <h2 className="font-display text-lg text-ink">Parent accounts</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {parents.map((member) => (
              <PopCard as="li" key={member.user_id} className="p-3">
                <p className="font-sans text-sm font-black text-ink">
                  {member.display_name || "Parent"}
                </p>
                <p className="font-sans text-[11px] font-bold text-mud">Full admin · billing</p>
              </PopCard>
            ))}
          </ul>

          {parents.length < FAMILY_LIMITS.maxParents ? (
            <div className="mt-3">
              <InvitePanel
                kind="parent"
                title="Invite the other parent"
                blurb="They get the same admin access, including billing."
                existing={(invites ?? []).filter((i) => i.kind === "parent").map((i) => i.code)}
              />
            </div>
          ) : (
            <p className="mt-3 font-sans text-xs font-bold text-mud">
              Both parent slots are in use.
            </p>
          )}
        </div>

        <div>
          <h2 className="font-display text-lg text-ink">Grandparent accounts</h2>
          <div className="mt-2">
            <PopNote>
              Grandparents can only send stickers. No stats, no billing, no crew links, and no
              free-text messages.
            </PopNote>
          </div>

          <ul className="mt-3 flex flex-col gap-2">
            {grandparents.map((member) => (
              <PopCard as="li" key={member.user_id} className="p-3">
                <p className="font-sans text-sm font-black text-ink">
                  {member.display_name || "Grandparent"}
                </p>
                <p className="font-sans text-[11px] font-bold text-mud">Stickers only</p>
              </PopCard>
            ))}
            {grandparents.length === 0 ? (
              <li className="font-sans text-xs font-bold text-mud">None invited yet.</li>
            ) : null}
          </ul>

          <div className="mt-3">
            <InvitePanel
              kind="grandparent"
              title="Invite a grandparent"
              blurb="Send them this code — it only unlocks sticker sending."
              existing={(invites ?? []).filter((i) => i.kind === "grandparent").map((i) => i.code)}
            />
          </div>
        </div>
      </section>
    </>
  );
}
