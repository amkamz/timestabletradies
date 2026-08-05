extends "res://tests/test_case.gd"

const Rig = preload("res://scripts/city/iso_camera.gd")


func test_yaw_wraps_both_ways() -> void:
	check_eq(Rig.normalise_degrees(0.0), 0.0, "zero stays")
	check_eq(Rig.normalise_degrees(360.0), 0.0, "a full turn is zero")
	check_eq(Rig.normalise_degrees(450.0), 90.0, "over a turn wraps down")
	check_eq(Rig.normalise_degrees(-90.0), 270.0, "dragging backwards wraps up")
	check_eq(Rig.normalise_degrees(-450.0), 270.0, "more than a turn backwards")


func test_snaps_to_the_nearest_face() -> void:
	check_eq(Rig.nearest_quarter(10.0), 0.0, "just past a face settles back")
	check_eq(Rig.nearest_quarter(80.0), 90.0, "nearly a quarter rounds up")
	check_eq(Rig.nearest_quarter(46.0), 90.0, "just past halfway rounds up")
	check_eq(Rig.nearest_quarter(44.0), 0.0, "just short of halfway rounds down")
	check_eq(Rig.nearest_quarter(350.0), 0.0, "wraps rather than landing on 360")


func test_quarter_index_is_always_zero_to_three() -> void:
	check_eq(Rig.quarter_index(0.0), 0, "north face")
	check_eq(Rig.quarter_index(90.0), 1, "east face")
	check_eq(Rig.quarter_index(180.0), 2, "south face")
	check_eq(Rig.quarter_index(270.0), 3, "west face")
	check_eq(Rig.quarter_index(359.0), 0, "wraps back to the first face")
	check_eq(Rig.quarter_index(-90.0), 3, "backwards drags still index")


func test_zoom_is_clamped_at_both_ends() -> void:
	check_eq(Rig.clamp_zoom(0.0), Rig.MIN_ZOOM, "cannot zoom inside the ground")
	check_eq(Rig.clamp_zoom(9999.0), Rig.MAX_ZOOM, "cannot zoom to orbit")
	check_eq(Rig.clamp_zoom(16.0), 16.0, "a sensible value is left alone")


func test_a_full_circle_of_quarter_turns_returns_home() -> void:
	var yaw := 0.0
	for i in range(4):
		yaw = Rig.nearest_quarter(yaw + 90.0)
	check_eq(yaw, 0.0, "four quarter turns is a full turn")
