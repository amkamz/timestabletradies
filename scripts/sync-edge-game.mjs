/**
 * Copy `src/lib/game` into `supabase/functions/_shared/game` for Deno.
 *
 * The rules stay in TypeScript and run on the server (docs/native/README.md
 * §0.1) — this is how they get there. Deno needs explicit file extensions and
 * doesn't know the `@/` alias, so the imports are rewritten on the way across.
 *
 * The output is **generated**. Never edit it: change `src/lib/game` and re-run
 * this. `npm run edge:sync` does that, and `npm run edge:check` fails if the
 * two have drifted, so a deploy can't ship stale rules.
 *
 *   node scripts/sync-edge-game.mjs          # write
 *   node scripts/sync-edge-game.mjs --check  # verify only, exit 1 on drift
 */

import { readdir, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(root, "src", "lib", "game");
const TYPES = path.join(root, "src", "lib", "supabase", "types.ts");
const OUT = path.join(root, "supabase", "functions", "_shared", "game");

const HEADER = `// GENERATED FILE — DO NOT EDIT.
// Source: src/lib/game/%NAME%
// Regenerate with: npm run edge:sync
`;

/**
 * Rewrite an import specifier for Deno.
 *
 * `./zones` becomes `./zones.ts`; the `@/lib/supabase/types` alias becomes the
 * local copy. Anything already carrying an extension, and anything from npm or
 * jsr, is left alone.
 */
function rewrite(spec) {
  if (spec === "@/lib/supabase/types") return "./supabase-types.ts";
  if (spec.startsWith(".") && !spec.endsWith(".ts")) return `${spec}.ts`;
  return spec;
}

function transform(source, name) {
  // `server-only` is a Next.js build guard that throws if a module is pulled
  // into a client bundle. There is no client bundle here — the whole file is
  // running on a server by definition — and the package doesn't exist in Deno,
  // so it's dropped rather than shimmed.
  const stripped = source.replace(/^\s*import\s+["']server-only["'];?\s*$\n?/gm, "");

  const body = stripped.replace(
    /(\bfrom\s*|\bimport\s*)(["'])([^"']+)\2/g,
    (match, lead, quote, spec) => `${lead}${quote}${rewrite(spec)}${quote}`,
  );
  return HEADER.replace("%NAME%", name) + body;
}

const files = (await readdir(SRC)).filter(
  (f) => f.endsWith(".ts") && !f.endsWith(".test.ts"),
);

const generated = new Map();
for (const file of files) {
  generated.set(file, transform(await readFile(path.join(SRC, file), "utf8"), file));
}
generated.set(
  "supabase-types.ts",
  transform(await readFile(TYPES, "utf8"), "../supabase/types.ts"),
);

const check = process.argv.includes("--check");

if (check) {
  let drifted = false;
  for (const [name, content] of generated) {
    const target = path.join(OUT, name);
    if (!existsSync(target) || (await readFile(target, "utf8")) !== content) {
      console.error(`drift: ${name}`);
      drifted = true;
    }
  }
  if (drifted) {
    console.error("\nEdge copy is stale. Run: npm run edge:sync");
    process.exit(1);
  }
  console.log(`edge game copy is in sync (${generated.size} files)`);
} else {
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });
  for (const [name, content] of generated) {
    await writeFile(path.join(OUT, name), content, "utf8");
  }
  console.log(`synced ${generated.size} files to supabase/functions/_shared/game`);
}
