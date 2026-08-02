// GENERATED FILE — DO NOT EDIT.
// Source: src/lib/game/job-id.ts
// Regenerate with: npm run edge:sync
import { JOB_TYPES, type JobType } from "./questions.ts";

/**
 * Job board ids are `<type>-<table>-<seed>`. The seed itself contains
 * hyphens (it's a uuid plus a date), so only the first two segments are
 * split off and the remainder is rejoined.
 */
export type ParsedJobId = { type: JobType; table: number; seed: string };

export function parseJobId(id: string): ParsedJobId | null {
  const parts = id.split("-");
  if (parts.length < 3) return null;

  const [type, tableRaw, ...rest] = parts;
  if (!(type in JOB_TYPES)) return null;

  const table = Number(tableRaw);
  if (!Number.isInteger(table) || table < 1) return null;

  return { type: type as JobType, table, seed: rest.join("-") };
}
