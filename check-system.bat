@echo off
title System Diagnostics - MEC DOORS
color 0E
chcp 65001 >nul

echo ========================================
echo    System Diagnostics - MEC DOORS
echo ========================================
echo.

echo Computer: %COMPUTERNAME%
echo User: %USERNAME%
echo Current Directory: %~dp0
echo.

REM Check project structure
echo Checking project structure...
if exist "src\main.tsx" (
    echo [OK] Found src\main.tsx in current directory
    set PROJECT_OK=1
    set PROJECT_DIR=%~dp0
) else if exist "project\src\main.tsx" (
    echo [OK] Found project\src\main.tsx in subdirectory
    set PROJECT_OK=1
    set PROJECT_DIR=%~dp0project
) else (
    echo [X] Project files not found
    echo     Looking for src\main.tsx
    set PROJECT_OK=0
)

if exist "package.json" (
    echo [OK] Found package.json in current directory
) else if exist "project\package.json" (
    echo [OK] Found project\package.json in subdirectory
) else (
    echo [X] package.json not found
)

REM Check Node.js
echo.
echo Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo [X] Node.js: NOT INSTALLED
    echo     Download from: https://nodejs.org
) else (
    for /f "tokens=*" %%i in ('node --version') do echo [OK] Node.js: %%i
)

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo [X] npm: NOT AVAILABLE
) else (
    for /f "tokens=*" %%i in ('npm --version') do echo [OK] npm: %%i
)

REM Check dependencies
echo.
echo Checking dependencies...
if exist "node_modules" (
    echo [OK] Dependencies installed in current directory
) else if exist "project\node_modules" (
    echo [OK] Dependencies installed in project subdirectory
) else (
    echo [X] Dependencies: NOT INSTALLED
    echo     Run install.bat to fix this
)

REM Check if port 5173 is in use
echo.
echo Checking port availability...
netstat -an | find "5173" | find "LISTENING" >nul
if not errorlevel 1 (
    echo [!] Port 5173 is currently in use
    echo     The application might already be running
    echo     Check Task Manager for node.exe processes
) else (
    echo [OK] Port 5173 is available
)

REM Check for running node processes
echo.
echo Checking for running Node.js processes...
tasklist | find "node.exe" >nul
if not errorlevel 1 (
    echo [!] Node.js processes are running:
    tasklist | find "node.exe"
    echo.
    echo If the application is stuck, you may need to:
    echo 1. Close all browser tabs with localhost:5173
    echo 2. End node.exe processes in Task Manager
    echo 3. Restart the application
) else (
    echo [OK] No Node.js processes running
)

REM Check browser availability
echo.
echo Checking available browsers...
where chrome >nul 2>&1
if not errorlevel 1 (
    echo [OK] Google Chrome found
) else (
    echo [!] Google Chrome not found in PATH
)

where firefox >nul 2>&1
if not errorlevel 1 (
    echo [OK] Mozilla Firefox found
) else (
    echo [!] Mozilla Firefox not found in PATH
)

where msedge >nul 2>&1
if not errorlevel 1 (
    echo [OK] Microsoft Edge found
) else (
    echo [!] Microsoft Edge not found in PATH
)

echo.
echo ========================================
echo         Recommendations
echo ========================================
echo.

if %PROJECT_OK%==0 (
    echo 1. Make sure project files are in correct location
    echo    - src\main.tsx should exist
    echo    - package.json should exist
    echo.
)

node --version >nul 2>&1
if errorlevel 1 (
    echo 2. Install Node.js from https://nodejs.org
    echo    - Choose LTS version
    echo    - Restart computer after installation
    echo.
)

if not exist "node_modules" if not exist "project\node_modules" (
    echo 3. Install dependencies by running install.bat
    echo.
)

netstat -an | find "5173" | find "LISTENING" >nul
if not errorlevel 1 (
    echo 4. If application is stuck:
    echo    - Close browser tabs with localhost:5173
    echo    - End node.exe processes in Task Manager
    echo    - Run quick.bat again
    echo.
)

echo 5. For best results:
echo    - Use quick.bat for normal startup
echo    - Use start-simple.bat if quick.bat has issues
echo    - Use install.bat if dependencies are missing
echo.

echo ========================================
echo          System Check Complete
echo ========================================
echo.
pause