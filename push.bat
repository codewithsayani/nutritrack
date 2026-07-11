@echo off
setlocal
echo ==========================================
echo       NutriTrack - Auto Push to GitHub
echo ==========================================
echo.

:: Ensure GitHub CLI path is in the environment just in case
set PATH=%PATH%;C:\Program Files\GitHub CLI

:: Check for Git
git --version >nul 2>&1
if errorlevel 1 (
    echo Error: Git is not installed or not in your PATH.
    pause
    exit /b
)

:: Prompt for a commit message
set /p commit_msg="Enter commit message (or press Enter for 'auto-update'): "
if "%commit_msg%"=="" set commit_msg=auto-update

echo.
echo Adding files...
git add .

echo.
echo Committing changes...
git commit -m "%commit_msg%"

echo.
echo Pushing to GitHub...
git push origin master

echo.
echo ==========================================
if errorlevel 1 (
    echo ❌ Push failed! Please check the errors above.
) else (
    echo ✅ Successfully pushed to GitHub! Vercel will now deploy.
)
echo ==========================================
pause
