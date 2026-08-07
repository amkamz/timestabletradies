class_name IsoCameraRig
extends Node3D

## The isometric camera over the city.
##
## A pivot at the centre of the grid with an orthogonal camera pulled back along
## it. The pivot yaws; the camera never moves relative to it. That is what keeps
## the projection stable — orbiting a perspective camera changes the shape of
## every building as it goes, and the whole appeal of an isometric town is that
## it doesn't.
##
## **On the axis.** The ground plane is XZ and the city spins about **Y**. The
## intent — "the town lies flat and turns about the axis pointing up out of it" —
## is exactly this; Godot is Y-up, so that axis is Y. Every Y-up asset pack
## (KayKit, Kenney) assumes the same, so this is also the only choice that
## doesn't mean rotating every mesh on import.

## True isometric: atan(1 / √2). A 2:1 "game isometric" look wants 30° instead.
const TRUE_ISO_PITCH_DEG := 35.264389682754654

const MIN_ZOOM := 4.0
const MAX_ZOOM := 40.0

## One press of a zoom button. Buttons exist because pinch cannot be the only
## way to zoom — see the drag rule in docs/native/vision.md.
const ZOOM_STEP := 2.0

@export var pitch_degrees: float = TRUE_ISO_PITCH_DEG
@export var zoom: float = 16.0:
	set(value):
		zoom = clamp_zoom(value)
		_apply()

@export var yaw_degrees: float = ISO_YAW:
	set(value):
		yaw_degrees = normalise_degrees(value)
		_apply()

## Degrees of yaw per pixel dragged.
@export var drag_sensitivity: float = 0.4

var _camera: Camera3D

## Current angular velocity in degrees per second. Non-zero only while coasting.
var _spin: float = 0.0


func _ready() -> void:
	_camera = get_node_or_null("Camera3D")
	_apply()


## ------------------------------------------------------------ pure helpers
##
## Static and side-effect free so the maths is testable headlessly, without
## standing up a SceneTree or a viewport.


static func normalise_degrees(degrees: float) -> float:
	var wrapped := fmod(degrees, 360.0)
	if wrapped < 0.0:
		wrapped += 360.0
	return wrapped


static func clamp_zoom(value: float) -> float:
	return clampf(value, MIN_ZOOM, MAX_ZOOM)


## The angle the town starts at.
##
## A square town seen from 45° presents a corner to the camera, which is what
## makes it read as isometric. Seen from 0° it presents a flat face and the
## whole thing goes from a model of a town to a floor plan of one. It is a
## starting position, not a resting one — the town stays wherever it is left.
const ISO_YAW := 45.0


## The nearest corner, used only to *describe* the view.
##
## Nothing snaps to this. It exists so the shell can say which way the town is
## facing without reading out an angle to a seven-year-old.
static func nearest_quarter(degrees: float) -> float:
	var offset := normalise_degrees(degrees - ISO_YAW)
	return normalise_degrees(round(offset / 90.0) * 90.0 + ISO_YAW)


## Which of the four corners the town is closest to, 0–3.
static func quarter_index(degrees: float) -> int:
	var offset := normalise_degrees(nearest_quarter(degrees) - ISO_YAW)
	return int(offset / 90.0) % 4


## ---------------------------------------------------------------- momentum
##
## The town spins freely and keeps going when it is flicked, slowing to a stop
## on its own. Nothing snaps: a slow drag leaves the town exactly where the
## finger left it, which is the whole point of being able to turn it at all.


## Degrees per second below which a release is a placement, not a flick.
##
## Without this every drag would coast a little, and a child carefully lining
## the town up would watch it drift past the angle they wanted.
const FLICK_THRESHOLD := 30.0

## How quickly a flick bleeds off. Higher stops sooner.
const SPIN_DECAY := 1.6

## Degrees per second below which coasting has visually stopped.
const SPIN_STOP := 2.0

## Nothing should spin faster than a couple of turns a second.
const MAX_SPIN := 720.0


## What a release does to the current angular velocity.
##
## A flick keeps its speed and coasts; anything slower stops dead.
static func settle_spin(spin: float) -> float:
	return spin if absf(spin) >= FLICK_THRESHOLD else 0.0


## One frame of slowing down.
##
## Exponential rather than linear, so a hard flick travels a long way and eases
## out, while a gentle one barely moves — which is what "spacey" means in a
## hand: the deceleration is proportional to the speed.
static func decay_spin(spin: float, delta: float) -> float:
	var next := spin * exp(-SPIN_DECAY * delta)
	return 0.0 if absf(next) < SPIN_STOP else next


## ------------------------------------------------------------------- input


## Called from the shell or from a drag gesture. Horizontal travel only —
## the pitch is fixed, because a child tilting an isometric town off its axis
## produces a view that is worse in every way and hard to recover from.
##
## [param screen_velocity] is the pointer's speed in pixels per second, which
## Godot already tracks on the motion event. Keeping the latest one is what lets
## a release tell a flick from a careful placement.
func drag(delta_pixels: Vector2, screen_velocity: Vector2 = Vector2.ZERO) -> void:
	yaw_degrees = yaw_degrees - delta_pixels.x * drag_sensitivity
	_spin = clampf(-screen_velocity.x * drag_sensitivity, -MAX_SPIN, MAX_SPIN)


## Let go.
##
## A flick coasts and slows to a stop; anything slower stays exactly where it
## was left. **Nothing snaps.** An earlier version rounded to the nearest corner
## on release, which meant a child could never leave the town at an angle they
## chose — it always slid somewhere else the moment they lifted their finger.
func release_drag() -> void:
	_spin = settle_spin(_spin)


func _process(delta: float) -> void:
	if is_zero_approx(_spin):
		return
	yaw_degrees = yaw_degrees + _spin * delta
	_spin = decay_spin(_spin, delta)


func zoom_in() -> void:
	zoom = zoom - ZOOM_STEP


func zoom_out() -> void:
	zoom = zoom + ZOOM_STEP


## Pinch hands a ratio; buttons hand a step. Both land here.
func zoom_by_factor(factor: float) -> void:
	zoom = zoom / maxf(factor, 0.01)


## A quarter turn from a button, for anyone who cannot flick a town around —
## which is the accessible route to the same thing the drag does.
func rotate_quarter(steps: int) -> void:
	_spin = 0.0
	yaw_degrees = nearest_quarter(yaw_degrees + 90.0 * steps)


## Re-centres over a grid of `size` cells so a city that has just grown from
## 5 × 5 to 6 × 6 stays framed.
func frame_grid(size: int, cell_size: float) -> void:
	var extent := size * cell_size
	position = Vector3(extent * 0.5, 0.0, extent * 0.5)
	# 1.6 rather than 1.0: a square town seen from 45° presents its *diagonal*
	# to the camera, which is 1.41 times its side, and buildings stand up out of
	# the plane on top of that. Framing to the side length crops the corners.
	zoom = extent * 1.6


func _apply() -> void:
	rotation_degrees = Vector3(-pitch_degrees, yaw_degrees, 0.0)
	if _camera != null:
		_camera.projection = Camera3D.PROJECTION_ORTHOGONAL
		_camera.size = zoom
