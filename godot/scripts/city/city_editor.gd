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
const CityGridScript = preload("res://scripts/city/city_grid.gd")
const BridgeScript = preload("res://bridge/city_bridge.gd")
const TrafficScript = preload("res://scripts/city/traffic.gd")

## Toolbox Pop's sky, used whenever the surface is opaque.
const SKY := Color("a9e6f5")

var view: Node3D
var rig: Node3D
var traffic: Node3D
var bridge = BridgeScript.new()

var _dragging := false
## Set when a press began, so a tap can be told from the end of a drag.
var _press_position := Vector2.ZERO
var _press_travelled := 0.0


func _ready() -> void:
	# Pinch needs two real fingers, and mouse emulation collapses every touch
	# into a single synthetic pointer — so the second finger would simply never
	# arrive. Turning it off costs nothing: a laptop still has a real mouse, and
	# the mouse handlers below stay for it.
	Input.set_emulate_mouse_from_touch(false)

	_build_environment()

	view = CityViewScript.new()
	view.name = "CityView"
	add_child(view)

	# The sample city is the fallback, not the default. On a phone the shell
	# replaces it within a frame or two; on a laptop there is no shell, and
	# having something to draw is what keeps the renderer runnable and
	# screenshot-testable without a device attached.
	view.grid = SampleCityScript.build()
	view.render()

	traffic = TrafficScript.new()
	traffic.name = "Traffic"
	add_child(traffic)
	traffic.rebuild(view)

	_build_camera()

	if bridge.connect_to_host():
		bridge.city_state_received.connect(_on_city_state)
		bridge.announce_ready()

	_handle_capture_request()


## Replace the whole city with the one the shell sent.
##
## Wholesale rather than a diff. A 6 × 6 town is thirty-six cells; an
## incremental protocol would buy nothing and would eventually disagree with the
## model it exists to mirror.
func _on_city_state(state: Dictionary) -> void:
	var grid = CityGridScript.new()

	# The size rule lives in `city_grid.gd` and is tested there, so the shell
	# sends the *inputs* — which tables are open and how often each square
	# number has been answered — rather than a size it worked out itself. One
	# implementation, and the two can never drift.
	var unlocked: Array = state.get("unlocked_tables", [])
	var squares: Dictionary = {}
	for key in state.get("square_correct", {}):
		squares[int(key)] = int(state["square_correct"][key])

	grid.grow_to(CityGridScript.size_for(unlocked, squares))

	var dropped: int = grid.from_dict({
		"size": grid.size,
		"pieces": state.get("pieces", []),
	})
	if dropped > 0:
		push_warning("CityEditor: dropped %d piece(s) the grid refused" % dropped)

	_set_transparent(bool(state.get("transparent", false)))

	view.grid = grid
	view.render()
	traffic.rebuild(view)
	rig.frame_grid(grid.size, view.manifest.cell_size)


## Whether the city draws over the app or fills its own rectangle.
##
## The shell decides, because only the shell knows what is on top: the Site tile
## has nothing over it and wants to sit in the painted landscape, while the city
## editor has a back button and a build panel composited above and would hide
## them behind a transparent surface lifted to the top.
##
## Clearing has to be told twice. The environment's background covers what the
## camera draws; `set_default_clear_color` covers the framebuffer underneath it,
## and leaving that one opaque is enough to make the whole surface opaque no
## matter what the environment says.
func _set_transparent(transparent: bool) -> void:
	var world := get_node_or_null("WorldEnvironment") as WorldEnvironment
	if world == null:
		return

	if transparent:
		world.environment.background_mode = Environment.BG_CLEAR_COLOR
		RenderingServer.set_default_clear_color(Color(0, 0, 0, 0))
	else:
		world.environment.background_mode = Environment.BG_COLOR
		world.environment.background_color = SKY
		RenderingServer.set_default_clear_color(SKY)


## A warm key light with enough fill that the north faces of buildings are not
## black. The pack is flat-shaded low-poly, so this is about legibility rather
## than realism — a child needs to read the shape of a roof, not its material.
func _build_environment() -> void:
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	# Toolbox Pop's sky. Replaced by nothing at all when the shell says the
	# surface is transparent — see [method _set_transparent].
	env.background_color = SKY
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

	# The key light is a child of the rig, not of the world.
	#
	# A sun fixed in world space is physically right and looks wrong: turning
	# the town swings every lit face through the light, so the whole city
	# appears to brighten and darken as a child drags it. Parenting the light to
	# the rig fixes its direction *relative to the view*, so the near faces stay
	# lit and only the town turns — which is what the eye expects from spinning a
	# model on a table rather than spinning the table under a lamp.
	var sun := DirectionalLight3D.new()
	sun.name = "Sun"
	sun.rotation_degrees = Vector3(-40, -35, 0)
	sun.light_energy = 1.1
	rig.add_child(sun)

	add_child(rig)

	rig.frame_grid(view.grid.size, view.manifest.cell_size)


## Drag to spin, release to settle on a face.
##
## Tap-then-tap placement and the zoom buttons live in the Compose shell above
## this, per the standing rule that dragging is never the only way to do
## anything (docs/native/vision.md). This gesture is the *additional* route, not
## the primary one.
## How far a finger may travel and still count as a tap rather than a drag.
const TAP_SLOP := 12.0


## Fingers currently down, by index. Pinch needs two, so they have to be tracked
## rather than handled one event at a time.
var _touches: Dictionary = {}
var _pinch_distance := 0.0


func _unhandled_input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		_handle_touch(event)
	elif event is InputEventScreenDrag:
		_handle_drag(event)
	elif event is InputEventMouseButton:
		# Desktop only — a real mouse, for running the project on a laptop.
		# Mouse-from-touch emulation is off (see `_ready`), so these never
		# double up with the touch handlers above.
		if event.button_index == MOUSE_BUTTON_LEFT:
			if event.pressed:
				_begin_press(event.position)
			else:
				_end_press(event.position)
		elif event.button_index == MOUSE_BUTTON_WHEEL_UP:
			rig.zoom_in()
		elif event.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			rig.zoom_out()
	elif event is InputEventMouseMotion and _dragging:
		_continue_press(event.relative, event.velocity)


func _handle_touch(event: InputEventScreenTouch) -> void:
	if event.pressed:
		_touches[event.index] = event.position
		if _touches.size() == 1:
			_begin_press(event.position)
		elif _touches.size() == 2:
			# A second finger cancels whatever the first was doing. Without
			# this, pinching also spins the town, because the two fingers rarely
			# move by the same amount.
			_dragging = false
			_pinch_distance = _current_pinch_distance()
	else:
		var was_alone := _touches.size() == 1
		_touches.erase(event.index)
		if was_alone:
			_end_press(event.position)
		elif _touches.is_empty():
			rig.release_drag()


func _handle_drag(event: InputEventScreenDrag) -> void:
	_touches[event.index] = event.position

	if _touches.size() >= 2:
		_apply_pinch()
		return

	if _dragging:
		_continue_press(event.relative, event.velocity)


## Zoom by how much the gap between two fingers changed.
##
## A ratio rather than a difference, so the gesture feels the same whether the
## town is filling the screen or sitting small in the middle of it — moving your
## fingers apart by an inch should always roughly double the size, not add a
## fixed number of world units.
func _apply_pinch() -> void:
	var distance := _current_pinch_distance()
	if _pinch_distance <= 0.0 or distance <= 0.0:
		_pinch_distance = distance
		return

	rig.zoom_by_factor(distance / _pinch_distance)
	_pinch_distance = distance


func _current_pinch_distance() -> float:
	var points: Array = _touches.values()
	if points.size() < 2:
		return 0.0
	return points[0].distance_to(points[1])


func _begin_press(position: Vector2) -> void:
	_dragging = true
	_press_position = position
	_press_travelled = 0.0


func _continue_press(relative: Vector2, velocity: Vector2) -> void:
	_press_travelled += relative.length()
	if _press_travelled <= TAP_SLOP:
		return
	# `velocity` is the pointer's speed in pixels per second, which the engine
	# already tracks — it is what lets the release tell a flick from a careful
	# placement without this having to time anything itself.
	rig.drag(relative, velocity)


func _end_press(position: Vector2) -> void:
	if not _dragging:
		return
	_dragging = false
	# A tap and the end of a drag arrive as the same event, so the distance
	# travelled since the press is what tells them apart — the same touch-slop
	# rule the rest of the app uses, so a tap never accidentally spins the town
	# and a drag never accidentally selects a square.
	if _press_travelled <= TAP_SLOP:
		_report_touch_at(position)
	else:
		rig.release_drag()


## Turn a screen position into a square, and tell the shell about it.
##
## The engine reports *which* square. It does not decide what touching one
## means — that is the shell's, because the shell is where the accessibility
## tree lives and where a child's coins and inventory are known.
func _report_touch_at(screen: Vector2) -> void:
	if not bridge.available():
		return

	var camera: Camera3D = rig.get_node_or_null("Camera3D")
	if camera == null:
		return

	var origin := camera.project_ray_origin(screen)
	var direction := camera.project_ray_normal(screen)

	# The city is flat, so a ray-versus-ground-plane intersection is the whole
	# of hit-testing — no colliders, no physics, nothing to keep in step with
	# the tiles as they change.
	if is_zero_approx(direction.y):
		return
	var distance := -origin.y / direction.y
	if distance < 0.0:
		return

	var cell: Vector2i = view.cell_at(origin + direction * distance)
	if view.grid.in_bounds(cell):
		bridge.report_cell_touched(cell)


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

	# An optional wait, in seconds, before the shot. Anything that moves —
	# traffic, people — is invisible in a frame taken at startup, because it has
	# not spawned yet. `--capture out.png 5` is how you photograph it.
	var wait := 0.0
	if index + 2 < args.size():
		wait = args[index + 2].to_float()
	if wait > 0.0:
		await get_tree().create_timer(wait).timeout

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
