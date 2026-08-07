class_name SampleCity
extends RefCounted

## A city to look at before there is a child to build one.
##
## Exists so the renderer, the camera and the manifest can be judged against
## something with a road through it rather than an empty plane — and so a
## regression in any of the three is visible in one screenshot.
##
## Deliberately hand-laid rather than generated. A random arrangement would be a
## worse test: the point is that *this* layout should look like *this* every
## time, so a tile that starts pointing the wrong way is obvious immediately.

const CityGridScript = preload("res://scripts/city/city_grid.gd")

## A crossroads through the middle, buildings in the four blocks.
##
##     B B R B B        R  road, running north-south
##     B P R B B        J  junction
##     R R J R R        B  building
##     B B R P B        P  prop
##     B B R B B
const LAYOUT := [
	["building_A", "building_B", "road", "building_C", "building_D"],
	["building_E", "bush", "road", "building_F", "building_G"],
	["road_ew", "road_ew", "road_junction", "road_ew", "road_ew"],
	["building_H", "building_A", "road", "watertower", "building_B"],
	["building_C", "building_D", "road", "building_E", "building_F"],
]


## Builds the grid above. Rows are laid out north to south, so `LAYOUT[0]` is
## the far edge and reading the constant top to bottom matches looking at the
## city from the default camera angle.
static func build():
	var grid = CityGridScript.new()

	for z in range(LAYOUT.size()):
		var row: Array = LAYOUT[z]
		for x in range(row.size()):
			var token := str(row[x])
			var key := token
			var rotation := 0

			# The east-west run is the same straight tile, turned a quarter.
			# One authored shape, four orientations — see the contract.
			if token == "road":
				key = "road_straight"
			elif token == "road_ew":
				key = "road_straight"
				rotation = 1

			grid.place(key, Vector2i(x, z), Vector2i.ONE, rotation)

	return grid
