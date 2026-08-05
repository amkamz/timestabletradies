# Runs the Godot test suite headless. Exits non-zero on failure.
#
# The `godot` PATH alias was not created at install time (winget cannot make the
# symlink without admin), so the exe is addressed directly. Use the *console*
# build — the plain one detaches from the console on Windows and prints nothing.

$ErrorActionPreference = "Stop"

$godot = Join-Path $env:LOCALAPPDATA `
    "Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.1-stable_win64_console.exe"

if (-not (Test-Path $godot)) {
    Write-Output "Godot not found at $godot"
    Write-Output "Install with: winget install --id GodotEngine.GodotEngine --exact"
    exit 1
}

& $godot --headless --path $PSScriptRoot --script tests/run_tests.gd
exit $LASTEXITCODE
