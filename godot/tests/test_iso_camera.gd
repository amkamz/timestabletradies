extends "res://tests/test_case.gd"

const Rig = preload("res://scripts/city/iso_camera.gd")


func test_yaw_wraps_both_ways() -> void:
	check_eq(Rig.normalise_degrees(0.0), 0.0, "zero stays")
	check_eq(Rig.normalise_degrees(360.0), 0.0, "a full turn is zero")
	check_eq(Rig.normalise_degrees(450.0), 90.0, "over a turn wraps down")
	check_eq(Rig.normalise_degrees(-90.0), 270.0, "dragging backwards wraps up")
	check_eq(Rig.normalise_degrees(-450.0), 270.0, "more than a turn backwards")


func test_snaps_to_a_corner_never_a_face() -> void:
	# The regression this guards: snapping to multiples of 90 rounded the
	# camera's 45° rest angle up to 90 on the very first drag-release, which
	# turned the isometric city into a top-down floor plan. Caught on a device,
	# because every number involved looked perfectly reasonable in isolation.
	check_eq(Rig.nearest_quarter(Rig.ISO_YAW), Rig.ISO_YAW, "the rest angle is already a corner")
	check_eq(Rig.nearest_quarter(50.0), 45.0, "a nudge settles back")
	check_eq(Rig.nearest_quarter(89.0), 45.0, "just short of halfway rounds back")
	check_eq(Rig.nearest_quarter(91.0), 135.0, "just past halfway rounds on")
	check_eq(Rig.nearest_quarter(0.0), 45.0, "a face is never a resting angle")
	check_eq(Rig.nearest_quarter(340.0), 315.0, "wraps rather than landing on 360")


func test_every_resting_angle_is_a_corner() -> void:
	for degrees in [0.0, 37.0, 91.0, 180.0, 270.0, 359.0, -90.0, 450.0]:
		var settled: float = Rig.nearest_quarter(degrees)
		check_eq(
			fmod(settled - Rig.ISO_YAW + 360.0, 90.0),
			0.0,
			"%s settled to %s, which is not a corner" % [degrees, settled],
		)


func test_quarter_index_is_always_zero_to_three() -> void:
	check_eq(Rig.quarter_index(45.0), 0, "first corner")
	check_eq(Rig.quarter_index(135.0), 1, "second corner")
	check_eq(Rig.quarter_index(225.0), 2, "third corner")
	check_eq(Rig.quarter_index(315.0), 3, "fourth corner")
	check_eq(Rig.quarter_index(404.0), 0, "wraps back to the first corner")
	check_eq(Rig.quarter_index(-45.0), 3, "backwards drags still index")


func test_zoom_is_clamped_at_both_ends() -> void:
	check_eq(Rig.clamp_zoom(0.0), Rig.MIN_ZOOM, "cannot zoom inside the ground")
	check_eq(Rig.clamp_zoom(9999.0), Rig.MAX_ZOOM, "cannot zoom to orbit")
	check_eq(Rig.clamp_zoom(16.0), 16.0, "a sensible value is left alone")


func test_a_full_circle_of_quarter_turns_returns_home() -> void:
	var yaw := Rig.ISO_YAW
	for i in range(4):
		yaw = Rig.nearest_quarter(yaw + 90.0)
	check_eq(yaw, Rig.ISO_YAW, "four quarter turns is a full turn")
