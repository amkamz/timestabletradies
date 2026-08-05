class_name CityGrid
extends RefCounted

## The city's state, with no rendering in it at all.
##
## Kept free of nodes on purpose: the grid is the thing the shell saves, the
## thing the server will eventually validate, and the thing every test below
## exercises. A model that needs a SceneTree to answer "can this go here" is a
## model that can only be tested by looking at it.
##
## Coordinates are grid cells, not metres. `Vector2i(x, z)` — x across, z into
## the screen — because the ground plane in Godot is XZ and up is +Y. Rotation
## is about Y, in four 90° steps. See docs/native/godot-asset-contract.md §0.

## Cells along one edge at the start. The city is always square.
const BASE_SIZE := 5

## 12 × 12 mirrors the mastery grid's 144 facts. Whether the city should grow
## this far is still an open question in docs/native/vision.md.
const MAX_SIZE := 12

## Metres per cell. Set from the asset pack once real tiles are on disk — the
## contract measures the pack rather than imposing a number on it.
const CELL_SIZE := 1.0

enum Rotation { DEG_0, DEG_90, DEG_180, DEG_270 }

var size: int = BASE_SIZE

## anchor cell -> { key: String, rot: int, footprint: Vector2i }
var _placements: Dictionary = {}

## every occupied cell -> the anchor cell that owns it
var _occupancy: Dictionary = {}


func _init(initial_size: int = BASE_SIZE) -> void:
	size = clampi(initial_size, BASE_SIZE, MAX_SIZE)


## ---------------------------------------------------------------- geometry


## A footprint turned 90° or 270° swaps its width and depth.
static func rotated_footprint(footprint: Vector2i, rot: int) -> Vector2i:
	if rot == Rotation.DEG_90 or rot == Rotation.DEG_270:
		return Vector2i(footprint.y, footprint.x)
	return footprint


## Every cell a piece would occupy, anchored at its minimum corner.
static func cells_for(anchor: Vector2i, footprint: Vector2i, rot: int) -> Array:
	var fp := rotated_footprint(footprint, rot)
	var out: Array = []
	for dx in range(fp.x):
		for dz in range(fp.y):
			out.append(anchor + Vector2i(dx, dz))
	return out


func in_bounds(cell: Vector2i) -> bool:
	return cell.x >= 0 and cell.y >= 0 and cell.x < size and cell.y < size


## ------------------------------------------------------------------ query


func is_empty(cell: Vector2i) -> bool:
	return not _occupancy.has(cell)


## The anchor owning this cell, or null if nothing is here.
func anchor_at(cell: Vector2i):
	return _occupancy.get(cell)


func placement_at(cell: Vector2i):
	var anchor = _occupancy.get(cell)
	if anchor == null:
		return null
	return _placements[anchor]


func placement_count() -> int:
	return _placements.size()


## `ignore_anchor` lets a piece be tested against its own current cells, which
## is what makes nudging a building one square over legal rather than blocked
## by itself.
func can_place(anchor: Vector2i, footprint: Vector2i, rot: int, ignore_anchor = null) -> bool:
	for cell in cells_for(anchor, footprint, rot):
		if not in_bounds(cell):
			return false
		var owner = _occupancy.get(cell)
		if owner != null and owner != ignore_anchor:
			return false
	return true


## ------------------------------------------------------------------ mutate


func place(key: String, anchor: Vector2i, footprint: Vector2i, rot: int) -> bool:
	if not can_place(anchor, footprint, rot):
		return false
	_placements[anchor] = { "key": key, "rot": rot, "footprint": footprint }
	for cell in cells_for(anchor, footprint, rot):
		_occupancy[cell] = anchor
	return true


## Removes whatever owns `cell`, wherever that piece was anchored. Tapping any
## square of a 2 × 2 depot removes the depot, which is what a child expects.
func remove_at(cell: Vector2i) -> bool:
	var anchor = _occupancy.get(cell)
	if anchor == null:
		return false
	var placement: Dictionary = _placements[anchor]
	for occupied in cells_for(anchor, placement["footprint"], placement["rot"]):
		_occupancy.erase(occupied)
	_placements.erase(anchor)
	return true


## Move and re-rotate in one step, so a failed move leaves the piece where it
## was rather than deleting it and discovering the destination was illegal.
func move(from_cell: Vector2i, to_anchor: Vector2i, rot: int = -1) -> bool:
	var anchor = _occupancy.get(from_cell)
	if anchor == null:
		return false
	var placement: Dictionary = _placements[anchor]
	var new_rot: int = placement["rot"] if rot < 0 else rot
	if not can_place(to_anchor, placement["footprint"], new_rot, anchor):
		return false
	var key: String = placement["key"]
	var footprint: Vector2i = placement["footprint"]
	remove_at(from_cell)
	return place(key, to_anchor, footprint, new_rot)


func clear() -> void:
	_placements.clear()
	_occupancy.clear()


## ------------------------------------------------------------------ growth


## How big the city is allowed to be.
##
## An n × n city opens when ×n is unlocked **and** n × n has been answered
## correctly at least n times. The fact gates the grid that shares its number,
## which is the whole charm of the rule.
##
## Takes the highest qualifying n rather than requiring a contiguous run: a
## child who has earned 7 × 7 should not be held at 5 × 5 because they skipped
## 6 × 6. `square_correct` is keyed by n, holding the `correct` counter for the
## fact n × n — a single-row lookup in `fact_mastery`, and the one fact immune
## to the 7×10 / 10×7 canonicalisation bug, being its own commutation.
static func size_for(unlocked_tables: Array, square_correct: Dictionary) -> int:
	var best := BASE_SIZE
	for n in range(BASE_SIZE + 1, MAX_SIZE + 1):
		if unlocked_tables.has(n) and int(square_correct.get(n, 0)) >= n:
			best = n
	return best


## Growth is one-way. Mastery counters only rise and unlocks never reverse, so
## a shrinking city could only ever come from a bad read — and taking a child's
## town away is not a failure mode worth leaving reachable.
func grow_to(new_size: int) -> bool:
	var target := clampi(new_size, BASE_SIZE, MAX_SIZE)
	if target <= size:
		return false
	size = target
	return true


## ----------------------------------------------------------- serialisation


## JSON-safe: the bridge to the native shell carries plain types only, so
## Vector2i goes across as [x, z].
func to_dict() -> Dictionary:
	var pieces: Array = []
	for anchor in _placements:
		var p: Dictionary = _placements[anchor]
		pieces.append({
			"key": p["key"],
			"rot": p["rot"],
			"anchor": [anchor.x, anchor.y],
			"footprint": [p["footprint"].x, p["footprint"].y],
		})
	pieces.sort_custom(func(a, b): return str(a["anchor"]) < str(b["anchor"]))
	return { "size": size, "pieces": pieces }


## Rejects a piece it cannot legally place rather than half-loading a city.
## Returns the number of pieces dropped, so a caller can log a corrupt save
## instead of silently showing a town with holes in it.
func from_dict(data: Dictionary) -> int:
	clear()
	size = clampi(int(data.get("size", BASE_SIZE)), BASE_SIZE, MAX_SIZE)
	var dropped := 0
	for raw in data.get("pieces", []):
		var anchor := Vector2i(int(raw["anchor"][0]), int(raw["anchor"][1]))
		var footprint := Vector2i(int(raw["footprint"][0]), int(raw["footprint"][1]))
		if not place(str(raw["key"]), anchor, footprint, int(raw["rot"])):
			dropped += 1
	return dropped
