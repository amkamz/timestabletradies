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

@export var yaw_degrees: float = 45.0:
	set(value):
		yaw_degrees = normalise_degrees(value)
		_apply()

## Degrees of yaw per pixel dragged.
@export var drag_sensitivity: float = 0.4

var _camera: Camera3D


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


## The nearest 90° step. Used when a drag is released, so the town always
## settles onto a face rather than at a tiring in-between angle.
static func nearest_quarter(degrees: float) -> float:
	var normalised := normalise_degrees(degrees)
	return normalise_degrees(round(normalised / 90.0) * 90.0)


## Which of the four faces the town is currently showing, 0–3. The shell uses
## this to describe the view aloud without needing the angle.
static func quarter_index(degrees: float) -> int:
	return int(nearest_quarter(degrees) / 90.0) % 4


## ------------------------------------------------------------------- input


## Called from the shell or from a drag gesture. Horizontal travel only —
## the pitch is fixed, because a child tilting an isometric town off its axis
## produces a view that is worse in every way and hard to recover from.
func drag(delta_pixels: Vector2) -> void:
	yaw_degrees = yaw_degrees - delta_pixels.x * drag_sensitivity


func release_drag() -> void:
	yaw_degrees = nearest_quarter(yaw_degrees)


func zoom_in() -> void:
	zoom = zoom - ZOOM_STEP


func zoom_out() -> void:
	zoom = zoom + ZOOM_STEP


## Pinch hands a ratio; buttons hand a step. Both land here.
func zoom_by_factor(factor: float) -> void:
	zoom = zoom / maxf(factor, 0.01)


func rotate_quarter(steps: int) -> void:
	yaw_degrees = nearest_quarter(yaw_degrees + 90.0 * steps)


## Re-centres over a grid of `size` cells so a city that has just grown from
## 5 × 5 to 6 × 6 stays framed.
func frame_grid(size: int, cell_size: float) -> void:
	var extent := size * cell_size
	position = Vector3(extent * 0.5, 0.0, extent * 0.5)
	zoom = extent * 1.2


func _apply() -> void:
	rotation_degrees = Vector3(-pitch_degrees, yaw_degrees, 0.0)
	if _camera != null:
		_camera.projection = Camera3D.PROJECTION_ORTHOGONAL
		_camera.size = zoom
