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


## A sibling mesh of a manifest piece — `building_A` plus `_withoutBase`.
##
## Quiet when absent, unlike [method _load_mesh]. These are an optimisation the
## pack happens to offer, not a promise it makes: a piece with no baseless
## variant simply stands on the tile with its own slab, and warning about every
## one of them would bury the warnings that matter.
func _load_variant(key: String, suffix: String) -> PackedScene:
	var cache_key := key + suffix
	if _mesh_cache.has(cache_key):
		return _mesh_cache[cache_key]

	var base_path: String = manifest.mesh_path(key)
	var path := base_path.replace(".gltf", suffix + ".gltf")
	var scene: PackedScene = null
	if path != base_path and ResourceLoader.exists(path):
		scene = load(path)

	_mesh_cache[cache_key] = scene
	return scene


## Categories that *are* the floor of their cell.
##
## Everything else stands on one. Buildings used to be in this list, because the
## pack models them on their own slab — but that slab is exactly 0.1 thick and
## cannot be made thicker without stretching the building on top of it, so they
## now use the pack's `_withoutBase` variants and stand on a real tile like
## everything else.
const SELF_BASING := ["road", "ground"]

## How thick the pack authors its base slabs.
const PACK_BASE_THICKNESS := 0.1

## How thick we want them.
##
## Flat tiles made the city look like paper laid on a table. A fifth of a cell
## of height turns each square into a block, which reads as a thing built rather
## than a thing printed — and it costs nothing, because the slab is already
## geometry and only its scale changes.
const TILE_HEIGHT := 0.4

## What sits on top of a tile starts here.
const TILE_TOP := TILE_HEIGHT

## `_withoutBase` meshes are authored expecting a 0.1 slab beneath them, so they
## are lifted by the difference rather than by the whole height.
const BASELESS_LIFT := TILE_HEIGHT - PACK_BASE_THICKNESS


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

			_ground_root.add_child(_base_tile(scene, cell))


## A base slab, stretched to the height the city is built at.
##
## Scaling rather than a different mesh: the slab is a flat-topped box, so its
## top surface stays exactly where it was and only the side the eye sees gets
## taller.
func _base_tile(scene: PackedScene, cell: Vector2i) -> Node3D:
	var tile: Node3D = scene.instantiate()
	tile.position = world_position(cell)
	tile.scale = Vector3(1.0, TILE_HEIGHT / PACK_BASE_THICKNESS, 1.0)
	return tile


func render() -> void:
	_render_ground()

	for child in _pieces_root.get_children():
		child.queue_free()

	for entry in grid.to_dict()["pieces"]:
		var key := str(entry["key"])
		var anchor := Vector2i(int(entry["anchor"][0]), int(entry["anchor"][1]))
		var footprint := Vector2i(int(entry["footprint"][0]), int(entry["footprint"][1]))
		var steps := int(entry["rot"])
		var is_floor := SELF_BASING.has(manifest.category_of(key))

		var scene: PackedScene = null
		var lift := 0.0

		if is_floor:
			# Roads *are* the floor, so they are stretched like the ground.
			scene = _load_mesh(key)
		else:
			# Anything standing on a tile prefers the pack's baseless variant,
			# so the cell has one slab under it rather than two stacked.
			scene = _load_variant(key, "_withoutBase")
			lift = BASELESS_LIFT
			if scene == null:
				scene = _load_mesh(key)
				lift = TILE_TOP

		if scene == null:
			continue

		var node: Node3D = scene.instantiate()
		node.position = world_position(anchor, CityGridScript.rotated_footprint(footprint, steps))
		node.position.y = lift
		if is_floor:
			node.scale = Vector3(1.0, TILE_HEIGHT / PACK_BASE_THICKNESS, 1.0)
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
