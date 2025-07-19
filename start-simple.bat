@echo off
title Simple Start - MEC DOORS
color 0A
chcp 65001 >nul

echo ========================================
echo       Simple Start - MEC DOORS
echo ========================================
echo.

cd /d "%~dp0"

REM Auto-detect project structure
if exist "src\main.tsx" (
    echo Found project files in current directory
) else if exist "project\src\main.tsx" (
    echo Found project files in project subdirectory
    cd project
) else (
    echo ERROR: Cannot find project files!
    echo.
    echo Looking for:
    echo - src\main.tsx in current directory
    echo - project\src\main.tsx in subdirectory
    echo.
    pause
    exit /b 1
)

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    echo.
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies!
        pause
        exit /b 1
    )
)

echo.
echo Starting application...
echo Browser should open automatically at: http://localhost:5173
echo.

REM Wait a moment then open browser
timeout /t 3 /nobreak >nul
start "" "http://localhost:5173"

REM Start the application
npm run dev

pause