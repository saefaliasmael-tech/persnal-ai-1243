@echo off
:: DO NOT DELETE OR REPLACE THIS FILE DURING FUTURE PROJECT UPDATES.
title Personal AI Launcher
cd /d "%~dp0"

if exist "release\Personal AI Portable.exe" (
    echo Launching Personal AI Portable...
    start "" "release\Personal AI Portable.exe"
    exit /b 0
)

if exist "release\win-unpacked\Personal AI.exe" (
    echo Launching Personal AI...
    start "" "release\win-unpacked\Personal AI.exe"
    exit /b 0
)

for %%f in ("release\*.exe") do (
    echo Launching Personal AI (%%f)...
    start "" "%%f"
    exit /b 0
)

echo [ERROR] Personal AI executable was not found.
echo Please run build-and-run.bat first to build and package the application.
pause
exit /b 1
