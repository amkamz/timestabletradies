extends Node3D

## The city, on screen.
##
## Builds its own scene tree in code rather than carrying a hand-authored
## `.tscn` full of transforms. Two reasons, and the second is the real one:
## every number here is derived from the grid and the manifest, so the framing
## stays right when the city grows from 5 × 5 to 6 × 6; and a scene assembled in
## code can be read and reviewed as text, which a binary-ish node tree of
## positions cannot.
##
## Godot is a **renderer, not a client** (docs/native/rescope.md). Nothing here
## reaches the network, holds a session or decides what a run earned. It is
## handed a layout and it draws it.

const CityViewScript = preload("res://scripts/city/city_view.gd")
const IsoCameraScript = preload("res://scripts/city/iso_camera.gd")
const SampleCityScript = preload("res://scripts/city/sample_city.gd")

var view: Node3D
var rig: Node3D

var _dragging := false


func _ready() -> void:
	_build_environment()

	view = CityViewScript.new()
	view.name = "CityView"
	add_child(view)

	# `_ready` has run on the view by the time `add_child` returns, so the
	# manifest is loaded and the grid can be handed over and drawn.
	view.grid = SampleCityScript.build()
	view.render()

	_build_camera()
	_handle_capture_request()


## A warm key light with enough fill that the north faces of buildings are not
## black. The pack is flat-shaded low-poly, so this is about legibility rather
## than realism — a child needs to read the shape of a roof, not its material.
func _build_environment() -> void:
	var sun := DirectionalLight3D.new()
	sun.name = "Sun"
	sun.rotation_degrees = Vector3(-50, -130, 0)
	sun.light_energy = 1.1
	add_child(sun)

	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	# Toolbox Pop's sky, so the city sits on the app's own paper rather than on
	# the engine's default grey.
	env.background_color = Color("a9e6f5")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("d8f3ee")
	env.ambient_light_energy = 0.55

	var world := WorldEnvironment.new()
	world.name = "WorldEnvironment"
	world.environment = env
	add_child(world)


func _build_camera() -> void:
	rig = IsoCameraScript.new()
	rig.name = "Rig"

	var camera := Camera3D.new()
	camera.name = "Camera3D"
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	# An orthogonal camera's `size` is its *vertical* extent by default, so a
	# framing tuned on a landscape window overflowed the sides the moment it ran
	# on a portrait phone. The city is as wide as it is deep and the screen is
	# the narrow way round, so width is the dimension that has to fit.
	camera.keep_aspect = Camera3D.KEEP_WIDTH
	# Pulled back along the pivot's local Z. Far enough that nothing clips at
	# the near plane when the city is turned.
	camera.position = Vector3(0, 0, 40)
	camera.near = 0.1
	camera.far = 200.0

	# **Camera first, then the rig into the tree.** The rig finds its camera in
	# `_ready`, and `_ready` fires the moment it is added — so adding the rig
	# first leaves it holding a null camera, and every `zoom` it is given after
	# that goes nowhere. The camera keeps its default orthogonal size of 1.0 and
	# renders about a tenth of one tile, which looks like a solid grey screen
	# rather than like a bug.
	rig.add_child(camera)
	add_child(rig)

	rig.frame_grid(view.grid.size, view.manifest.cell_size)


## Drag to spin, release to settle on a face.
##
## Tap-then-tap placement and the zoom buttons live in the Compose shell above
## this, per the standing rule that dragging is never the only way to do
## anything (docs/native/vision.md). This gesture is the *additional* route, not
## the primary one.
func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT:
			_dragging = event.pressed
			if not event.pressed:
				rig.release_drag()
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP:
			rig.zoom_in()
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			rig.zoom_out()
	elif event is InputEventMouseMotion and _dragging:
		rig.drag(event.relative)


## `--capture <path>` renders one frame, writes it and quits.
##
## The only way to see whether a tile is pointing the right way without a person
## looking at a screen — which matters because nothing about "the corner tile is
## rotated 90° from where the manifest says" is catchable by a unit test.
func _handle_capture_request() -> void:
	var args := OS.get_cmdline_user_args()
	var index := args.find("--capture")
	if index == -1 or index + 1 >= args.size():
		return

	var path: String = args[index + 1]
	await RenderingServer.frame_post_draw
	# A second frame: the first can land before the glTF instances have had
	# their transforms applied, which produces a screenshot of an empty plane
	# and a very confusing ten minutes.
	await RenderingServer.frame_post_draw

	var image := get_viewport().get_texture().get_image()
	var error := image.save_png(path)
	if error != OK:
		push_error("capture failed: %d" % error)
	get_tree().quit(0 if error == OK else 1)
