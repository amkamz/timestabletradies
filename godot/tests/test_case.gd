extends RefCounted

## The smallest thing that can fail a build.
##
## Deliberately not GdUnit4 or GUT: those are editor addons, and the whole point
## of this harness is that it runs from `--headless` with nothing installed and
## nothing imported. A test that needs the editor open is a test nobody runs.
##
## Extended by path rather than `class_name`, because global class registration
## depends on a script cache the editor builds and headless may not have.

var failures: Array = []
var checks: int = 0


func check(condition: bool, message: String) -> void:
	checks += 1
	if not condition:
		failures.append(message)


func check_eq(actual, expected, message: String) -> void:
	checks += 1
	if actual != expected:
		failures.append("%s — expected %s, got %s" % [message, str(expected), str(actual)])


func check_false(condition: bool, message: String) -> void:
	check(not condition, message)
