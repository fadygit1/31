@echo off
title Quick Start - MEC DOORS
color 0C
chcp 65001 >nul

echo ========================================
echo          Quick Start - MEC DOORS
echo ========================================
echo.

cd /d "%~dp0"

REM Quick project detection
if exist "src\main.tsx" (
    echo Starting from current directory...
    set PROJECT_DIR=%~dp0
) else if exist "project\src\main.tsx" (
    echo Starting from project subdirectory...
    set PROJECT_DIR=%~dp0project
    cd project
) else (
    echo ERROR: Project files not found!
    echo.
    echo Looking for:
    echo - src\main.tsx in current directory
    echo - project\src\main.tsx in subdirectory
    echo.
    echo Current directory: %~dp0
    echo.
    pause
    exit /b 1
)

REM Check Node.js
echo Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org
    echo.
    pause
    exit /b 1
)

echo Node.js found: 
node --version

REM Check package.json
if not exist "package.json" (
    echo ERROR: package.json not found in project directory!
    echo Project directory: %PROJECT_DIR%
    echo.
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    echo This may take 2-5 minutes...
    echo.
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies!
        echo.
        pause
        exit /b 1
    )
    echo Dependencies installed successfully!
    echo.
)

echo.
echo ========================================
echo        STARTING MEC DOORS SYSTEM
echo ========================================
echo.
echo Browser will open automatically at:
echo http://localhost:5173
echo.
echo WARNING: Do not close this window while using the app!
echo.

REM Check if port 5173 is already in use
netstat -an | find "5173" | find "LISTENING" >nul
if not errorlevel 1 (
    echo.
    echo WARNING: Port 5173 is already in use!
    echo The application might already be running.
    echo.
    echo Choose an option:
    echo 1. Continue anyway (may cause conflicts)
    echo 2. Exit and check running applications
    echo.
    set /p choice="Enter your choice (1 or 2): "
    
    if "!choice!"=="2" (
        echo.
        echo Please check if the application is already running
        echo and close it before starting again.
        echo.
        pause
        exit /b 1
    )
    
    echo Continuing with existing setup...
    echo.
)

REM Create a flag file to prevent multiple browser openings
set BROWSER_FLAG=%TEMP%\mec_doors_browser_opened.tmp

REM Remove old flag file if exists
if exist "%BROWSER_FLAG%" del "%BROWSER_FLAG%"

REM Start the development server in background
echo Starting development server...
start /B npm run dev

REM Wait for server to start and open browser only once
echo Waiting for server to start...
timeout /t 5 /nobreak >nul

REM Check if server is responding before opening browser
:CHECK_SERVER
echo Checking if server is ready...
curl -s http://localhost:5173 >nul 2>&1
if errorlevel 1 (
    echo Server not ready yet, waiting...
    timeout /t 2 /nobreak >nul
    goto CHECK_SERVER
)

REM Open browser only if flag file doesn't exist
if not exist "%BROWSER_FLAG%" (
    echo Server is ready! Opening browser...
    echo. > "%BROWSER_FLAG%"
    
    REM Try different browsers in order of preference
    start "" "http://localhost:5173" 2>nul || (
        start chrome "http://localhost:5173" 2>nul || (
            start firefox "http://localhost:5173" 2>nul || (
                start msedge "http://localhost:5173" 2>nul || (
                    echo Could not open browser automatically.
                    echo Please open your browser and go to: http://localhost:5173
                )
            )
        )
    )
) else (
    echo Browser already opened, skipping...
)

echo.
echo ========================================
echo     APPLICATION IS NOW RUNNING
echo ========================================
echo.
echo The application is running at: http://localhost:5173
echo.
echo To stop the application:
echo - Close this window, or
echo - Press Ctrl+C
echo.
echo Logs will appear below:
echo ----------------------------------------
echo.

REM Wait for the npm process to finish (keeps window open)
:WAIT_LOOP
timeout /t 5 /nobreak >nul
tasklist | find "node.exe" >nul
if not errorlevel 1 (
    goto WAIT_LOOP
)

REM Cleanup
if exist "%BROWSER_FLAG%" del "%BROWSER_FLAG%"

echo.
echo Application stopped.
pause