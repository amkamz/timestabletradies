class_name CityBridgeClient
extends RefCounted

## The engine's half of the seam to the app.
##
## **JSON in, JSON out** (docs/native/rescope.md). Nothing here fetches, decides
## or persists anything: the shell sends a whole city and this reports which
## square was touched. Every rule about what a touch *means* — whether a piece
## can go there, what it costs, whether the child owns one — stays in Compose,
## because that is where the accessibility tree is.
##
## Absent on desktop, and that is deliberate rather than tolerated: the sample
## city in `sample_city.gd` is what the project falls back to, so the whole
## renderer stays runnable and screenshot-testable from a laptop with no phone
## attached. A bridge that had to exist would make that impossible.

const PLUGIN_NAME := "TradiesCity"

signal city_state_received(state: Dictionary)

var _plugin: Object = null


func connect_to_host() -> bool:
	if not Engine.has_singleton(PLUGIN_NAME):
		return false

	_plugin = Engine.get_singleton(PLUGIN_NAME)
	_plugin.connect("city_state", _on_city_state)
	return true


func available() -> bool:
	return _plugin != null


## Tell the shell a square was touched. It decides what happens next.
func report_cell_touched(cell: Vector2i) -> void:
	if _plugin != null:
		_plugin.cellTouched(cell.x, cell.y)


## Ask for state.
##
## The engine boots asynchronously and outlives any one screen, so the shell has
## no way of knowing when the scene tree exists — pushing a city before this is
## sent lands in nothing at all, which fails silently and looks like an empty
## town.
func announce_ready() -> void:
	if _plugin != null:
		_plugin.sceneReady()


func _on_city_state(json: String) -> void:
	var parsed = JSON.parse_string(json)
	if typeof(parsed) != TYPE_DICTIONARY:
		push_warning("CityBridge: state was not a JSON object")
		return
	city_state_received.emit(parsed)
