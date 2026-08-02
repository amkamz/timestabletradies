/**
 * Character selection — spec §7.
 *
 * Players scroll a gallery of character models and pick one visually.
 * There is deliberately no male/female toggle, label, or category, and
 * nothing here records or implies gender. Models are numbered, not named
 * by type, so nothing in the data model can leak a gendered reading.
 */

export const CHARACTER_MODEL_COUNT = 20;

export const SKIN_TONES = [
  { key: "s1", hex: "#f2cfa8" },
  { key: "s2", hex: "#e8b98c" },
  { key: "s3", hex: "#dba071" },
  { key: "s4", hex: "#c08552" },
  { key: "s5", hex: "#a9713f" },
  { key: "s6", hex: "#8a5a30" },
  { key: "s7", hex: "#7a4a24" },
  { key: "s8", hex: "#4d2f18" },
] as const;

export const HAIR_COLOURS = [
  { key: "h1", hex: "#2b2622" },
  { key: "h2", hex: "#4a3427" },
  { key: "h3", hex: "#7a4a24" },
  { key: "h4", hex: "#c98a3a" },
  { key: "h5", hex: "#e0c078" },
  { key: "h6", hex: "#b23b2f" },
  { key: "h7", hex: "#9aa0a6" },
  { key: "h8", hex: "#e8e4dc" },
] as const;

export type CharacterLook = {
  /** 1-based index into the model gallery. */
  model: number;
  skin: string;
  hair: string;
};

export const DEFAULT_LOOK: CharacterLook = { model: 1, skin: "s3", hair: "h1" };

export function isValidLook(look: CharacterLook): boolean {
  return (
    Number.isInteger(look.model) &&
    look.model >= 1 &&
    look.model <= CHARACTER_MODEL_COUNT &&
    SKIN_TONES.some((s) => s.key === look.skin) &&
    HAIR_COLOURS.some((h) => h.key === look.hair)
  );
}

export function skinHex(key: string): string {
  return SKIN_TONES.find((s) => s.key === key)?.hex ?? SKIN_TONES[0].hex;
}

export function hairHex(key: string): string {
  return HAIR_COLOURS.find((h) => h.key === key)?.hex ?? HAIR_COLOURS[0].hex;
}
