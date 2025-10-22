@echo off
echo PostgreSQL Reset Script for Windows
echo ====================================

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python first
    pause
    exit /b 1
)

REM Check if psycopg2 is installed
python -c "import psycopg2" >nul 2>&1
if errorlevel 1 (
    echo Installing psycopg2-binary...
    pip install psycopg2-binary
)

REM Run the Python script
echo Running PostgreSQL reset script...
python "%~dp0postgres-reset.py"

if errorlevel 1 (
    echo.
    echo Reset failed. Please check the error messages above.
) else (
    echo.
    echo Reset completed successfully!
    echo You can now use these credentials:
    echo   Host: localhost
    echo   User: postgres
    echo   Password: 1
)

pause