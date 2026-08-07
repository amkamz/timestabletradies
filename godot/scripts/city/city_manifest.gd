class_name CityManifest
extends RefCounted

## The adapter between a bought asset pack and the code.
##
## KayKit ships modular, gridded, Y-up glTF — which is why it fits — but it
## carries none of the `conn_*` or `door_*` markers the asset contract asks for,
## and it never will. Editing a few hundred bought meshes to satisfy a document
## is the wrong way round, so `assets/manifest.json` declares that information by
## filename instead and this reads it.
##
## The precedence rule from the contract holds: a marker found *in* a mesh wins.
## In-house assets follow §2–§5 and need no entry here; bought ones get an entry;
## the rest of the code sees one interface either way.

const MANIFEST_PATH := "res://assets/manifest.json"

const EDGES := ["n", "e", "s", "w"]

var cell_size: float = 2.0
var source: String = ""

## key -> { mesh, footprint: Vector2i, category, connects: Array, doors: Array }
var pieces: Dictionary = {}

## key -> { mesh }
var vehicles: Dictionary = {}

var _load_error: String = ""


func load_from(path: String = MANIFEST_PATH) -> bool:
	var text := FileAccess.get_file_as_string(path)
	if text.is_empty():
		_load_error = "manifest missing or empty at %s" % path
		return false

	var parsed = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		_load_error = "manifest is not a JSON object"
		return false

	source = str(parsed.get("source", ""))
	cell_size = float(parsed.get("cell_size", 2.0))

	pieces.clear()
	for key in parsed.get("city_pieces", {}):
		var raw: Dictionary = parsed["city_pieces"][key]
		var footprint: Array = raw.get("footprint", [1, 1])
		pieces[key] = {
			"mesh": str(raw.get("mesh", "")),
			"footprint": Vector2i(int(footprint[0]), int(footprint[1])),
			"category": str(raw.get("category", "prop")),
			"connects": raw.get("connects", []),
			"doors": raw.get("doors", []),
		}

	vehicles.clear()
	for key in parsed.get("vehicles", {}):
		vehicles[key] = { "mesh": str(parsed["vehicles"][key].get("mesh", "")) }

	return true


func error() -> String:
	return _load_error


func has(key: String) -> bool:
	return pieces.has(key)


func footprint_of(key: String) -> Vector2i:
	if not pieces.has(key):
		return Vector2i.ONE
	return pieces[key]["footprint"]


func category_of(key: String) -> String:
	return str(pieces.get(key, {}).get("category", "prop"))


func keys_in(category: String) -> Array:
	var out: Array = []
	for key in pieces:
		if pieces[key]["category"] == category:
			out.append(key)
	out.sort()
	return out


## Which edges a piece connects at, **after** rotation.
##
## Shapes are authored once at a canonical orientation and the engine turns
## them, so a straight road declared `["n","s"]` reports `["e","w"]` at 90°.
## Building the road graph from this rather than from filenames is what lets a
## tile shape be added later without touching any code.
func connections_of(key: String, rotation_steps: int) -> Array:
	var declared: Array = pieces.get(key, {}).get("connects", [])
	var out: Array = []
	for edge in declared:
		var index: int = EDGES.find(str(edge))
		if index >= 0:
			out.append(EDGES[(index + rotation_steps) % EDGES.size()])
	return out


## The resource path for a piece's mesh, or "" when the key is unknown.
func mesh_path(key: String) -> String:
	var mesh := str(pieces.get(key, {}).get("mesh", ""))
	if mesh.is_empty():
		return ""
	return "res://assets/" + mesh


func vehicle_mesh_path(key: String) -> String:
	var mesh := str(vehicles.get(key, {}).get("mesh", ""))
	if mesh.is_empty():
		return ""
	return "res://assets/" + mesh
