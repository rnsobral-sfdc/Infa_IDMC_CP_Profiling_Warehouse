@echo off
REM Enhanced Clean and Publish Script for Windows
REM This script handles full git setup with options for fresh starts and GitHub repo recreation
REM Version 2.0 - Added nuclear option to delete and recreate GitHub repository

echo =========================================
echo IDMC Profiling Extractor
echo Clean and Publish to GitHub (Enhanced)
echo =========================================
echo.

cd /d %~dp0

REM Repository configuration
set GITHUB_USER=rnsobral-sfdc
set REPO_NAME=Infa_IDMC_CP_Profiling_Warehouse
set REPO_URL=https://github.com/%GITHUB_USER%/%REPO_NAME%.git

echo FRESH START OPTIONS:
echo ====================
echo 1. Normal update (keep git history, regular push)
echo 2. Force push (keep local history, force push to remote)
echo 3. Fresh local start (delete .git, reinitialize, force push)
echo 4. NUCLEAR with gh CLI: Delete GitHub repo and recreate (requires gh CLI)
echo 5. TRUE NUCLEAR: Delete .git, commit EVERYTHING fresh, force push
echo.
set /p START_OPTION="Choose option (1/2/3/4/5) [default: 1]: "
if "%START_OPTION%"=="" set START_OPTION=1

if not "%START_OPTION%"=="1" if not "%START_OPTION%"=="2" if not "%START_OPTION%"=="3" if not "%START_OPTION%"=="4" if not "%START_OPTION%"=="5" (
    echo Invalid option. Exiting.
    pause
    exit /b 1
)

REM TRUE NUCLEAR OPTION (Option 5)
set TRUE_NUCLEAR=false
if "%START_OPTION%"=="5" (
    echo.
    echo TRUE NUCLEAR OPTION
    echo ==========================================
    echo This will:
    echo   1. DELETE all local git history (.git folder^)
    echo   2. CLEAN all sensitive files (.env, .db, .log^)
    echo   3. CREATE brand new git repository
    echo   4. COMMIT EVERYTHING as initial commit
    echo   5. FORCE PUSH to GitHub (overwrites all commits^)
    echo.
    echo You will PERMANENTLY LOSE:
    echo   - All local git history
    echo   - All commit history on GitHub
    echo   - Issues/PRs/Stars remain but commit history is replaced
    echo.
    set /p NUCLEAR_CONFIRM="Type 'NUCLEAR NOW' exactly to confirm: "

    if not "!NUCLEAR_CONFIRM!"=="NUCLEAR NOW" (
        echo Nuclear option cancelled. No changes made.
        pause
        exit /b 0
    )
    set TRUE_NUCLEAR=true
    echo.
    echo Nuclear mode confirmed. Proceeding...
)

REM Nuclear option confirmation (Option 4 - requires gh CLI)
set NUCLEAR_MODE=false
if "%START_OPTION%"=="4" (
    echo.
    echo WARNING: NUCLEAR OPTION SELECTED
    echo ==========================================
    echo This will:
    echo   1. Delete the GitHub repository COMPLETELY
    echo   2. Recreate it as a brand new empty repository
    echo   3. Delete local .git folder
    echo   4. Initialize fresh git repository
    echo   5. Push your code as the first commit
    echo.
    echo You will PERMANENTLY LOSE:
    echo   - All commit history
    echo   - All issues and pull requests
    echo   - All stars, forks, and watchers
    echo   - All GitHub discussions and wiki
    echo   - All GitHub Actions workflows history
    echo   - All releases and tags
    echo.
    echo This cannot be undone!
    echo.
    set /p NUCLEAR_CONFIRM="Type 'DELETE AND RECREATE' exactly to confirm: "

    if not "!NUCLEAR_CONFIRM!"=="DELETE AND RECREATE" (
        echo Nuclear option cancelled. No changes made.
        pause
        exit /b 0
    )
    set NUCLEAR_MODE=true
    echo.
    echo Nuclear mode confirmed. Proceeding with caution...
)

echo.
echo Step 1: Stopping servers check...
echo Please ensure backend and frontend servers are stopped (Ctrl+C in their terminals^)
echo.
set /p CONTINUE="Have you stopped the servers? (y/N): "
if /i not "%CONTINUE%"=="y" (
    echo Please stop the servers first, then run this script again.
    pause
    exit /b 0
)

echo.
echo Step 2: Cleaning sensitive data...
echo.

REM Remove .env file (contains real encryption key)
if exist .env (
    echo WARNING: Found .env file with real credentials
    del /f /q .env
    echo OK - Removed .env file
) else (
    echo OK - No .env file found (good!^)
)

REM Remove database files
if exist backend\idmc_profiling.db (
    del /f /q backend\idmc_profiling.db
    echo OK - Removed backend\idmc_profiling.db
)
del /f /q backend\idmc_profiling.db-journal 2>nul
if exist backend\profiling.db (
    del /f /q backend\profiling.db
    echo OK - Removed backend\profiling.db
)
if exist idmc_profiling.db (
    del /f /q idmc_profiling.db
    echo OK - Removed idmc_profiling.db
)

REM Remove log files
del /f /q *.log 2>nul
del /f /q backend\*.log 2>nul
echo OK - Removed log files

REM Remove environment files with real credentials
del /f /q backend\.env 2>nul
del /f /q frontend\.env.local 2>nul
echo OK - Sensitive files cleaned

echo.
echo Step 3: Verifying .gitignore protection...
findstr /C:"*.db" .gitignore >nul
set DB_CHECK=%ERRORLEVEL%
findstr /C:".env" .gitignore >nul
set ENV_CHECK=%ERRORLEVEL%
findstr /C:"*.log" .gitignore >nul
set LOG_CHECK=%ERRORLEVEL%

if %DB_CHECK% EQU 0 if %ENV_CHECK% EQU 0 if %LOG_CHECK% EQU 0 (
    echo OK - Database files, .env, and logs are excluded
) else (
    echo WARNING - Some sensitive patterns may be missing from .gitignore!
    pause
)

REM TRUE NUCLEAR OPTION: Complete fresh start
if "%TRUE_NUCLEAR%"=="true" (
    echo.
    echo Step 4: TRUE NUCLEAR MODE - Complete Fresh Start...
    echo.

    echo Deleting ALL git history...
    rd /s /q .git 2>nul
    echo OK - .git folder deleted

    echo.
    echo Initializing fresh git repository...
    git init
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to initialize git repository
        pause
        exit /b 1
    )
    git branch -M main
    echo OK - Fresh git repository created

    echo.
    echo Adding remote...
    git remote add origin "%REPO_URL%"
    echo OK - Remote added

    echo.
    echo Staging EVERYTHING...
    git add -A
    echo OK - All files staged

    echo.
    echo Reviewing what will be committed...
    echo ==========================================
    git status
    echo.
    echo Total files to commit:
    for /f %%i in ('git ls-files ^| find /c /v ""') do set TOTAL_FILES=%%i
    echo %TOTAL_FILES%
    echo ==========================================
    echo.

    echo Files that should NOT appear above:
    echo   - .env or .env.local
    echo   - *.db files
    echo   - *.log files
    echo.

    set /p REVIEW="Does everything look correct? (y/N): "
    if /i not "%REVIEW%"=="y" (
        echo Cancelled. No changes committed.
        pause
        exit /b 0
    )

    echo.
    echo Creating initial commit...
    git commit -m "Initial commit: Fresh start with Apache License 2.0" -m "Complete project structure with:" -m "- Backend API (FastAPI + SQLAlchemy)" -m "- Frontend UI (Next.js + Fluent UI)" -m "- Database schema (SQLite/PostgreSQL)" -m "- IDMC profiling integration" -m "- Star schema data warehouse" -m "- Apache License 2.0" -m "- Educational use only"

    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to create commit
        pause
        exit /b 1
    )
    echo OK - Initial commit created

    echo.
    echo FINAL CONFIRMATION
    echo About to FORCE PUSH to GitHub.
    echo This will OVERWRITE everything on GitHub.
    echo.
    set /p PUSH_CONFIRM="Type 'PUSH NOW' to continue: "

    if not "%PUSH_CONFIRM%"=="PUSH NOW" (
        echo Push cancelled. Repository is ready locally.
        echo You can push manually with: git push -u origin main --force
        pause
        exit /b 0
    )

    echo.
    echo Force pushing to GitHub...
    git push -u origin main --force

    if %ERRORLEVEL% EQU 0 (
        echo.
        echo =========================================
        echo SUCCESS! TRUE NUCLEAR COMPLETE
        echo =========================================
        echo.
        echo Repository URL:
        echo https://github.com/%GITHUB_USER%/%REPO_NAME%
        echo.
        echo What happened:
        echo OK - All old git history deleted
        echo OK - Fresh repository created
        echo OK - All current files committed as initial commit
        echo OK - Force pushed to GitHub (overwrote everything^)
        echo.
        echo Your repository is now completely fresh!
    ) else (
        echo.
        echo Push failed!
        echo Use your Personal Access Token, not password
        echo Create at: https://github.com/settings/tokens
        pause
        exit /b 1
    )

    pause
    exit /b 0
)

REM Nuclear option: Delete and recreate GitHub repository (requires gh CLI)
if "%NUCLEAR_MODE%"=="true" (
    echo.
    echo Step 4: NUCLEAR MODE - Deleting GitHub repository...
    echo.

    REM Check if gh CLI is installed
    where gh >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: GitHub CLI (gh^) is not installed.
        echo.
        echo To use nuclear mode, you need to install GitHub CLI:
        echo   Windows: winget install GitHub.cli
        echo   Or download from: https://cli.github.com/
        echo.
        echo Alternatively, you can:
        echo   1. Manually delete the repo at: https://github.com/%GITHUB_USER%/%REPO_NAME%/settings
        echo   2. Manually create a new empty repo with the same name
        echo   3. Run this script again with option 3
        pause
        exit /b 1
    )

    REM Check if logged in to GitHub CLI
    gh auth status >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo GitHub CLI is not authenticated.
        echo Please login first:
        echo.
        gh auth login

        gh auth status >nul 2>&1
        if %ERRORLEVEL% NEQ 0 (
            echo ERROR: Authentication failed. Exiting.
            pause
            exit /b 1
        )
    )

    echo Deleting repository %GITHUB_USER%/%REPO_NAME%...
    gh repo delete "%GITHUB_USER%/%REPO_NAME%" --yes

    if %ERRORLEVEL% NEQ 0 (
        echo Warning: Failed to delete repository (it may not exist or you lack permissions^)
        echo Continuing anyway...
    ) else (
        echo OK - Repository deleted from GitHub
    )

    echo.
    echo Creating new empty repository...
    gh repo create "%GITHUB_USER%/%REPO_NAME%" --public --description "IDMC Cloud Profiling Data Warehouse - Educational use only" --confirm

    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to create repository
        pause
        exit /b 1
    )

    echo OK - New repository created

    echo.
    echo Deleting local .git folder...
    rd /s /q .git 2>nul
    echo OK - Local git history deleted

    REM Force option 3 behavior for the rest
    set START_OPTION=3
)

echo.
echo Step 4: Git repository setup...
echo.

REM Fresh start option
if "%START_OPTION%"=="3" (
    if exist .git (
        if not "%NUCLEAR_MODE%"=="true" (
            echo Deleting .git folder for fresh start...
            rd /s /q .git
            echo OK - Local .git removed
        )
    )

    echo Initializing new Git repository...
    git init
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Failed to initialize git repository
        pause
        exit /b 1
    )
    echo OK - Git initialized

    git branch -M main
    git remote add origin "%REPO_URL%"
    echo OK - Remote configured

) else (
    if exist .git (
        echo OK - Git repository already initialized
    ) else (
        echo Initializing new Git repository...
        git init
        if %ERRORLEVEL% NEQ 0 (
            echo ERROR: Failed to initialize git repository
            pause
            exit /b 1
        )
        echo OK - Git initialized
        git branch -M main
    )
)

echo.
echo Step 5: Configuring remote repository...
echo Repository: %REPO_URL%
echo.

REM Check if remote 'origin' exists (skip if fresh start)
if not "%START_OPTION%"=="3" if not "%NUCLEAR_MODE%"=="true" (
    git remote get-url origin >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo Remote 'origin' already exists. Checking URL...
        for /f "delims=" %%i in ('git remote get-url origin') do set CURRENT_URL=%%i
        echo Current URL: !CURRENT_URL!

        if "!CURRENT_URL!"=="%REPO_URL%" (
            echo OK - Remote URL is correct
        ) else (
            echo Updating remote URL...
            git remote set-url origin "%REPO_URL%"
            echo OK - Remote URL updated
        )
    ) else (
        echo Adding remote repository...
        git remote add origin "%REPO_URL%"
        if %ERRORLEVEL% NEQ 0 (
            echo ERROR: Failed to add remote repository
            pause
            exit /b 1
        )
        echo OK - Remote added
    )
)

REM Verify remote
echo.
echo Verifying remote configuration:
git remote -v

echo.
echo Step 6: Staging all changes...
git add .
echo OK - All changes staged

echo.
echo Step 7: Reviewing what will be committed...
echo.
echo ==========================================
git status
echo ==========================================
echo.

echo Files that should NOT appear above:
echo   - idmc_profiling.db (or any .db files^)
echo   - .env or .env.local
echo   - venv/ or node_modules/
echo   - *.log files
echo.

set /p REVIEW="Does everything look correct? (y/N): "
if /i not "%REVIEW%"=="y" (
    echo.
    echo Cancelled. No changes committed.
    echo You can review the changes with: git status
    pause
    exit /b 0
)

echo.
echo Step 8: Creating commit...

if "%NUCLEAR_MODE%"=="true" (
    set COMMIT_MSG=Initial commit: Fresh start with Apache License 2.0
) else (
    set COMMIT_MSG=Update: Apache License 2.0 with educational disclaimer
)

git commit -m "%COMMIT_MSG%" -m "- Added educational use only disclaimer to README" -m "- Changed from MIT to Apache License 2.0" -m "- Added Salesforce liability disclaimer" -m "- Updated documentation" -m "- Cleaned sensitive data from repository"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo NOTE: Nothing to commit in working tree

    REM Check if we have existing commits
    git log -1 >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo OK - Local repository has existing commits
        echo Proceeding to push...
    ) else (
        echo ERROR: No commits to push
        pause
        exit /b 1
    )
) else (
    echo OK - Commit created
)

echo.
echo Step 9: Pushing to GitHub...
echo.

REM Determine push strategy
if "%START_OPTION%"=="1" (
    echo Using normal push...
    git push -u origin main
) else (
    echo Using force push...
    git push -u origin main --force
)

if %ERRORLEVEL% EQU 0 (
    echo.
    echo =========================================
    echo SUCCESS! Repository published to GitHub
    echo =========================================
    echo.
    echo View your repository at:
    echo https://github.com/%GITHUB_USER%/%REPO_NAME%
    echo.

    if "%NUCLEAR_MODE%"=="true" (
        echo NUCLEAR MODE COMPLETE
        echo Repository was completely recreated from scratch
        echo.
    )

    echo Next steps:
    echo 1. Visit the repository and verify it looks correct
    echo 2. Check that LICENSE shows Apache 2.0
    echo 3. Verify README shows the disclaimer
    echo 4. Confirm no database or .env files are visible
    echo 5. Add topics/tags to your repository (optional^)
    echo.
) else (
    echo.
    echo =========================================
    echo Push failed - Common issues:
    echo =========================================
    echo.
    echo 1. Authentication failed
    echo    - Use your PAT (Personal Access Token^), not password
    echo    - Create PAT at: https://github.com/settings/tokens
    echo.
    echo 2. Repository not found
    echo    - Ensure repository exists
    echo    - Check you're logged into correct GitHub account
    echo.
    echo 3. Remote contains work you don't have
    echo    - Try option 2 (force push^) or option 3 (fresh start^)
    echo.
    echo 4. Network/firewall issues
    echo    - Check your internet connection
    echo    - Verify you can access github.com
    echo.
    pause
    exit /b 1
)

pause
