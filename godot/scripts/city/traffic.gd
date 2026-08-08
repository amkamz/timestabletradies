class_name Traffic
extends Node3D

## Cars, and the ghost roads they arrive on.
##
## A car drives a route from [RoadNetwork], fading in as it enters and out as it
## leaves. It never pops: the last leg of every route runs off the grid onto a
## ghost tile, so a car is always at its faintest when it disappears.
##
## Deliberately not physics, not navigation meshes, not steering. The roads are
## a grid graph and a car is a point moving along it — anything cleverer would
## cost frames on a low-end tablet and look no different at this scale.

const RoadNetworkScript = preload("res://scripts/city/road_network.gd")

## How many cars are alive at once.
##
## Small on purpose. This is scenery on a child's home screen, not a city
## simulator, and a low-end tablet is drawing the whole town behind it.
const MAX_CARS := 4

const SPEED := 2.2
const SECONDS_BETWEEN_SPAWNS := 2.5

## How far past the edge a ghost road reaches, in cells.
const GHOST_TILES := 1

var view: Node3D
var network = RoadNetworkScript.new()

var _ghost_root: Node3D
var _car_root: Node3D
var _cars: Array = []
var _since_spawn := 0.0
var _rng := RandomNumberGenerator.new()


func _ready() -> void:
	_rng.randomize()

	_ghost_root = Node3D.new()
	_ghost_root.name = "GhostRoads"
	add_child(_ghost_root)

	_car_root = Node3D.new()
	_car_root.name = "Cars"
	add_child(_car_root)


## Rebuild for a new city. Called whenever the shell sends one.
func rebuild(city_view: Node3D) -> void:
	view = city_view
	network.build(view.grid, view.manifest)

	for car in _cars:
		car["node"].queue_free()
	_cars.clear()

	_render_ghost_roads()


## One tile of road past every exit, fading out as it goes.
##
## Without them a car is at full opacity the instant before it vanishes, which
## reads as a glitch rather than as something leaving. The ghost is also the
## honest picture of what the town is: a few streets that clearly continue
## somewhere the child has not built yet.
func _render_ghost_roads() -> void:
	for child in _ghost_root.get_children():
		child.queue_free()

	var scene: PackedScene = view._load_mesh("road_straight")
	if scene == null:
		return

	for exit in network.exits:
		var step: Vector2i = RoadNetworkScript.STEP[exit["edge"]]
		for distance in range(1, GHOST_TILES + 1):
			var cell: Vector2i = exit["cell"] + step * distance
			var tile: Node3D = scene.instantiate()
			tile.position = view.world_position(cell)
			tile.scale = Vector3(
				1.0,
				view.TILE_HEIGHT / view.PACK_BASE_THICKNESS,
				1.0,
			)
			# A road running east-west is the same tile turned a quarter, so the
			# ghost has to match the road it continues or the markings jump.
			if exit["edge"] == "e" or exit["edge"] == "w":
				tile.rotation.y = deg_to_rad(-90.0)

			_fade(tile, 1.0 - float(distance) / float(GHOST_TILES + 1))
			_ghost_root.add_child(tile)


## Make a whole instantiated mesh translucent.
##
## Materials come out of the glTF shared between every instance of that mesh, so
## they are duplicated before being touched — otherwise fading one ghost tile
## fades every road in the town.
func _fade(node: Node, alpha: float) -> void:
	if node is MeshInstance3D:
		var mesh_instance := node as MeshInstance3D
		for surface in range(mesh_instance.get_surface_override_material_count()):
			var source: Material = mesh_instance.mesh.surface_get_material(surface)
			if source == null:
				continue
			var material: StandardMaterial3D = source.duplicate()
			material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
			material.albedo_color.a = alpha
			mesh_instance.set_surface_override_material(surface, material)

	for child in node.get_children():
		_fade(child, alpha)


func _process(delta: float) -> void:
	if view == null:
		return

	_since_spawn += delta
	if _since_spawn >= SECONDS_BETWEEN_SPAWNS and _cars.size() < MAX_CARS:
		_since_spawn = 0.0
		_spawn()

	_advance(delta)


func _spawn() -> void:
	# Prefer a real entrance. A town whose roads never reach an edge still gets
	# traffic — it just starts on a road rather than driving in from off-screen.
	var entry: Dictionary
	if not network.exits.is_empty():
		entry = network.exits[_rng.randi_range(0, network.exits.size() - 1)]
	else:
		var roads: Array = []
		for x in range(view.grid.size):
			for z in range(view.grid.size):
				if network.is_road(Vector2i(x, z)):
					roads.append(Vector2i(x, z))
		if roads.is_empty():
			return
		entry = { "cell": roads[_rng.randi_range(0, roads.size() - 1)], "edge": "n" }

	var route: Array = network.route_from(entry, 24, _rng)
	if route.size() < 2:
		return

	var key: String = ["car_sedan", "car_hatchback", "car_taxi", "car_stationwagon"][
		_rng.randi_range(0, 3)
	]
	var scene: PackedScene = view._load_vehicle(key)
	if scene == null:
		return

	var node: Node3D = scene.instantiate()
	node.position = _point(route[0])
	_car_root.add_child(node)

	_cars.append({ "node": node, "route": route, "leg": 0, "t": 0.0 })


func _point(cell: Vector2i) -> Vector3:
	var point: Vector3 = view.world_position(cell)
	point.y = view.TILE_HEIGHT
	return point


func _advance(delta: float) -> void:
	var finished: Array = []

	for car in _cars:
		var route: Array = car["route"]
		var from := _point(route[car["leg"]])
		var to := _point(route[car["leg"] + 1])

		var length := from.distance_to(to)
		car["t"] += (delta * SPEED) / maxf(length, 0.001)

		if car["t"] >= 1.0:
			car["t"] = 0.0
			car["leg"] += 1
			if car["leg"] >= route.size() - 1:
				finished.append(car)
				continue
			from = _point(route[car["leg"]])
			to = _point(route[car["leg"] + 1])

		var node: Node3D = car["node"]
		node.position = from.lerp(to, car["t"])
		node.look_at(to, Vector3.UP)

		# Fade in over the first leg and out over the last, so a car is always
		# faintest at the moment it appears or disappears.
		var alpha := 1.0
		if car["leg"] == 0:
			alpha = car["t"]
		elif car["leg"] == route.size() - 2:
			alpha = 1.0 - car["t"]
		_fade(node, clampf(alpha, 0.0, 1.0))

	for car in finished:
		car["node"].queue_free()
		_cars.erase(car)
