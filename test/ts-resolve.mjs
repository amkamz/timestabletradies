/**
 * Module resolver hook for `node --test`.
 *
 * Node strips TypeScript types natively, so unit tests need no framework and
 * no build step — but its ESM resolver wants explicit file extensions, and the
 * app is written in Next.js style: `./questions`, `@/lib/game/mastery`.
 *
 * This hook closes that gap and nothing else. It resolves what Node would
 * resolve, and only on failure retries with a TypeScript extension.
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "src");

const CANDIDATE_SUFFIXES = [".ts", ".tsx", "/index.ts", "/index.tsx"];

export async function resolve(specifier, context, nextResolve) {
  // `@/…` is the tsconfig path alias for `src/…`.
  const spec = specifier.startsWith("@/")
    ? pathToFileURL(path.join(SRC, specifier.slice(2))).href
    : specifier;

  try {
    return await nextResolve(spec, context);
  } catch (error) {
    const recoverable =
      error?.code === "ERR_MODULE_NOT_FOUND" || error?.code === "ERR_UNSUPPORTED_DIR_IMPORT";
    if (!recoverable) throw error;

    for (const suffix of CANDIDATE_SUFFIXES) {
      try {
        return await nextResolve(spec + suffix, context);
      } catch {
        // Try the next candidate; rethrow the original error if none work.
      }
    }
    throw error;
  }
}
