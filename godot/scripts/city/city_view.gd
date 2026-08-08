class_name CityView
extends Node3D

## Draws a [CityGrid]. Holds no rules of its own.
##
## The grid decides what may go where and the manifest decides what a key looks
## like; this turns the two into nodes. Keeping it that way is what let the whole
## placement model be tested headlessly before any of this existed — a renderer
## that also owned the rules would only be testable by looking at it.
##
## Rebuilds wholesale on [method render]. A 6 × 6 city is 36 tiles and a handful
## of buildings, so the cost of being obviously correct is far cheaper here than
## the cost of an incremental update that drifts out of step with the model.

const CityGridScript = preload("res://scripts/city/city_grid.gd")
const CityManifestScript = preload("res://scripts/city/city_manifest.gd")

var grid = CityGridScript.new()
var manifest = CityManifestScript.new()

var _pieces_root: Node3D
var _ground_root: Node3D
var _mesh_cache: Dictionary = {}


func _ready() -> void:
	_ground_root = Node3D.new()
	_ground_root.name = "Ground"
	add_child(_ground_root)

	_pieces_root = Node3D.new()
	_pieces_root.name = "Pieces"
	add_child(_pieces_root)

	if not manifest.load_from():
		push_error("CityView: %s" % manifest.error())


## Cell coordinates to world space.
##
## The grid's origin is its minimum corner, so cell (0,0) sits at the near-left
## and the city grows away from the camera. Pieces are centred in their cell
## because that is where the pack puts their origins — see the contract.
func world_position(cell: Vector2i, footprint: Vector2i = Vector2i.ONE) -> Vector3:
	var size: float = manifest.cell_size
	return Vector3(
		(cell.x + footprint.x * 0.5) * size,
		0.0,
		(cell.y + footprint.y * 0.5) * size,
	)


func _load_mesh(key: String) -> PackedScene:
	if _mesh_cache.has(key):
		return _mesh_cache[key]

	var path: String = manifest.mesh_path(key)
	if path.is_empty() or not ResourceLoader.exists(path):
		# A missing file is a missing item: log it and skip. Never crash, and
		# never quietly render a different piece in its place.
		push_warning("CityView: no mesh for '%s' (%s)" % [key, path])
		_mesh_cache[key] = null
		return null

	var scene: PackedScene = load(path)
	_mesh_cache[key] = scene
	return scene


## Categories that arrive with their own slab underneath them.
##
## Roads and buildings in this pack are modelled on a base — that is exactly
## what the `_withoutBase` variants exist to opt out of. Props are not: a bush
## is a bush, and it needs something to stand on.
const SELF_BASING := ["road", "building", "ground"]


## Lay a ground tile under every cell that isn't already standing on one.
##
## Both halves of this were learned by looking at a render rather than by
## reasoning about it, which is the argument for the capture loop existing:
##
## - Laying a base under *everything* put two coplanar surfaces at Y = 0, and
##   the depth buffer picked between them per pixel. The road markings vanished
##   under a grey shimmer that read as "the roads didn't load".
## - Laying one only under *empty* cells then punched a hole in the town wherever
##   a prop stood, because a bush brings no floor with it — sky, in the middle
##   of a city block.
func _render_ground() -> void:
	for child in _ground_root.get_children():
		child.queue_free()

	var scene := _load_mesh("base")
	if scene == null:
		return

	for x in range(grid.size):
		for z in range(grid.size):
			var cell := Vector2i(x, z)
			var placement = grid.placement_at(cell)
			if placement != null:
				var category: String = manifest.category_of(str(placement["key"]))
				if SELF_BASING.has(category):
					continue

			var tile: Node3D = scene.instantiate()
			tile.position = world_position(cell)
			_ground_root.add_child(tile)


func render() -> void:
	_render_ground()

	for child in _pieces_root.get_children():
		child.queue_free()

	for entry in grid.to_dict()["pieces"]:
		var key := str(entry["key"])
		var scene := _load_mesh(key)
		if scene == null:
			continue

		var anchor := Vector2i(int(entry["anchor"][0]), int(entry["anchor"][1]))
		var footprint := Vector2i(int(entry["footprint"][0]), int(entry["footprint"][1]))
		var steps := int(entry["rot"])

		var node: Node3D = scene.instantiate()
		node.position = world_position(anchor, CityGridScript.rotated_footprint(footprint, steps))
		# Rotation is about Y, in four 90° steps. The ground plane is XZ and the
		# axis pointing up out of it is Y — see the note in `iso_camera.gd`.
		node.rotation.y = deg_to_rad(-90.0 * steps)
		node.name = "%s_%d_%d" % [key, anchor.x, anchor.y]
		_pieces_root.add_child(node)


## Which cell a point on the ground plane falls in.
##
## Floor, not round: cell (0,0) spans 0 to one cell width, so a point at 1.9 in
## a 2-unit grid is still in the first square. Rounding would put the boundaries
## half a cell out and make every tap near an edge land on the wrong tile.
func cell_at(world: Vector3) -> Vector2i:
	var size: float = manifest.cell_size
	return Vector2i(int(floor(world.x / size)), int(floor(world.z / size)))


## Centre of the whole city, for the camera to frame.
func centre() -> Vector3:
	var extent: float = float(grid.size) * manifest.cell_size
	return Vector3(extent * 0.5, 0.0, extent * 0.5)
