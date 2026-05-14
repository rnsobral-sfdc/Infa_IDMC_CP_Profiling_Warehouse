@echo off
REM Script to publish IDMC Profiling Extractor to GitHub (Windows)
REM Run this from the project root directory

echo =========================================
echo IDMC Profiling Extractor - GitHub Setup
echo =========================================
echo.

REM Check if git is installed
where git >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Error: Git is not installed. Please install Git first.
    pause
    exit /b 1
)

echo Git is installed
echo.

REM Check if already initialized
if exist ".git" (
    echo Warning: Git repository already initialized
    echo.
    set /p REINIT="Do you want to reinitialize? This will remove existing git history (y/N): "
    if /i "%REINIT%"=="y" (
        rmdir /s /q .git
        echo Removed existing .git directory
    ) else (
        echo Keeping existing repository
    )
)

REM Initialize git if needed
if not exist ".git" (
    echo Initializing Git repository...
    git init
    echo Git repository initialized
    echo.
)

REM Get GitHub username
echo Please enter your GitHub username:
set /p GITHUB_USER="Username: "

if "%GITHUB_USER%"=="" (
    echo Error: GitHub username cannot be empty
    pause
    exit /b 1
)

REM Get repository name
echo.
echo Please enter repository name (default: idmc-profiling-extractor):
set /p REPO_NAME="Repository name: "

if "%REPO_NAME%"=="" (
    set REPO_NAME=idmc-profiling-extractor
)

echo.
echo Repository will be created at: https://github.com/%GITHUB_USER%/%REPO_NAME%
echo.

REM Confirm
set /p CONTINUE="Continue? (y/N): "
if /i not "%CONTINUE%"=="y" (
    echo Cancelled
    pause
    exit /b 0
)

REM Add all files
echo.
echo Adding files to Git...
git add .

REM Show status
echo.
echo Files to be committed:
git status --short

REM Create commit
echo.
echo Creating commit...
git commit -m "Initial commit: IDMC Profiling Extractor" -m "- FastAPI backend with star schema database" -m "- Next.js frontend with Fluent UI" -m "- Rule validation metrics with trend charts" -m "- Column quality metrics with drift detection" -m "- Multi-organization support" -m "- Incremental and full sync modes" -m "- Direct BI tool integration (Power BI, Tableau)" -m "- Cross-platform support (Windows, macOS, Linux)"

echo Commit created
echo.

REM Rename branch to main
echo Setting up main branch...
git branch -M main
echo Main branch ready
echo.

REM Add remote
set REPO_URL=https://github.com/%GITHUB_USER%/%REPO_NAME%.git
echo Adding remote repository...
git remote add origin %REPO_URL%
echo Remote added: %REPO_URL%
echo.

REM Instructions for next steps
echo =========================================
echo Next Steps:
echo =========================================
echo.
echo 1. Create the repository on GitHub:
echo    - Go to: https://github.com/new
echo    - Repository name: %REPO_NAME%
echo    - Description: Data warehouse solution for IDMC profiling data extraction and analysis
echo    - Choose Public or Private
echo    - DO NOT initialize with README, .gitignore, or license
echo    - Click 'Create repository'
echo.
echo 2. Push your code:
echo    git push -u origin main
echo.
echo 3. If you haven't set up authentication:
echo    - Create a Personal Access Token (PAT) at:
echo      https://github.com/settings/tokens
echo    - Use the PAT as your password when pushing
echo.
echo    OR set up SSH keys:
echo      ssh-keygen -t ed25519 -C "your_email@example.com"
echo      # Add key to GitHub: Settings - SSH and GPG keys
echo.
echo Alternative: Use GitHub CLI
echo    gh repo create %REPO_NAME% --public --source=. --push
echo.
echo =========================================
echo Repository URL: %REPO_URL%
echo =========================================
echo.
pause
