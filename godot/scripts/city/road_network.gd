class_name RoadNetwork
extends RefCounted

## Where cars can go, worked out from the grid.
##
## Pure: it is handed the grid and the manifest and produces a graph. Nothing
## here draws, moves or owns a node, which is what lets the whole of traffic be
## reasoned about — and tested — without a scene.
##
## Connections come from the manifest rather than from filenames or geometry
## (see `city_manifest.gd`), so a road shape nobody has thought of yet joins the
## network the moment it declares which edges it connects.

const OPPOSITE := { "n": "s", "s": "n", "e": "w", "w": "e" }
const STEP := {
	"n": Vector2i(0, -1),
	"s": Vector2i(0, 1),
	"e": Vector2i(1, 0),
	"w": Vector2i(-1, 0),
}

## cell -> Array of edge names this cell's road connects at
var _edges: Dictionary = {}

## Cells whose road runs off the edge of the grid, as { cell, edge }.
##
## These are where traffic comes from and goes to. A road that stops dead at the
## boundary would mean cars appearing and vanishing in the middle of nowhere.
var exits: Array = []


func build(grid, manifest) -> void:
	_edges.clear()
	exits.clear()

	for x in range(grid.size):
		for z in range(grid.size):
			var cell := Vector2i(x, z)
			var placement = grid.placement_at(cell)
			if placement == null:
				continue
			if manifest.category_of(str(placement["key"])) != "road":
				continue

			var edges: Array = manifest.connections_of(
				str(placement["key"]), int(placement["rot"])
			)
			_edges[cell] = edges

			for edge in edges:
				if not grid.in_bounds(cell + STEP[edge]):
					exits.append({ "cell": cell, "edge": edge })


func is_road(cell: Vector2i) -> bool:
	return _edges.has(cell)


func edges_at(cell: Vector2i) -> Array:
	return _edges.get(cell, [])


## Where a car at [param cell] can drive, given the way it came in.
##
## Two roads only join if **both** declare the shared edge. A straight road
## beside a corner that turns away from it is not a junction, and treating it as
## one sends cars through kerbs.
func exits_from(cell: Vector2i, arrived_from: String = "") -> Array:
	var out: Array = []
	for edge in edges_at(cell):
		if edge == arrived_from:
			continue
		var neighbour: Vector2i = cell + STEP[edge]
		if _edges.has(neighbour) and _edges[neighbour].has(OPPOSITE[edge]):
			out.append(edge)
		elif not _edges.has(neighbour):
			# Off the grid. Only a real exit if there is nothing there at all —
			# a road pointing at a building is a dead end, not a way out.
			out.append(edge)
	return out


## A route through the network from one edge of the grid to another.
##
## Wandering rather than shortest-path: a car crossing a child's town should
## look like it is going somewhere, not like it is solving it. Returns an empty
## array when there is nowhere to go, which is the normal case for a town with
## one road tile in it.
func route_from(entry: Dictionary, max_steps: int, rng: RandomNumberGenerator) -> Array:
	var cell: Vector2i = entry["cell"]
	if not is_road(cell):
		return []

	var route: Array = [cell]
	var arrived_from: String = entry["edge"]

	for _step in range(max_steps):
		var options := exits_from(cell, arrived_from)
		if options.is_empty():
			break

		var edge: String = options[rng.randi_range(0, options.size() - 1)]
		var next: Vector2i = cell + STEP[edge]
		route.append(next)

		if not is_road(next):
			# Drove off the edge. That is the end of the trip, and the point
			# the car fades out at.
			break

		cell = next
		arrived_from = OPPOSITE[edge]

	return route
