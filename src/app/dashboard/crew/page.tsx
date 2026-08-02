import { PopCard, PopNote } from "@/components/ui/pop";
import { InvitePanel } from "@/components/dashboard/invite-panel";
import { RedeemForm } from "@/components/dashboard/redeem-form";
import { requireParent } from "@/lib/actions/auth";
import { removeCrewLink } from "@/lib/actions/family";
import { createClient } from "@/lib/supabase/server";

/** H6 · Link crew — parent-to-parent, which is what enables multiplayer. */
export default async function CrewPage() {
  const { familyId } = await requireParent();
  const supabase = await createClient();

  const [{ data: links }, { data: invites }, { data: roster }] = await Promise.all([
    supabase.from("crew_links").select("*"),
    supabase
      .from("invites")
      .select("*")
      .eq("family_id", familyId)
      .eq("kind", "crew")
      .is("redeemed_at", null),
    supabase.from("crew_roster").select("*"),
  ]);

  const active = (links ?? []).filter((l) => l.status === "active");

  return (
    <>
      <h1 className="font-display text-2xl text-ink">Crew</h1>
      <p className="mt-1 font-sans text-sm font-bold text-mud">
        Linking families is how multiplayer works. Kids can&apos;t add anyone themselves.
      </p>

      <div className="mt-4">
        <PopNote>
          Once you link with another parent, the student profiles under both accounts become
          visible to each other as crew — for Crew Race, Trade Expo and Job Challenge. Nothing
          else is shared: no stats, no ages, no contact details.
        </PopNote>
      </div>

      <section className="mt-6 grid gap-5 md:grid-cols-2">
        <InvitePanel
          kind="crew"
          title="Invite another family"
          blurb="Send this code to the other parent. One use, expires in 14 days."
          existing={(invites ?? []).map((i) => i.code)}
        />
        <RedeemForm />
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg text-ink">Linked families</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {active.map((link) => (
            <PopCard as="li" key={link.id} className="flex items-center gap-3 p-3">
              <div className="flex-1">
                <p className="font-sans text-sm font-black text-ink">Linked family</p>
                <p className="font-sans text-[11px] font-bold text-mud">
                  Linked {new Date(link.created_at).toLocaleDateString("en-AU")}
                </p>
              </div>
              <form action={removeCrewLink}>
                <input type="hidden" name="link_id" value={link.id} />
                <button
                  type="submit"
                  className="rounded-lg border-2 border-ink bg-white px-2 py-1 font-sans text-[10px] font-black text-red"
                >
                  Unlink
                </button>
              </form>
            </PopCard>
          ))}
          {active.length === 0 ? (
            <li className="font-sans text-sm font-bold text-mud">
              No families linked yet. Kids can still race practice opponents.
            </li>
          ) : null}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-display text-lg text-ink">Visible crew</h2>
        <p className="mt-1 font-sans text-xs font-bold text-mud">
          The students your kids can see and race.
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {(roster ?? []).map((mate) => (
            <li
              key={mate.id}
              className="rounded-lg border-[2.5px] border-ink bg-white px-3 py-1.5 font-sans text-xs font-black text-ink"
            >
              {mate.display_name}
            </li>
          ))}
          {(roster ?? []).length === 0 ? (
            <li className="font-sans text-sm font-bold text-mud">Nobody yet.</li>
          ) : null}
        </ul>
      </section>
    </>
  );
}
