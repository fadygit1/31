@echo off
title Kill MEC DOORS Processes
color 0C
chcp 65001 >nul

echo ========================================
echo      Kill MEC DOORS Processes
echo ========================================
echo.

echo This will stop all Node.js processes and free up port 5173
echo.

REM Check for running node processes
tasklist | find "node.exe" >nul
if errorlevel 1 (
    echo No Node.js processes found running.
    echo.
    goto END
)

echo Found running Node.js processes:
tasklist | find "node.exe"
echo.

set /p confirm="Do you want to stop all Node.js processes? (Y/N): "
if /i not "%confirm%"=="Y" (
    echo Operation cancelled.
    goto END
)

echo.
echo Stopping Node.js processes...

REM Kill all node.exe processes
taskkill /f /im node.exe >nul 2>&1
if errorlevel 1 (
    echo Failed to stop some processes. You may need to:
    echo 1. Run this script as Administrator
    echo 2. Manually end processes in Task Manager
) else (
    echo All Node.js processes stopped successfully.
)

echo.
echo Checking port 5173...
netstat -an | find "5173" | find "LISTENING" >nul
if errorlevel 1 (
    echo Port 5173 is now free.
) else (
    echo Port 5173 is still in use. You may need to restart your computer.
)

:END
echo.
echo You can now run quick.bat to start the application.
echo.
pause