# Godot asset contract

*4 August 2026.* The naming and structure conventions every 3D asset must obey
so that code can consume it without anyone looking at it.

**This document exists because I cannot see.** I can write every line of
GDScript, every `.tscn`, the bridge and the shaders — but I cannot open the
editor, inspect your rig, or notice that a building is sitting slightly below the
ground plane. If assets follow the conventions below, none of that matters: the
code addresses things by name and the names are guaranteed. Where an asset
departs from this document, the code that consumes it becomes a guess, and every
guess costs a round trip.

Departures are fine — this is a starting position, not a law. **Change the
document, then change the asset**, so the two never disagree.

---

## Contents

- [0 · Global conventions](#0--global-conventions)
- [1 · The key rule — filenames are shop keys](#1--the-key-rule--filenames-are-shop-keys)
- [2 · City tiles](#2--city-tiles)
- [3 · Buildings](#3--buildings)
- [4 · The character rig](#4--the-character-rig)
- [5 · Outfits and cosmetics](#5--outfits-and-cosmetics)
- [6 · Vehicles](#6--vehicles)
- [7 · Materials and tinting](#7--materials-and-tinting)
- [8 · Animation](#8--animation)
- [9 · Budgets](#9--budgets)
- [10 · Folder layout](#10--folder-layout)
- [11 · The manifest](#11--the-manifest)
- [Checklist](#checklist)

---

# 0 · Global conventions

| Rule | Value |
|---|---|
| **Unit** | 1 Godot unit = **1 metre** |
| **Up axis** | **+Y** (Godot). Author Z-up in Blender; the glTF importer converts |
| **Forward** | **−Z** in Godot. In Blender author facing **−Y** so it lands correctly |
| **Handedness** | Right-handed |
| **Export format** | **glTF 2.0 binary (`.glb`)**, one file per asset |
| **Origin** | Centre of the footprint, **resting on Y = 0**. Nothing floats, nothing sinks |
| **Scale** | Applied. No non-uniform scale on the exported root, no unapplied modifiers |
| **File naming** | `snake_case`, lowercase, no spaces, no version suffixes |

**Grid cell size is measured from the asset pack, not imposed on it.** The
placeholder figure below is 4 m, but if KayKit or Kenney tiles are authored at
1 unit per tile then **the cell becomes 1 unit** and everything else scales with
it. Rescaling a bought pack to satisfy a document is the wrong way round —
`CELL_SIZE` is one constant in `city_grid.gd` and it gets set once the real
tiles are on disk.

**The ground plane is XZ and rotation is about Y.** Godot is Y-up, and every
Y-up asset pack — KayKit and Kenney included — assumes it. "The city lies flat
and spins about the axis pointing up out of it" is the intent, and on this
engine that axis is **Y**, not Z. Nothing about the feel changes; only the
letter does.

**Rotation is in 90° steps around Y only.** Every placeable piece must read
correctly at 0°, 90°, 180° and 270°. If a piece has a "front", that front faces
**−Z at 0° rotation**.

---

# 1 · The key rule — filenames are shop keys

**The single most valuable convention in this document.**

`shop.ts` already names every purchasable item — `hat-safety-yellow`,
`ute-flames`, `vest-foreman`. The mesh file for an item is **that key with
hyphens replaced by underscores**:

```
hat-safety-yellow   →   hat_safety_yellow.glb
ute-flames          →   ute_flames.glb
vest-foreman        →   vest_foreman.glb
```

There is then **no mapping table anywhere**, no registry to keep in step, and
adding a cosmetic is dropping a file in a folder. The same rule extends to city
pieces once their keys exist server-side.

A missing file is a missing item, and the loader logs it and skips it — never
crashes, never renders a wrong hat.

---

# 2 · City tiles

A tile occupies one 4 m cell. Its mesh origin is the **centre of the cell** at
**Y = 0**.

> **Third-party packs (KayKit, Kenney) will not carry the markers below.**
> They are still the ideal for anything authored in-house. For a bought pack the
> **manifest declares connections by filename** instead, and markers — where
> present — win. See [§11](#11--the-manifest).

## Road connections are declared by markers, not filenames

Each road tile carries `Marker3D` children at the midpoint of every edge it
connects to:

| Marker name | Position (local) |
|---|---|
| `conn_n` | `(0, 0, -2)` |
| `conn_e` | `(2, 0, 0)` |
| `conn_s` | `(0, 0, 2)` |
| `conn_w` | `(-2, 0, 0)` |

Only include markers for edges that **actually connect**. A straight
north–south road has `conn_n` and `conn_s` and nothing else; a T-junction has
three; a crossroads has four; a dead end has one.

This is why markers beat filenames: the code builds the road graph by reading
what is present, so a renamed or newly-invented tile shape works with no code
change at all. Rotation is handled by the engine — author each shape **once**,
at its canonical orientation.

## Lanes

Cars drive the centre line between connected markers. Keep the drivable surface
at least **2.5 m wide** and centred, or vehicles will visibly clip the kerb.

## Ground tiles

Non-road tiles (grass, dirt, paving) need no markers. They must tile seamlessly
edge to edge — no border detail that only works in isolation.

---

# 3 · Buildings

| Rule | Value |
|---|---|
| **Footprint** | 1 × 1 by default. 1 × 2 and 2 × 2 permitted; declare in the manifest |
| **Origin** | Centre of the footprint, on Y = 0 |
| **Max height** | **12 m** (3 cells). Taller occludes the city at normal zoom |
| **Front** | Faces **−Z** at 0° rotation |

## Doors

NPCs walk in and out. Each entrance carries a `Marker3D` named `door_0`,
`door_1`, … positioned **on the threshold, at ground level**, oriented so its
local **−Z points away from the building** — that is the direction an NPC faces
on the way out.

A building with no `door_*` marker is decorative and NPCs will ignore it. That
is a legitimate choice for a water tower; it is a bug for a shop.

## Upgrade levels

Buildings can be upgraded. Author each level as its own file with a numeric
suffix, sharing the footprint:

```
build_workshop_1.glb
build_workshop_2.glb
build_workshop_3.glb
```

The footprint **must not change between levels** — a piece that outgrows its
cell on upgrade would need to displace a neighbour, and no seven-year-old should
have their town rearranged for them.

---

# 4 · The character rig

**One skeleton. Twenty body meshes. Every animation shared.**

That is the whole reason the character can be built in code: 20 models × 8 skins
× 8 hair colours × cosmetics is not 1,280 assets, it is one rig with parameters.

## Bones

Conform to Godot 4's **`SkeletonProfileHumanoid`** bone names — `Hips`, `Spine`,
`Chest`, `UpperChest`, `Neck`, `Head`, `LeftShoulder`, `LeftUpperArm`,
`LeftLowerArm`, `LeftHand`, `RightUpperLeg`, and so on.

If the source rig is **Mixamo** or anything else, supply a Godot **`BoneMap`**
resource with the import so retargeting is deterministic. Do not hand-rename
bones in the DCC — the BoneMap is the supported path and it survives a
re-export.

| Rule | Value |
|---|---|
| **Height** | ~**1.6 m** at the top of the head, standing in the rest pose |
| **Rest pose** | **A-pose** or T-pose, consistent across all 20 bodies |
| **Root motion** | **None.** All clips animate in place; code drives position |
| **Skeleton name** | `Skeleton3D`, as a direct child of the scene root |

## Sockets

Rigid attachments hang off `BoneAttachment3D` nodes, authored **once in the base
character scene**, not in each cosmetic:

| Socket node | Bone | Carries |
|---|---|---|
| `socket_head` | `Head` | Hard hats |
| `socket_face` | `Head` | Sunnies, safety glasses |
| `socket_hand_r` | `RightHand` | Held tools |
| `socket_hand_l` | `LeftHand` | Held tools |
| `socket_hips` | `Hips` | Belt-hung props |

A rigid cosmetic is authored **at the origin, facing −Z**, and the socket
positions it. Do not bake an offset into the mesh — it will be wrong the moment
a different body wears it.

---

# 5 · Outfits and cosmetics

Two kinds, and confusing them is the most likely way this goes wrong.

## Rigid — parented to a socket

Hats, sunnies, held tools. A plain `MeshInstance3D`, no skeleton, no skinning.
Origin at the attachment point.

## Skinned — sharing the character skeleton

Vests, jackets, gloves, boots, belts that follow the body. These must be
**skinned to the same skeleton with the same bind poses** and are added as
sibling `MeshInstance3D` nodes under the character's `Skeleton3D`. Export each
garment **with the skeleton included** so the bind pose is unambiguous.

A skinned garment authored against a different skeleton will look correct in the
rest pose and tear apart the moment the character walks.

## By shop category

| Category | Kind | Where |
|---|---|---|
| `hats` | Rigid | `socket_head` |
| `vests` | Skinned | Under `Skeleton3D` |
| `belts` | Skinned | Under `Skeleton3D` |
| `accessories` | Either — sunnies rigid at `socket_face`, gloves and boots skinned | — |
| `utes` | Neither — a separate vehicle scene (§6) | — |

## Hiding what is underneath

A garment that would clip through the body declares which body regions to hide,
in the manifest, as a list of named submeshes: `torso`, `arms`, `legs`, `feet`,
`hands`. **The body mesh must therefore be split into those named submeshes** —
this is the one requirement that reaches back into how the 20 bodies are
modelled, so it is worth getting right before the twentieth is built.

---

# 6 · Vehicles

Covers both ambient traffic and the player's ute cosmetic.

| Rule | Value |
|---|---|
| **Origin** | Centre of the wheelbase, on Y = 0 |
| **Forward** | **−Z** |
| **Length** | ≤ 4 m, so a car fits within one cell |
| **Wheels** | Named children `wheel_fl`, `wheel_fr`, `wheel_rl`, `wheel_rr`, each with its origin at the hub and its rotation axis on local X |

Wheels are optional. If they are absent the car still drives; it just does not
spin anything.

---

# 7 · Materials and tinting

The art direction is **flat colour with hard ink outlines** — Toolbox Pop. No
PBR authoring is needed and none should be supplied: no metalness maps, no
roughness maps, no normal maps unless a piece genuinely needs one.

## Named material slots

Runtime tinting works by material slot name, so these are exact:

| Slot name | Tinted from |
|---|---|
| `MAT_skin` | The 8 `SKIN_TONES` in `character.ts` |
| `MAT_hair` | The 8 `HAIR_COLOURS` in `character.ts` |
| `MAT_base` | Not tinted — the model's own colours |

**Skin and hair colour must not be baked into any texture.** Author those
regions neutral — white or mid-grey — so a multiply tint lands correctly. A
baked-in skin tone cannot be recoloured and silently reduces 8 options to 1.

## Outlines

Outlines are a **shader**, applied in engine. Do not model them as geometry and
do not paint them into textures — a painted outline breaks at every zoom level,
and the whole point of the city is that it zooms.

## Textures

| Rule | Value |
|---|---|
| **Format** | `.png` source; Godot handles compression |
| **Size** | 1024², or 2048² for an atlas covering many pieces. **No 4K** |
| **Atlasing** | Strongly preferred — one atlas per category beats one texture per item, and draw calls are the budget that bites first on a tablet |

---

# 8 · Animation

Clips live on the shared skeleton and are named exactly:

| Clip | Used for |
|---|---|
| `idle` | Standing, the default |
| `walk` | NPCs and the player moving along roads |
| `run` | Optional; falls back to `walk` |
| `cheer` | Correct answers, boss defeated, level up |
| `think` | Question on screen, waiting |
| `hammer` | Working — the job and boss animations |
| `wave` | Greeting; used on the home screen |

Missing clips fall back to `idle` rather than erroring. **All clips are
in-place** — no root motion, per §4.

Loop flags matter: `idle`, `walk`, `run` and `think` loop; `cheer`, `hammer` and
`wave` play once. Set them on export.

---

# 9 · Budgets

Targeted at a low-end Android tablet, which is the device this will actually be
used on.

| Asset | Triangles |
|---|---|
| Character body | ≤ 6,000 |
| Cosmetic (rigid) | ≤ 1,000 |
| Cosmetic (skinned) | ≤ 2,000 |
| Ground / road tile | ≤ 500 |
| Building | ≤ 3,000 |
| Vehicle | ≤ 1,500 |

**Scene totals** at a full 6 × 6 city: 36 tiles, up to 36 buildings, ~12 NPCs,
~6 cars. Repeated tiles and cars render through `MultiMeshInstance3D`, so tile
count is cheap and unique building count is what costs.

The hard limit worth holding is **draw calls, not triangles**. That is what
atlasing in §7 buys.

---

# 10 · Folder layout

```
/godot
├── project.godot
├── export_presets.cfg
├── assets/
│   ├── characters/
│   │   ├── rig/                 base_character.tscn, the skeleton, the BoneMap
│   │   ├── bodies/              body_01.glb … body_20.glb
│   │   └── cosmetics/
│   │       ├── hats/            hat_safety_yellow.glb, …
│   │       ├── vests/
│   │       ├── belts/
│   │       └── accessories/
│   ├── city/
│   │   ├── tiles/               road_*.glb, ground_*.glb
│   │   └── buildings/           build_*_1.glb, build_*_2.glb, …
│   ├── vehicles/                ute_*.glb, car_*.glb
│   └── shaders/
├── scenes/
│   ├── city/                    the editor and the home-screen city
│   ├── boss/
│   └── games/
├── scripts/
├── bridge/                      the JSON-in / JSON-out seam
└── tests/
```

---

# 11 · The manifest

Everything the code needs that cannot be read off the mesh lives in
`assets/manifest.json` — footprints, door counts, hidden body regions, category.

```jsonc
{
  "city_pieces": {
    "build_workshop": {
      "footprint": [1, 1],
      "levels": 3,
      "category": "building"
    },
    "road_cross": {
      "footprint": [1, 1],
      "category": "road"
    }
  },
  "cosmetics": {
    "vest_foreman": {
      "kind": "skinned",
      "category": "vests",
      "hides": ["torso", "arms"]
    },
    "hat_safety_yellow": {
      "kind": "rigid",
      "socket": "socket_head",
      "category": "hats"
    }
  }
}
```

**No prices, ever.** The server owns the catalogue and what a thing costs; the
manifest owns only how to render it. That keeps the §0.6 rule intact — the
student app never mentions money — and means a price change is not an app
release.

## The adapter layer, for bought packs

KayKit and Kenney assets are modular, gridded and Y-up — which is why they are
a good fit — but they will not carry `conn_*` markers, `door_*` markers or
`MAT_skin` slots. Rather than editing a few hundred meshes to satisfy this
document, **the manifest adapts them**:

```jsonc
{
  "source": "kenney_city_kit",
  "cell_size": 1.0,
  "city_pieces": {
    "road_straight": {
      "mesh": "assets/city/tiles/road-straight.glb",
      "footprint": [1, 1],
      "category": "road",
      "connects": ["n", "s"]
    },
    "building_shop": {
      "mesh": "assets/city/buildings/building-shop.glb",
      "footprint": [1, 1],
      "category": "building",
      "doors": [{ "edge": "s" }]
    }
  },
  "material_roles": {
    "Skin_Mat": "MAT_skin",
    "Hair_Mat": "MAT_hair"
  }
}
```

**Precedence:** a marker found in the mesh wins over the manifest. So in-house
assets follow §2–§5 and need no entry, bought assets get an entry, and the code
reads one interface either way.

The manifest becomes the single place a new pack is taught to the game, which is
also what makes swapping packs later a data change rather than a rewrite.

---

# Checklist

Run a new asset against this before it lands.

**Everything**
- [ ] `.glb`, Y-up, −Z forward, 1 unit = 1 m
- [ ] Origin centred on footprint, resting on Y = 0
- [ ] Scale applied, modifiers applied, no non-uniform root scale
- [ ] `snake_case` filename; for a shop item, the `shop.ts` key with underscores
- [ ] Reads correctly at 0° / 90° / 180° / 270°

**City tiles**
- [ ] Fits a 4 m cell, tiles seamlessly
- [ ] `conn_n` / `conn_e` / `conn_s` / `conn_w` markers present for **connecting edges only**
- [ ] Drivable surface ≥ 2.5 m wide and centred

**Buildings**
- [ ] ≤ 12 m tall, front faces −Z
- [ ] `door_*` markers on thresholds, local −Z pointing outward
- [ ] Footprint identical across upgrade levels

**Characters**
- [ ] `SkeletonProfileHumanoid` bone names, or a `BoneMap` supplied
- [ ] ~1.6 m tall, consistent rest pose across all 20 bodies
- [ ] Body split into named submeshes: `torso`, `arms`, `legs`, `feet`, `hands`
- [ ] `MAT_skin` and `MAT_hair` are separate slots, authored **neutral**
- [ ] All clips in place, no root motion, loop flags set

**Cosmetics**
- [ ] Rigid pieces at the origin, facing −Z, no baked offset
- [ ] Skinned pieces exported **with the skeleton**, same bind pose
- [ ] `hides` list declared in the manifest if it would clip

**Textures**
- [ ] `.png`, ≤ 2048², atlased per category
- [ ] No baked outlines, no baked skin or hair colour
- [ ] No metalness / roughness / normal maps unless genuinely needed
