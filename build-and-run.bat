@echo off
:: DO NOT DELETE OR REPLACE THIS FILE DURING FUTURE PROJECT UPDATES.
title Personal AI - Build and Run
cd /d "%~dp0"

echo =====================================================================
echo                    Personal AI - Build and Run
echo =====================================================================
echo.

:: Step 1: Install dependencies
echo [1/4] Installing dependencies (npm install)...
call npm install
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm install failed with error code %errorlevel%.
    pause
    exit /b %errorlevel%
)

:: Step 2: Ensure CommonJS & build project assets
echo.
call npm pkg delete type >nul 2>&1
echo [2/4] Compiling project (npm run build:all)...
call npm run build:all
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm run build:all failed with error code %errorlevel%.
    pause
    exit /b %errorlevel%
)

:: Step 3: Package Windows application
echo.
echo [3/4] Packaging Windows application (npm run package:win)...
call npm run package:win
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] npm run package:win failed with error code %errorlevel%.
    pause
    exit /b %errorlevel%
)

:: Step 4: Verify and launch Personal AI Portable
echo.
echo [4/4] Verifying packaged application...
if exist "release\Personal AI Portable.exe" (
    echo Found "release\Personal AI Portable.exe".
    echo Launching Personal AI Portable...
    start "" "release\Personal AI Portable.exe"
) else (
    echo.
    echo [ERROR] Executable "release\Personal AI Portable.exe" was not found in release folder.
    pause
    exit /b 1
)

echo.
echo Process completed successfully.
exit /b 0
