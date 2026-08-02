// GENERATED FILE — DO NOT EDIT.
// Source: src/lib/game/names.ts
// Regenerate with: npm run edge:sync
/**
 * Tradie name generator — spec §7.
 *
 * Three pools (trade, adjective, surname). Every entry is pre-vetted and
 * workman-themed, so no combination can land inappropriately. There is no
 * free-text entry anywhere in name creation, and nothing in these pools is
 * gendered — the app never labels, asks about, or implies gender.
 *
 * At account creation the app serves just 10 options from each pool, keeping
 * the choice small for a kid while the underlying pools stay large and varied.
 */

export const TRADE_POOL: readonly string[] = [
  "Sparky", "Chippie", "Plumber", "Brickie", "Roofer", "Tiler", "Painter", "Plasterer",
  "Concreter", "Landscaper", "Cabinetmaker", "Glazier", "Welder", "Fitter", "Rigger",
  "Scaffolder", "Surveyor", "Carpenter", "Joiner", "Mason", "Paver", "Fencer", "Decker",
  "Roadie", "Crane Op", "Digger", "Dozer", "Grader", "Loader", "Hauler", "Sparkie",
  "Drainer", "Gasfitter", "Locksmith", "Roofer Pro", "Sheeter", "Framer", "Formworker",
  "Steelie", "Boilermaker", "Machinist", "Toolmaker", "Millwright", "Shipwright",
  "Wheelwright", "Blacksmith", "Farrier", "Cooper", "Thatcher", "Slater", "Shingler",
  "Guttering", "Cladder", "Insulator", "Caulker", "Sealer", "Renderer", "Screeder",
  "Terrazzo", "Stonemason", "Sculptor", "Carver", "Turner", "Lathe Hand", "Bender",
  "Cutter", "Grinder", "Polisher", "Sander", "Finisher", "Detailer", "Estimator",
  "Foreman", "Leading Hand", "Supervisor", "Site Boss", "Safety Officer", "Signaller",
  "Spotter", "Dogger", "Slinger", "Hoist Op", "Forklift Op", "Bobcat Op", "Excavator Op",
  "Roller Op", "Paver Op", "Trencher", "Auger Hand", "Piling Hand", "Shotcreter",
  "Waterproofer", "Tank Hand", "Pipe Layer", "Cable Hand", "Line Worker", "Meter Reader",
  "Switchie", "Control Hand", "Panel Builder", "Wirer", "Tester", "Commissioner",
  "Refrigeration", "HVAC Hand", "Ducter", "Vent Hand", "Sprinkler Fitter", "Alarm Fitter",
  "Solar Fitter", "Battery Hand", "EV Fitter", "Windsmith", "Turbine Hand", "Rope Access",
  "Abseiler", "Demolisher", "Salvager", "Recycler", "Sorter", "Yard Hand", "Store Hand",
  "Toolie", "Apprentice", "Trainee", "Journeyman", "Tradie", "Handyperson", "Fixer",
  "Builder", "Constructor", "Erector", "Installer", "Maintainer", "Servicer", "Repairer",
  "Restorer", "Renovator", "Extender", "Fit-out Hand", "Shopfitter", "Signwriter",
  "Wallpaperer", "Curtain Fitter", "Blind Fitter", "Floorer", "Carpet Layer", "Vinyl Layer",
  "Decker Pro", "Balustrader", "Gate Hand", "Shed Builder", "Pool Builder", "Spa Fitter",
  "Irrigator", "Turf Layer", "Arborist", "Pruner", "Mulcher", "Nursery Hand", "Greenkeeper",
];

export const ADJECTIVE_POOL: readonly string[] = [
  "Speedy", "Deliberate", "Trusty", "Sharp", "Steady", "Handy", "Solid", "Nimble",
  "Tidy", "Rapid", "Careful", "Bold", "Bright", "Clever", "Keen", "Brisk", "Calm",
  "Crafty", "Dependable", "Eager", "Exact", "Fearless", "Focused", "Grounded", "Gutsy",
  "Helpful", "Honest", "Hopeful", "Jolly", "Kindly", "Level", "Lively", "Loyal", "Lucky",
  "Mighty", "Neat", "Nifty", "Patient", "Peppy", "Plucky", "Polished", "Practical",
  "Precise", "Prompt", "Proper", "Quick", "Quiet", "Ready", "Reliable", "Rugged",
  "Savvy", "Scrappy", "Sensible", "Sincere", "Skilful", "Smooth", "Snappy", "Sound",
  "Spirited", "Sprightly", "Square", "Stalwart", "Stout", "Straight", "Strong", "Sturdy",
  "Sunny", "Sure", "Swift", "Thorough", "Thoughtful", "Tireless", "Top-Notch", "Tough",
  "True", "Unflappable", "Upbeat", "Useful", "Valiant", "Watchful", "Willing", "Wise",
  "Zippy", "Ace", "Bonzer", "Brainy", "Breezy", "Chipper", "Chirpy", "Cool", "Crisp",
  "Dandy", "Dashing", "Dead-Set", "Deft", "Diligent", "Dinkum", "Earnest", "Easygoing",
  "Efficient", "Fair", "Fine", "Firm", "Flash", "Fleet", "Fresh", "Genuine", "Gentle",
  "Glad", "Golden", "Good-Natured", "Graceful", "Great", "Hardy", "Hearty", "Humble",
  "Ingenious", "Inventive", "Jaunty", "Judicious", "Just", "Merry", "Methodical",
  "Meticulous", "Modest", "Natural", "Noble", "Nonstop", "Observant", "Optimistic",
  "Orderly", "Organised", "Original", "Peaceful", "Perky", "Persistent", "Pioneering",
  "Playful", "Positive", "Powerful", "Punctual", "Purposeful", "Rock-Solid", "Sensational",
  "Shipshape", "Sparkling", "Spotless", "Springy", "Stellar", "Streamlined", "Stylish",
  "Supportive", "Systematic", "Talented", "Tenacious", "Terrific", "Tiptop", "Trim",
  "Unbeatable", "Unstoppable", "Upstanding", "Versatile", "Vigilant", "Warm", "Whiz",
  "Winning", "Wonderful", "Zealous", "Zesty",
];

export const SURNAME_POOL: readonly string[] = [
  "McGee", "Radler", "Boltz", "Nails", "Hammersmith", "Ironside", "Steelworth",
  "Woodward", "Stoneham", "Bricklow", "Trowell", "Chisel", "Rafter", "Girder",
  "Joist", "Lintel", "Mortar", "Gasket", "Ratchet", "Spanner", "Wrenchley",
  "Sawyer", "Planer", "Router", "Driller", "Rivet", "Solder", "Weldon", "Forge",
  "Anvil", "Bellows", "Kilnson", "Quarry", "Granite", "Marbleton", "Slateford",
  "Copperfield", "Silverpin", "Goldenrod", "Brassbolt", "Tinsley", "Zincroft",
  "Alloy", "Ledger", "Plumbline", "Level", "Squareton", "Callipers", "Vernier",
  "Micrometer", "Gauge", "Tapeline", "Chalkline", "Stringer", "Bracket", "Flashing",
  "Gutterly", "Downpipe", "Fascia", "Eaveson", "Cornice", "Skirting", "Architrave",
  "Batten", "Purlin", "Truss", "Beamer", "Column", "Pilaster", "Footing", "Slabwell",
  "Piering", "Shoring", "Formwork", "Screed", "Render", "Bagging", "Grouting",
  "Sealant", "Silicone", "Primer", "Undercoat", "Topcoat", "Varnish", "Lacquer",
  "Stainly", "Sander", "Buffer", "Polish", "Burnish", "Lustre", "Sheen", "Gloss",
  "Matte", "Satin", "Texture", "Pattern", "Motif", "Inlay", "Veneer", "Laminate",
  "Dovetail", "Mortise", "Tenon", "Biscuit", "Dowell", "Screwton", "Boltwright",
  "Nailer", "Tacker", "Stapler", "Clamper", "Vicewell", "Benchley", "Trestle",
  "Ladderman", "Scaffold", "Platform", "Hoister", "Winch", "Pulley", "Cable",
  "Chainly", "Sling", "Shackle", "Hooke", "Loadstar", "Crane", "Jibb", "Boomer",
  "Bucket", "Blade", "Auger", "Trencher", "Roller", "Compactor", "Grader",
  "Tipper", "Hauler", "Barrow", "Trolley", "Pallet", "Crateman", "Toolbox",
  "Toolbelt", "Hardhat", "Hivis", "Steelcap", "Glover", "Goggles", "Earmuff",
  "Lanyard", "Harness", "Bollard", "Witches-Hat", "Signpost", "Beacon", "Floodlight",
];

/**
 * Deterministically serve 10 options from each pool for one student.
 * Seeded by profile id so a kid sees the same shortlist if they come back
 * mid-setup, but different kids get different shortlists.
 */
export function serveNameOptions(seed: string): {
  trades: string[];
  adjectives: string[];
  surnames: string[];
} {
  return {
    trades: sample(TRADE_POOL, 10, `${seed}:trade`),
    adjectives: sample(ADJECTIVE_POOL, 10, `${seed}:adj`),
    surnames: sample(SURNAME_POOL, 10, `${seed}:sur`),
  };
}

function sample(pool: readonly string[], n: number, seed: string): string[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rng = () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const items = [...pool];
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items.slice(0, n);
}

export function formatTradieName(parts: {
  trade: string;
  adjective: string;
  surname: string;
}): string {
  return `${parts.trade} ${parts.adjective} ${parts.surname}`;
}

/** Guard: only values drawn from the vetted pools are ever accepted. */
export function isValidNameSelection(parts: {
  trade: string;
  adjective: string;
  surname: string;
}): boolean {
  return (
    TRADE_POOL.includes(parts.trade) &&
    ADJECTIVE_POOL.includes(parts.adjective) &&
    SURNAME_POOL.includes(parts.surname)
  );
}
