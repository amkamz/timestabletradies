/**
 * Database types.
 *
 * Hand-maintained to match supabase/migrations/. Regenerate with
 * `npx supabase gen types typescript --local > src/lib/supabase/types.ts`
 * once you have the Supabase CLI linked to a project.
 */

export type Operation = "multiply" | "divide";
export type RunMode =
  | "job"
  | "garage"
  | "yard"
  | "inspection"
  | "toolbox"
  | "bigjob"
  | "boss"
  | "crewrace"
  | "expo"
  | "challenge"
  // docs/game-modes/
  | "cablerun"
  | "rally"
  | "tooloff"
  | "scaffold"
  | "floorplan";

/**
 * supabase-js infers `never` unless each table also carries `Relationships`,
 * so the helper supplies it.
 */
type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type FamilyRow = {
  id: string;
  name: string;
  plan: "annual" | "monthly";
  plan_status: "trialing" | "active" | "past_due" | "canceled";
  billing_ref: string | null;
  created_at: string;
};

export type FamilyMemberRow = {
  family_id: string;
  user_id: string;
  role: "parent" | "grandparent";
  display_name: string;
  created_at: string;
};

export type StudentRow = {
  id: string;
  family_id: string;
  display_name: string;
  age: number | null;
  year_level: string | null;
  name_trade: string | null;
  name_adjective: string | null;
  name_surname: string | null;
  look_model: number;
  look_skin: string;
  look_hair: string;
  coins: number;
  rank_rung: number;
  house_stage: number;
  house_loads: number;
  onboarded_at: string | null;
  created_at: string;
};

export type StudentTableRow = {
  student_id: string;
  table_no: number;
  unlocked_at: string;
  division_unlocked: boolean;
};

export type FactMasteryRow = {
  student_id: string;
  a: number;
  b: number;
  attempts: number;
  correct: number;
  avg_ms: number;
  /** Attempts that fed `avg_ms`. Untimed modes raise `attempts` but not this. */
  speed_attempts: number;
  retention_hits: number;
  last_seen_at: string | null;
};

export type RunRow = {
  id: string;
  student_id: string;
  mode: RunMode;
  job_type: "quick" | "delivery" | "measure" | "build" | "muster" | null;
  table_no: number | null;
  operation: Operation | "both";
  questions: number;
  correct: number;
  avg_ms: number;
  coins: number;
  materials: number;
  shared_with_teacher: boolean;
  started_at: string;
  finished_at: string | null;
};

export type AnswerRow = {
  id: number;
  run_id: string;
  student_id: string;
  a: number;
  b: number;
  operation: Operation;
  correct: boolean;
  elapsed_ms: number;
};

export type CosmeticRow = {
  student_id: string;
  item_key: string;
  equipped: boolean;
  bought_at: string;
};

export type RareItemRow = {
  student_id: string;
  item_key: string;
  won_at: string;
};

export type CrewLinkRow = {
  id: string;
  family_a: string;
  family_b: string;
  status: "pending" | "active" | "blocked";
  created_by: string;
  created_at: string;
};

export type InviteRow = {
  code: string;
  family_id: string;
  kind: "parent" | "grandparent" | "crew";
  created_by: string;
  expires_at: string;
  redeemed_at: string | null;
  redeemed_by: string | null;
};

export type StickerRow = {
  id: string;
  student_id: string;
  sender_id: string;
  sticker_key: string;
  sent_at: string;
  seen_at: string | null;
};

export type ChallengeRow = {
  id: string;
  seed: string;
  table_no: number | null;
  questions: number;
  from_student: string;
  to_student: string | null;
  from_run: string | null;
  to_run: string | null;
  status: "sent" | "complete" | "expired";
  created_at: string;
};

export type ClassroomRow = {
  id: string;
  name: string;
  teacher_id: string;
  join_code: string;
  created_at: string;
};

export type ClassroomStudentRow = {
  classroom_id: string;
  student_id: string;
  joined_at: string;
};

export type AssignmentRow = {
  id: string;
  classroom_id: string;
  student_id: string | null;
  tables: number[];
  operation: Operation | "both";
  note: string | null;
  created_at: string;
};

export type StudentSettingsRow = {
  student_id: string;
  read_aloud: boolean;
  dyslexia_font: boolean;
  high_contrast: boolean;
  reduced_motion: boolean;
  text_scale: number;
  timer_mode: "standard" | "extended" | "off";
};

/**
 * What a family is owed, independent of which channel paid for it.
 * Written only by the server — there is no client-writable RLS policy.
 */
export type EntitlementRow = {
  family_id: string;
  tier: "free" | "full";
  channel: "web_stripe" | "apple" | "google" | "trial" | "comp";
  status: "active" | "grace" | "expired";
  expires_at: string | null;
  external_ref: string | null;
  updated_at: string;
};

export type CrewRosterRow = {
  id: string;
  display_name: string;
  name_trade: string | null;
  name_adjective: string | null;
  name_surname: string | null;
  look_model: number;
  look_skin: string;
  look_hair: string;
  rank_rung: number;
};

export type Database = {
  public: {
    Tables: {
      families: Table<FamilyRow>;
      family_members: Table<FamilyMemberRow>;
      students: Table<StudentRow>;
      student_tables: Table<StudentTableRow>;
      fact_mastery: Table<FactMasteryRow>;
      runs: Table<RunRow>;
      answers: Table<AnswerRow, Omit<AnswerRow, "id">>;
      student_cosmetics: Table<CosmeticRow>;
      student_rare_items: Table<RareItemRow>;
      crew_links: Table<CrewLinkRow>;
      invites: Table<InviteRow>;
      stickers: Table<StickerRow>;
      challenges: Table<ChallengeRow>;
      classrooms: Table<ClassroomRow>;
      classroom_students: Table<ClassroomStudentRow>;
      assignments: Table<AssignmentRow>;
      student_settings: Table<StudentSettingsRow>;
      entitlements: Table<EntitlementRow>;
    };
    Views: {
      crew_roster: { Row: CrewRosterRow; Relationships: [] };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
