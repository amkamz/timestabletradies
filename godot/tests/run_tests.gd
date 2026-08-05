extends SceneTree

## Headless test runner.
##
##     godot --headless --path godot --script tests/run_tests.gd
##
## Exits non-zero on failure so CI can gate on it.

const SUITES := [
	"res://tests/test_city_grid.gd",
	"res://tests/test_iso_camera.gd",
]


func _init() -> void:
	var total_checks := 0
	var failures: Array = []

	for path in SUITES:
		var suite = load(path).new()
		var names: Array = []
		for method in suite.get_method_list():
			if str(method["name"]).begins_with("test_"):
				names.append(str(method["name"]))
		names.sort()

		for name in names:
			suite.failures.clear()
			suite.checks = 0
			suite.call(name)
			total_checks += suite.checks
			if suite.failures.is_empty():
				print("  ok   %s" % name)
			else:
				for failure in suite.failures:
					print("  FAIL %s — %s" % [name, failure])
					failures.append("%s: %s" % [name, failure])

	print("")
	if failures.is_empty():
		print("PASS — %d checks" % total_checks)
		quit(0)
	else:
		print("FAIL — %d of %d checks failed" % [failures.size(), total_checks])
		quit(1)
