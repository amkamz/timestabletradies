# Packs the Godot project into the Android app's assets.
#
# Run this after changing anything under godot/ and before building the APK, or
# the app will render the previous city.
#
# ## Why this exports a whole APK and then throws it away
#
# The obvious approach — `--export-pack` to a .pck, ship that, point the engine
# at it with `--main-pack` — does not work with a stock template:
#
#     ERROR: --main-pack is attempting to load from outside of the executable,
#     but this Godot binary was compiled without support for path overrides.
#
# Export templates are hardened against loading a pack from an arbitrary path.
# The engine will only read its project from inside the APK, and the layout it
# expects is not a pack at all: `res://x` maps to `assets/x` as loose files,
# with `assets/project.binary` as the root marker and `assets/_cl_` carrying the
# command line.
#
# Rather than reproduce that layout by hand, this exports a real Android APK —
# letting Godot's own export plugin decide the layout — and lifts its `assets/`
# directory. The APK itself is discarded; Gradle builds the app.

$ErrorActionPreference = "Stop"

$godot = Join-Path $env:LOCALAPPDATA `
    "Microsoft\WinGet\Packages\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe\Godot_v4.7.1-stable_win64_console.exe"

if (-not (Test-Path $godot)) {
    Write-Output "Godot not found at $godot"
    Write-Output "Install with: winget install --id GodotEngine.GodotEngine --exact"
    exit 1
}

$appAssets = Join-Path $PSScriptRoot "..\android\app\src\main\assets"
$staging = Join-Path ([System.IO.Path]::GetTempPath()) "ttt-godot-export"
$probe = Join-Path $staging "probe.apk"

if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
New-Item -ItemType Directory -Force $staging | Out-Null

# --import first: a clean checkout has no import cache, and exporting without
# one packs the source .gltf files rather than their imported form — which
# produces a project the engine loads and then draws nothing from.
# Godot writes progress and warnings to stderr even on a clean run, and
# PowerShell turns any native stderr into a terminating NativeCommandError under
# `Stop`. The exit code is the thing that actually says whether it worked.
$ErrorActionPreference = "Continue"
& $godot --headless --path $PSScriptRoot --import 2>&1 | Out-Null
& $godot --headless --path $PSScriptRoot --export-debug "Android" $probe 2>&1 |
    Where-Object { $_ -match "ERROR|error:" } | Select-Object -First 10
$exported = $LASTEXITCODE
$ErrorActionPreference = "Stop"

if ($exported -ne 0 -or -not (Test-Path $probe)) {
    Write-Output "Godot export failed (exit $exported)"
    exit 1
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
$extracted = Join-Path $staging "unzipped"
[System.IO.Compression.ZipFile]::ExtractToDirectory($probe, $extracted)

# Replace wholesale. Leaving stale files behind would let a deleted scene keep
# loading, which is a confusing thing to debug on a phone.
if (Test-Path $appAssets) { Remove-Item -Recurse -Force $appAssets }
New-Item -ItemType Directory -Force $appAssets | Out-Null

Copy-Item -Recurse -Force (Join-Path $extracted "assets\*") $appAssets

Remove-Item -Recurse -Force $staging

$count = (Get-ChildItem -Recurse -File $appAssets).Count
$size = [math]::Round(((Get-ChildItem -Recurse -File $appAssets | Measure-Object -Property Length -Sum).Sum) / 1KB)
Write-Output "packed $count files into app assets ($size KB)"
