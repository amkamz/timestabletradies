extends "res://tests/test_case.gd"

const CityGrid = preload("res://scripts/city/city_grid.gd")
const RoadNetwork = preload("res://scripts/city/road_network.gd")

const ONE := Vector2i(1, 1)


## A stand-in for the manifest: enough of its interface for the network, and
## none of its file loading. The real one reads `assets/manifest.json`, which a
## headless test has no business depending on.
class FakeManifest:
	extends RefCounted

	const EDGES := ["n", "e", "s", "w"]

	var declared := {
		"road_straight": ["n", "s"],
		"road_corner": ["n", "e"],
		"road_junction": ["n", "e", "s", "w"],
		"road_tsplit": ["n", "e", "s"],
	}

	func category_of(key: String) -> String:
		return "road" if key.begins_with("road") else "building"

	func connections_of(key: String, rotation_steps: int) -> Array:
		var out: Array = []
		for edge in declared.get(key, []):
			var index: int = EDGES.find(edge)
			out.append(EDGES[(index + rotation_steps) % EDGES.size()])
		return out


func _network(pieces: Array, size := 5):
	var grid = CityGrid.new()
	grid.grow_to(size)
	for piece in pieces:
		grid.place(piece[0], piece[1], ONE, piece[2])

	var network = RoadNetwork.new()
	network.build(grid, FakeManifest.new())
	return network


func test_an_empty_town_has_no_roads_and_no_exits() -> void:
	var network = _network([])
	check_eq(network.exits.size(), 0, "nowhere to come from")
	check_false(network.is_road(Vector2i(0, 0)), "no road anywhere")


func test_a_road_to_the_edge_becomes_an_exit() -> void:
	# A north-south road on the top row. Only its *north* end leaves the grid —
	# the south end runs into an empty square that is still inside the town, and
	# an exit means "off the edge", not "nowhere to go".
	var network = _network([["road_straight", Vector2i(2, 0), 0]])
	check_eq(network.exits.size(), 1, "one end leaves the grid")
	check_eq(network.exits[0]["edge"], "n", "and it is the northern one")
	check_eq(network.exits[0]["cell"], Vector2i(2, 0), "from the cell that touches the edge")


func test_a_road_spanning_the_town_leaves_at_both_ends() -> void:
	var pieces: Array = []
	for z in range(5):
		pieces.append(["road_straight", Vector2i(2, z), 0])

	var network = _network(pieces)
	check_eq(network.exits.size(), 2, "top and bottom")


func test_buildings_are_not_road() -> void:
	var network = _network([["building_A", Vector2i(2, 2), 0]])
	check_false(network.is_road(Vector2i(2, 2)), "a building is not drivable")


func test_two_roads_only_join_when_both_agree() -> void:
	# A straight road running north-south, and a corner beside it that connects
	# north and east — so it does *not* reach back west toward the straight.
	var network = _network([
		["road_straight", Vector2i(2, 2), 0],
		["road_corner", Vector2i(3, 2), 0],
	])
	var options := network.exits_from(Vector2i(2, 2))
	check_false(options.has("e"), "a road may not enter a neighbour that faces away")


func test_a_straight_run_is_drivable_end_to_end() -> void:
	var network = _network([
		["road_straight", Vector2i(2, 0), 0],
		["road_straight", Vector2i(2, 1), 0],
		["road_straight", Vector2i(2, 2), 0],
	])
	var middle := network.exits_from(Vector2i(2, 1))
	check(middle.has("n"), "can carry on north")
	check(middle.has("s"), "can carry on south")

	var one_way := network.exits_from(Vector2i(2, 1), "n")
	check_false(one_way.has("n"), "never turns straight back the way it came")


func test_a_route_starts_at_its_entry_and_leaves_the_grid() -> void:
	var network = _network([
		["road_straight", Vector2i(2, 0), 0],
		["road_straight", Vector2i(2, 1), 0],
		["road_straight", Vector2i(2, 2), 0],
		["road_straight", Vector2i(2, 3), 0],
		["road_straight", Vector2i(2, 4), 0],
	])
	var rng := RandomNumberGenerator.new()
	rng.seed = 1

	var route: Array = network.route_from({ "cell": Vector2i(2, 0), "edge": "n" }, 20, rng)
	check_eq(route[0], Vector2i(2, 0), "starts where it came in")
	check(route.size() >= 2, "goes somewhere")
	check_false(
		network.is_road(route[route.size() - 1]),
		"the last step is off the road, which is where it fades out",
	)


func test_a_route_terminates_even_on_a_loop() -> void:
	# A ring of corners: every cell has somewhere to go, forever. The step limit
	# is what stops a car driving in circles until the app is closed.
	var network = _network([
		["road_corner", Vector2i(1, 1), 1],
		["road_corner", Vector2i(2, 1), 2],
		["road_corner", Vector2i(2, 2), 3],
		["road_corner", Vector2i(1, 2), 0],
	])
	var rng := RandomNumberGenerator.new()
	rng.seed = 7

	var route: Array = network.route_from({ "cell": Vector2i(1, 1), "edge": "n" }, 12, rng)
	check(route.size() <= 13, "a loop is bounded by the step limit, not by luck")


func test_a_lone_road_tile_still_gives_a_route_out() -> void:
	# The starter city is one road. A child should still see a car cross it.
	var network = _network([["road_straight", Vector2i(2, 2), 0]])
	var rng := RandomNumberGenerator.new()
	rng.seed = 3

	check_eq(network.exits.size(), 0, "a road in the middle reaches no edge")
	var route: Array = network.route_from({ "cell": Vector2i(2, 2), "edge": "n" }, 6, rng)
	check(route.size() >= 2, "it can still be driven along and off")
