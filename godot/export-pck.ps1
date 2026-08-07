# Packs the Godot project into the .pck the Android app ships in its assets.
#
# The app is built by Gradle; Godot only produces the data the embedded engine
# reads. Run this after changing anything under godot/ and before building the
# APK, or the app will render the previous city.
#
# The .pck is a build artifact and is not committed — it is entirely derived
# from this directory.

$ErrorActionPreference = "Stop"

$godot = Join-Path $env:LOCALAPPDATA `
    "Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.1-stable_win64_console.exe"

if (-not (Test-Path $godot)) {
    Write-Output "Godot not found at $godot"
    Write-Output "Install with: winget install --id GodotEngine.GodotEngine --exact"
    exit 1
}

$assets = Join-Path $PSScriptRoot "..\android\app\src\main\assets"
if (-not (Test-Path $assets)) { New-Item -ItemType Directory -Force $assets | Out-Null }

$out = Join-Path $assets "city.pck"

# --import first: a clean checkout has no import cache, and exporting without
# one silently packs source .gltf files the engine cannot read at runtime.
& $godot --headless --path $PSScriptRoot --import
& $godot --headless --path $PSScriptRoot --export-pack "Android" $out

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$size = [math]::Round((Get-Item $out).Length / 1KB)
Write-Output "packed $out ($size KB)"
