# Build the debug APK and push it to an attached device.
#
#   .\install.ps1
#
# Requires: USB debugging on, phone plugged in, and the "Allow USB debugging?"
# prompt accepted on the handset.

$ErrorActionPreference = "Stop"

$env:JAVA_HOME = "C:\Program Files\Java\jdk-17"
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

Push-Location $here
try {
    Write-Host "Building..." -ForegroundColor Cyan
    & .\gradlew.bat :app:assembleDebug
    if ($LASTEXITCODE -ne 0) { throw "Gradle build failed" }

    $apk = Join-Path $here "app\build\outputs\apk\debug\app-debug.apk"
    if (-not (Test-Path $apk)) { throw "APK not found at $apk" }

    $devices = & $adb devices | Where-Object { $_ -match "\tdevice$" }
    if (-not $devices) {
        Write-Host ""
        Write-Host "No device detected." -ForegroundColor Yellow
        Write-Host "  1. Settings > About phone > tap 'Build number' seven times"
        Write-Host "  2. Settings > System > Developer options > USB debugging ON"
        Write-Host "  3. Plug in over USB and accept the prompt on the handset"
        Write-Host ""
        Write-Host "APK is ready to sideload manually:" -ForegroundColor Green
        Write-Host "  $apk"
        exit 1
    }

    Write-Host "Installing..." -ForegroundColor Cyan
    & $adb install -r $apk
    if ($LASTEXITCODE -ne 0) { throw "adb install failed" }

    & $adb shell monkey -p com.timestabletradies.debug -c android.intent.category.LAUNCHER 1 | Out-Null
    Write-Host "Installed and launched." -ForegroundColor Green
}
finally {
    Pop-Location
}
