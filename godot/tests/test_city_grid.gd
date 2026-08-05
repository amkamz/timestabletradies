extends "res://tests/test_case.gd"

const CityGrid = preload("res://scripts/city/city_grid.gd")

const ONE := Vector2i(1, 1)
const WIDE := Vector2i(2, 1)
const BIG := Vector2i(2, 2)


## ------------------------------------------------------------------ bounds


func test_starts_five_by_five_and_empty() -> void:
	var grid = CityGrid.new()
	check_eq(grid.size, 5, "a new city is 5 × 5")
	check_eq(grid.placement_count(), 0, "a new city is empty")
	check(grid.is_empty(Vector2i(2, 2)), "the middle starts empty")


func test_rejects_out_of_bounds() -> void:
	var grid = CityGrid.new()
	check_false(grid.place("x", Vector2i(5, 0), ONE, 0), "off the east edge")
	check_false(grid.place("x", Vector2i(-1, 0), ONE, 0), "off the west edge")
	check_false(grid.place("x", Vector2i(0, 5), ONE, 0), "off the south edge")
	check_eq(grid.placement_count(), 0, "nothing landed")


func test_multi_cell_piece_must_fit_whole() -> void:
	var grid = CityGrid.new()
	check_false(grid.place("depot", Vector2i(4, 4), BIG, 0), "2 × 2 in the corner overhangs")
	check(grid.place("depot", Vector2i(3, 3), BIG, 0), "2 × 2 fits one cell in")


## --------------------------------------------------------------- occupancy


func test_place_occupies_every_cell() -> void:
	var grid = CityGrid.new()
	check(grid.place("depot", Vector2i(1, 1), BIG, 0), "the depot goes down")
	for cell in [Vector2i(1, 1), Vector2i(2, 1), Vector2i(1, 2), Vector2i(2, 2)]:
		check_false(grid.is_empty(cell), "%s is covered" % cell)
	check(grid.is_empty(Vector2i(3, 3)), "the cell beyond it is free")


func test_rejects_overlap() -> void:
	var grid = CityGrid.new()
	grid.place("a", Vector2i(1, 1), BIG, 0)
	check_false(grid.place("b", Vector2i(2, 2), ONE, 0), "cannot land inside the depot")
	check_false(grid.place("b", Vector2i(0, 0), BIG, 0), "cannot clip its corner")
	check(grid.place("b", Vector2i(3, 1), ONE, 0), "beside it is fine")


func test_rotation_swaps_the_footprint() -> void:
	check_eq(CityGrid.rotated_footprint(WIDE, 0), Vector2i(2, 1), "0° unchanged")
	check_eq(CityGrid.rotated_footprint(WIDE, 1), Vector2i(1, 2), "90° swaps")
	check_eq(CityGrid.rotated_footprint(WIDE, 2), Vector2i(2, 1), "180° unchanged")
	check_eq(CityGrid.rotated_footprint(WIDE, 3), Vector2i(1, 2), "270° swaps")

	var grid = CityGrid.new()
	check(grid.place("yard", Vector2i(4, 0), WIDE, 1), "2 × 1 turned 90° fits the east column")
	check_false(grid.is_empty(Vector2i(4, 1)), "it extends south, not east")


## ------------------------------------------------------------------ remove


func test_removing_any_cell_removes_the_whole_piece() -> void:
	var grid = CityGrid.new()
	grid.place("depot", Vector2i(1, 1), BIG, 0)
	check(grid.remove_at(Vector2i(2, 2)), "tapping the far corner removes it")
	check_eq(grid.placement_count(), 0, "the depot is gone")
	for cell in [Vector2i(1, 1), Vector2i(2, 1), Vector2i(1, 2), Vector2i(2, 2)]:
		check(grid.is_empty(cell), "%s is free again" % cell)


func test_removing_empty_cell_is_a_no_op() -> void:
	var grid = CityGrid.new()
	check_false(grid.remove_at(Vector2i(0, 0)), "nothing to remove")


## -------------------------------------------------------------------- move


func test_move_onto_own_cells_is_legal() -> void:
	var grid = CityGrid.new()
	grid.place("depot", Vector2i(1, 1), BIG, 0)
	check(grid.move(Vector2i(1, 1), Vector2i(2, 1)), "nudging one square east overlaps itself, and that is fine")
	check(grid.is_empty(Vector2i(1, 1)), "it left the old column")
	check_false(grid.is_empty(Vector2i(3, 2)), "it reached the new one")


func test_failed_move_leaves_the_piece_alone() -> void:
	var grid = CityGrid.new()
	grid.place("depot", Vector2i(1, 1), BIG, 0)
	grid.place("hut", Vector2i(3, 1), ONE, 0)
	check_false(grid.move(Vector2i(1, 1), Vector2i(2, 1)), "blocked by the hut")
	check_false(grid.is_empty(Vector2i(1, 1)), "the depot is still where it was")
	check_eq(grid.placement_count(), 2, "nothing was lost")


func test_move_can_rotate() -> void:
	var grid = CityGrid.new()
	grid.place("yard", Vector2i(0, 0), WIDE, 0)
	check(grid.move(Vector2i(0, 0), Vector2i(0, 0), 1), "turned in place")
	check_false(grid.is_empty(Vector2i(0, 1)), "now extends south")
	check(grid.is_empty(Vector2i(1, 0)), "no longer extends east")


## ------------------------------------------------------------------ growth


func test_growth_needs_both_conditions() -> void:
	check_eq(CityGrid.size_for([1, 2, 10], {}), 5, "no qualifying table")
	check_eq(CityGrid.size_for([6], { 6: 5 }), 5, "×6 unlocked but 6 × 6 only right 5 times")
	check_eq(CityGrid.size_for([1, 2], { 6: 99 }), 5, "6 × 6 mastered but ×6 locked")
	check_eq(CityGrid.size_for([6], { 6: 6 }), 6, "both conditions met")


func test_growth_takes_the_highest_qualifying_table() -> void:
	check_eq(
		CityGrid.size_for([6, 7], { 7: 7 }),
		7,
		"7 × 7 earned without 6 × 6 still opens a 7 × 7 city"
	)
	check_eq(CityGrid.size_for([12], { 12: 12 }), 12, "the ceiling is reachable")
	check_eq(CityGrid.size_for([12], { 12: 500 }), 12, "and it is a ceiling")


func test_growth_is_one_way() -> void:
	var grid = CityGrid.new()
	check(grid.grow_to(7), "grows to 7")
	check_false(grid.grow_to(6), "refuses to shrink")
	check_eq(grid.size, 7, "still 7")
	check_false(grid.grow_to(7), "already there")


func test_grown_city_accepts_the_new_edge() -> void:
	var grid = CityGrid.new()
	check_false(grid.place("x", Vector2i(5, 5), ONE, 0), "outside a 5 × 5")
	grid.grow_to(6)
	check(grid.place("x", Vector2i(5, 5), ONE, 0), "inside a 6 × 6")


## ----------------------------------------------------------- serialisation


func test_round_trip_preserves_the_city() -> void:
	var grid = CityGrid.new()
	grid.grow_to(6)
	grid.place("road_cross", Vector2i(0, 0), ONE, 0)
	grid.place("depot", Vector2i(2, 2), BIG, 0)
	grid.place("yard", Vector2i(0, 4), WIDE, 1)

	var restored = CityGrid.new()
	var dropped = restored.from_dict(grid.to_dict())

	check_eq(dropped, 0, "nothing dropped")
	check_eq(restored.size, 6, "size survived")
	check_eq(restored.placement_count(), 3, "all three pieces survived")
	check_eq(restored.to_dict(), grid.to_dict(), "identical after a round trip")


func test_serialised_form_is_json_safe() -> void:
	var grid = CityGrid.new()
	grid.place("depot", Vector2i(1, 1), BIG, 2)
	var encoded := JSON.stringify(grid.to_dict())
	check(encoded.length() > 0, "encodes")

	var decoded = JSON.parse_string(encoded)
	check(decoded != null, "decodes")

	var restored = CityGrid.new()
	check_eq(restored.from_dict(decoded), 0, "survives a trip through real JSON")
	check_eq(restored.placement_count(), 1, "the depot came back")


func test_corrupt_save_drops_pieces_rather_than_half_loading() -> void:
	var grid = CityGrid.new()
	var dropped = grid.from_dict({
		"size": 5,
		"pieces": [
			{ "key": "a", "rot": 0, "anchor": [0, 0], "footprint": [1, 1] },
			{ "key": "b", "rot": 0, "anchor": [0, 0], "footprint": [1, 1] },
			{ "key": "c", "rot": 0, "anchor": [99, 99], "footprint": [1, 1] },
		],
	})
	check_eq(dropped, 2, "the overlap and the out-of-bounds piece are both dropped")
	check_eq(grid.placement_count(), 1, "the good piece loaded")


func test_load_clamps_a_silly_size() -> void:
	var grid = CityGrid.new()
	grid.from_dict({ "size": 400, "pieces": [] })
	check_eq(grid.size, 12, "clamped to the ceiling")
	grid.from_dict({ "size": 1, "pieces": [] })
	check_eq(grid.size, 5, "clamped to the floor")
