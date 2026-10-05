@echo off
rem Double-click this file (or the desktop shortcut) to launch SummerQuest.
rem It will: 1) cd to the app folder  2) install deps if missing
rem          3) build the game and serve it  4) open your browser to the game.

cd /d "%~dp0"

echo.
echo   SummerQuest launcher
echo   --------------------

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo   [X] Node.js is not installed.
  echo       Install it from https://nodejs.org and try again.
  echo.
  pause
  exit /b 1
)

if not exist "node_modules" (
  echo.
  echo   First run - installing dependencies ^(this takes a minute^)...
  call npm install
)

echo.
echo   Starting SummerQuest at http://localhost:5173
echo   Close this window to stop the game.
echo.

rem Builds, then serves on the same port as before (saved progress carries over).
rem Developers: use "npm run dev" for hot reload.
call npm run play
