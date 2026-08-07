extends "res://tests/test_case.gd"

const Rig = preload("res://scripts/city/iso_camera.gd")


func test_yaw_wraps_both_ways() -> void:
	check_eq(Rig.normalise_degrees(0.0), 0.0, "zero stays")
	check_eq(Rig.normalise_degrees(360.0), 0.0, "a full turn is zero")
	check_eq(Rig.normalise_degrees(450.0), 90.0, "over a turn wraps down")
	check_eq(Rig.normalise_degrees(-90.0), 270.0, "dragging backwards wraps up")
	check_eq(Rig.normalise_degrees(-450.0), 270.0, "more than a turn backwards")


func test_nearest_corner_describes_without_moving_anything() -> void:
	# Only used to say which way the town is facing. Nothing snaps to it — an
	# earlier version did, and a child could never leave the town at an angle
	# they had chosen, because it slid somewhere else on every release.
	check_eq(Rig.nearest_quarter(Rig.ISO_YAW), Rig.ISO_YAW, "the start angle is a corner")
	check_eq(Rig.nearest_quarter(50.0), 45.0, "nearest corner below")
	check_eq(Rig.nearest_quarter(91.0), 135.0, "nearest corner above")
	check_eq(Rig.nearest_quarter(340.0), 315.0, "wraps rather than landing on 360")


func test_a_slow_release_leaves_the_town_alone() -> void:
	# The whole reason the snap went. Below the flick threshold a release is a
	# placement, and a placement must not drift.
	check_eq(Rig.settle_spin(0.0), 0.0, "a still town stays still")
	check_eq(Rig.settle_spin(Rig.FLICK_THRESHOLD - 1.0), 0.0, "a careful drag stops dead")
	check_eq(Rig.settle_spin(-(Rig.FLICK_THRESHOLD - 1.0)), 0.0, "in both directions")


func test_a_flick_keeps_going() -> void:
	var flick: float = Rig.FLICK_THRESHOLD + 200.0
	check_eq(Rig.settle_spin(flick), flick, "a flick keeps its speed")
	check_eq(Rig.settle_spin(-flick), -flick, "in both directions")


func test_a_flick_slows_down_and_stops() -> void:
	var spin: float = 400.0
	var frames := 0
	# 60fps, and it must come to rest inside a few seconds rather than drifting
	# forever — a town still turning when a child looks back at it is a bug.
	while not is_zero_approx(spin) and frames < 600:
		var next: float = Rig.decay_spin(spin, 1.0 / 60.0)
		check(absf(next) < absf(spin), "frame %d sped up instead of slowing" % frames)
		spin = next
		frames += 1

	check_eq(spin, 0.0, "came to a full stop")
	check(frames < 300, "took %d frames to stop, which is too long" % frames)


func test_slowing_is_proportional_to_speed() -> void:
	# Exponential, not linear: a hard flick travels a long way and eases out,
	# a gentle one barely moves. That is what makes it feel like weight.
	var fast: float = 400.0 - Rig.decay_spin(400.0, 1.0 / 60.0)
	var slow: float = 100.0 - Rig.decay_spin(100.0, 1.0 / 60.0)
	check(fast > slow, "a fast spin should shed more speed per frame than a slow one")


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


