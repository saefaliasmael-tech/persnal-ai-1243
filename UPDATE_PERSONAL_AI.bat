@echo off
:: DO NOT DELETE OR REPLACE THIS FILE DURING FUTURE PROJECT UPDATES.
title Personal AI - Project Updater and Builder
cd /d "%~dp0"

echo =====================================================================
echo                Personal AI - Project Update and Build
echo =====================================================================
echo.

:: 1. Install / Update dependencies
echo [1/3] Updating dependencies (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm install failed with error code %errorlevel%.
    pause
    exit /b %errorlevel%
)

:: 2. Ensure Electron CommonJS compatibility (remove "type": "module" if present)
echo.
echo Ensuring Electron CommonJS compatibility...
call npm pkg delete type >nul 2>&1

:: 3. Build frontend and Electron main process
echo.
echo [2/4] Building application assets (npm run build:all)...
call npm run build:all
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm run build:all failed with error code %errorlevel%.
    pause
    exit /b %errorlevel%
)

:: 4. Package Windows desktop application
echo.
echo Ensuring Electron CommonJS compatibility before packaging...
call npm pkg delete type >nul 2>&1
echo [3/4] Packaging Windows executable (npm run package:win)...
call npm run package:win
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm run package:win failed with error code %errorlevel%.
    pause
    exit /b %errorlevel%
)

echo.
if exist "release\Personal AI Portable.exe" (
    echo Build and packaging complete.
    echo Starting Personal AI Portable...
    start "" "release\Personal AI Portable.exe"
) else (
    echo [WARNING] Build finished but "release\Personal AI Portable.exe" was not found.
    pause
)
exit /b 0
