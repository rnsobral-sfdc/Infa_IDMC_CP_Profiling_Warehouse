#!/bin/bash
# Enhanced Clean and Publish Script for macOS/Linux
# This script handles full git setup with options for fresh starts and GitHub repo recreation
# Version 2.0 - Added nuclear option to delete and recreate GitHub repository

echo "========================================="
echo "IDMC Profiling Extractor"
echo "Clean and Publish to GitHub (Enhanced)"
echo "========================================="
echo ""

cd "$(dirname "$0")"

# Repository configuration
GITHUB_USER="rnsobral-sfdc"
REPO_NAME="Infa_IDMC_CP_Profiling_Warehouse"
REPO_URL="https://github.com/${GITHUB_USER}/${REPO_NAME}.git"

echo "FRESH START OPTIONS:"
echo "===================="
echo "1. Normal update (keep git history, regular push)"
echo "2. Force push (keep local history, force push to remote)"
echo "3. Fresh local start (delete .git, reinitialize, force push)"
echo "4. 🔥 NUCLEAR with gh CLI: Delete GitHub repo and recreate (requires gh CLI)"
echo "5. 🔥 TRUE NUCLEAR: Delete .git, commit EVERYTHING fresh, force push"
echo ""
read -p "Choose option (1/2/3/4/5) [default: 1]: " START_OPTION
START_OPTION=${START_OPTION:-1}

if [[ ! "$START_OPTION" =~ ^[12345]$ ]]; then
    echo "Invalid option. Exiting."
    exit 1
fi

# TRUE NUCLEAR OPTION (Option 5)
if [ "$START_OPTION" == "5" ]; then
    echo ""
    echo "🔥🔥🔥 TRUE NUCLEAR OPTION 🔥🔥🔥"
    echo "=========================================="
    echo "This will:"
    echo "  1. DELETE all local git history (.git folder)"
    echo "  2. CLEAN all sensitive files (.env, .db, .log)"
    echo "  3. CREATE brand new git repository"
    echo "  4. COMMIT EVERYTHING as initial commit"
    echo "  5. FORCE PUSH to GitHub (overwrites all commits)"
    echo ""
    echo "You will PERMANENTLY LOSE:"
    echo "  ❌ All local git history"
    echo "  ❌ All commit history on GitHub"
    echo "  ℹ️  Issues/PRs/Stars remain but commit history is replaced"
    echo ""
    read -p "Type 'NUCLEAR NOW' exactly to confirm: " NUCLEAR_CONFIRM
    if [ "$NUCLEAR_CONFIRM" != "NUCLEAR NOW" ]; then
        echo "Nuclear option cancelled. No changes made."
        exit 0
    fi
    TRUE_NUCLEAR=true
    echo ""
    echo "Nuclear mode confirmed. Proceeding..."
else
    TRUE_NUCLEAR=false
fi

# Nuclear option confirmation
if [ "$START_OPTION" == "4" ]; then
    echo ""
    echo "⚠️  WARNING: NUCLEAR OPTION SELECTED ⚠️"
    echo "=========================================="
    echo "This will:"
    echo "  1. Delete the GitHub repository COMPLETELY"
    echo "  2. Recreate it as a brand new empty repository"
    echo "  3. Delete local .git folder"
    echo "  4. Initialize fresh git repository"
    echo "  5. Push your code as the first commit"
    echo ""
    echo "You will PERMANENTLY LOSE:"
    echo "  ❌ All commit history"
    echo "  ❌ All issues and pull requests"
    echo "  ❌ All stars, forks, and watchers"
    echo "  ❌ All GitHub discussions and wiki"
    echo "  ❌ All GitHub Actions workflows history"
    echo "  ❌ All releases and tags"
    echo ""
    echo "This cannot be undone!"
    echo ""
    read -p "Type 'DELETE AND RECREATE' exactly to confirm: " NUCLEAR_CONFIRM
    if [ "$NUCLEAR_CONFIRM" != "DELETE AND RECREATE" ]; then
        echo "Nuclear option cancelled. No changes made."
        exit 0
    fi
    NUCLEAR_MODE=true
    echo ""
    echo "Nuclear mode confirmed. Proceeding with caution..."
else
    NUCLEAR_MODE=false
fi

echo ""
echo "Step 1: Stopping servers check..."
echo "Please ensure backend and frontend servers are stopped (Ctrl+C in their terminals)"
echo ""
read -p "Have you stopped the servers? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please stop the servers first, then run this script again."
    exit 0
fi

echo ""
echo "Step 2: Cleaning sensitive data..."
echo ""

# Remove .env file (contains real encryption key)
if [ -f ".env" ]; then
    echo "⚠️  Found .env file with real credentials"
    rm -f .env
    echo "✓ Removed .env file"
else
    echo "✓ No .env file found (good!)"
fi

# Remove database files
rm -f backend/idmc_profiling.db 2>/dev/null && echo "✓ Removed backend/idmc_profiling.db" || echo "ℹ backend/idmc_profiling.db not found"
rm -f backend/idmc_profiling.db-journal 2>/dev/null
rm -f backend/profiling.db 2>/dev/null && echo "✓ Removed backend/profiling.db" || echo "ℹ backend/profiling.db not found"
rm -f idmc_profiling.db 2>/dev/null && echo "✓ Removed idmc_profiling.db" || echo "ℹ idmc_profiling.db not found"

# Remove log files
rm -f *.log 2>/dev/null && echo "✓ Removed log files" || echo "ℹ No log files in root"
rm -f backend/*.log 2>/dev/null && echo "✓ Removed backend log files" || echo "ℹ No log files in backend"

# Remove environment files with real credentials
rm -f backend/.env 2>/dev/null
rm -f frontend/.env.local 2>/dev/null
echo "✓ Sensitive files cleaned"

echo ""
echo "Step 3: Verifying .gitignore protection..."
if grep -q "*.db" .gitignore && grep -q ".env" .gitignore && grep -q "*.log" .gitignore; then
    echo "✓ Database files, .env, and logs are excluded"
else
    echo "⚠ WARNING - Some sensitive patterns may be missing from .gitignore!"
    read -p "Press Enter to continue or Ctrl+C to abort..."
fi

# TRUE NUCLEAR OPTION: Complete fresh start
if [ "$TRUE_NUCLEAR" = true ]; then
    echo ""
    echo "Step 4: 🔥 TRUE NUCLEAR MODE - Complete Fresh Start..."
    echo ""

    echo "Deleting ALL git history..."
    rm -rf .git
    echo "✓ .git folder deleted"

    echo ""
    echo "Initializing fresh git repository..."
    git init
    if [ $? -ne 0 ]; then
        echo "✗ ERROR: Failed to initialize git repository"
        exit 1
    fi
    git branch -M main
    echo "✓ Fresh git repository created"

    echo ""
    echo "Adding remote..."
    git remote add origin "$REPO_URL"
    echo "✓ Remote added"

    echo ""
    echo "Staging EVERYTHING..."
    git add -A
    echo "✓ All files staged"

    echo ""
    echo "Reviewing what will be committed..."
    echo "=========================================="
    git status
    echo ""
    echo "Total files to commit:"
    git ls-files | wc -l
    echo "=========================================="
    echo ""

    echo "Files that should NOT appear above:"
    echo "  - .env or .env.local"
    echo "  - *.db files"
    echo "  - *.log files"
    echo ""

    read -p "Does everything look correct? (y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled. No changes committed."
        exit 0
    fi

    echo ""
    echo "Creating initial commit..."
    git commit -m "Initial commit: Fresh start with Apache License 2.0" \
               -m "Complete project structure with:" \
               -m "- Backend API (FastAPI + SQLAlchemy)" \
               -m "- Frontend UI (Next.js + Fluent UI)" \
               -m "- Database schema (SQLite/PostgreSQL)" \
               -m "- IDMC profiling integration" \
               -m "- Star schema data warehouse" \
               -m "- Apache License 2.0" \
               -m "- Educational use only"

    if [ $? -ne 0 ]; then
        echo "✗ ERROR: Failed to create commit"
        exit 1
    fi
    echo "✓ Initial commit created"

    echo ""
    echo "⚠️  FINAL CONFIRMATION"
    echo "About to FORCE PUSH to GitHub."
    echo "This will OVERWRITE everything on GitHub."
    echo ""
    read -p "Type 'PUSH NOW' to continue: " PUSH_CONFIRM

    if [ "$PUSH_CONFIRM" != "PUSH NOW" ]; then
        echo "Push cancelled. Repository is ready locally."
        echo "You can push manually with: git push -u origin main --force"
        exit 0
    fi

    echo ""
    echo "Force pushing to GitHub..."
    git push -u origin main --force

    if [ $? -eq 0 ]; then
        echo ""
        echo "========================================="
        echo "✅ SUCCESS! TRUE NUCLEAR COMPLETE"
        echo "========================================="
        echo ""
        echo "Repository URL:"
        echo "https://github.com/${GITHUB_USER}/${REPO_NAME}"
        echo ""
        echo "What happened:"
        echo "✓ All old git history deleted"
        echo "✓ Fresh repository created"
        echo "✓ All current files committed as initial commit"
        echo "✓ Force pushed to GitHub (overwrote everything)"
        echo ""
        echo "Your repository is now completely fresh!"
    else
        echo ""
        echo "❌ Push failed!"
        echo "Use your Personal Access Token, not password"
        echo "Create at: https://github.com/settings/tokens"
        exit 1
    fi

    exit 0
fi

# Nuclear option: Delete and recreate GitHub repository
if [ "$NUCLEAR_MODE" = true ]; then
    echo ""
    echo "Step 4: 🔥 NUCLEAR MODE - Deleting GitHub repository..."
    echo ""

    # Check if gh CLI is installed
    if ! command -v gh &> /dev/null; then
        echo "❌ ERROR: GitHub CLI (gh) is not installed."
        echo ""
        echo "To use nuclear mode, you need to install GitHub CLI:"
        echo "  macOS: brew install gh"
        echo "  Linux: See https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
        echo ""
        echo "Alternatively, you can:"
        echo "  1. Manually delete the repo at: https://github.com/${GITHUB_USER}/${REPO_NAME}/settings"
        echo "  2. Manually create a new empty repo with the same name"
        echo "  3. Run this script again with option 3"
        exit 1
    fi

    # Check if logged in to GitHub CLI
    if ! gh auth status &> /dev/null; then
        echo "GitHub CLI is not authenticated."
        echo "Please login first:"
        echo ""
        gh auth login

        if ! gh auth status &> /dev/null; then
            echo "❌ Authentication failed. Exiting."
            exit 1
        fi
    fi

    echo "Deleting repository ${GITHUB_USER}/${REPO_NAME}..."
    gh repo delete "${GITHUB_USER}/${REPO_NAME}" --yes

    if [ $? -ne 0 ]; then
        echo "⚠️  Warning: Failed to delete repository (it may not exist or you lack permissions)"
        echo "Continuing anyway..."
    else
        echo "✓ Repository deleted from GitHub"
    fi

    echo ""
    echo "Creating new empty repository..."
    gh repo create "${GITHUB_USER}/${REPO_NAME}" --public --description "IDMC Cloud Profiling Data Warehouse - Educational use only" --confirm

    if [ $? -ne 0 ]; then
        echo "❌ ERROR: Failed to create repository"
        exit 1
    fi

    echo "✓ New repository created"

    echo ""
    echo "Deleting local .git folder..."
    rm -rf .git
    echo "✓ Local git history deleted"

    # Force option 3 behavior for the rest
    START_OPTION=3
fi

echo ""
echo "Step 4: Git repository setup..."
echo ""

# Fresh start option
if [ "$START_OPTION" == "3" ] || [ "$NUCLEAR_MODE" = true ]; then
    if [ -d ".git" ] && [ "$NUCLEAR_MODE" != true ]; then
        echo "Deleting .git folder for fresh start..."
        rm -rf .git
        echo "✓ Local .git removed"
    fi

    echo "Initializing new Git repository..."
    git init
    if [ $? -ne 0 ]; then
        echo "✗ ERROR: Failed to initialize git repository"
        exit 1
    fi
    echo "✓ Git initialized"

    git branch -M main
    git remote add origin "$REPO_URL"
    echo "✓ Remote configured"

elif [ -d ".git" ]; then
    echo "✓ Git repository already initialized"
else
    echo "Initializing new Git repository..."
    git init
    if [ $? -ne 0 ]; then
        echo "✗ ERROR: Failed to initialize git repository"
        exit 1
    fi
    echo "✓ Git initialized"
    git branch -M main
fi

echo ""
echo "Step 5: Configuring remote repository..."
echo "Repository: $REPO_URL"
echo ""

# Check if remote 'origin' exists (skip if fresh start)
if [ "$START_OPTION" != "3" ] && [ "$NUCLEAR_MODE" != true ]; then
    if git remote get-url origin &>/dev/null; then
        echo "Remote 'origin' already exists. Checking URL..."
        CURRENT_URL=$(git remote get-url origin)
        echo "Current URL: $CURRENT_URL"

        if [ "$CURRENT_URL" == "$REPO_URL" ]; then
            echo "✓ Remote URL is correct"
        else
            echo "Updating remote URL..."
            git remote set-url origin "$REPO_URL"
            echo "✓ Remote URL updated"
        fi
    else
        echo "Adding remote repository..."
        git remote add origin "$REPO_URL"
        if [ $? -ne 0 ]; then
            echo "✗ ERROR: Failed to add remote repository"
            exit 1
        fi
        echo "✓ Remote added"
    fi
fi

# Verify remote
echo ""
echo "Verifying remote configuration:"
git remote -v

echo ""
echo "Step 6: Staging all changes..."
git add .
echo "✓ All changes staged"

echo ""
echo "Step 7: Reviewing what will be committed..."
echo ""
echo "=========================================="
git status
echo "=========================================="
echo ""

echo "Files that should NOT appear above:"
echo "  - idmc_profiling.db (or any .db files)"
echo "  - .env or .env.local"
echo "  - venv/ or node_modules/"
echo "  - *.log files"
echo ""

read -p "Does everything look correct? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Cancelled. No changes committed."
    echo "You can review the changes with: git status"
    exit 0
fi

echo ""
echo "Step 8: Creating commit..."

if [ "$NUCLEAR_MODE" = true ]; then
    COMMIT_MSG="Initial commit: Fresh start with Apache License 2.0"
else
    COMMIT_MSG="Update: Apache License 2.0 with educational disclaimer"
fi

git commit -m "$COMMIT_MSG" \
           -m "- Added educational use only disclaimer to README" \
           -m "- Changed from MIT to Apache License 2.0" \
           -m "- Added Salesforce liability disclaimer" \
           -m "- Updated documentation" \
           -m "- Cleaned sensitive data from repository"

if [ $? -ne 0 ]; then
    echo ""
    echo "ℹ NOTE: Nothing to commit in working tree"

    # Check if we have existing commits
    if git log -1 >/dev/null 2>&1; then
        echo "✓ Local repository has existing commits"
        echo "Proceeding to push..."
    else
        echo "❌ ERROR: No commits to push"
        exit 1
    fi
else
    echo "✓ Commit created"
fi

echo ""
echo "Step 9: Pushing to GitHub..."
echo ""

# Determine push strategy
if [ "$START_OPTION" == "1" ]; then
    echo "Using normal push..."
    git push -u origin main
elif [ "$START_OPTION" == "2" ] || [ "$START_OPTION" == "3" ] || [ "$NUCLEAR_MODE" = true ]; then
    echo "Using force push..."
    git push -u origin main --force
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✅ SUCCESS! Repository published to GitHub"
    echo "========================================="
    echo ""
    echo "View your repository at:"
    echo "https://github.com/${GITHUB_USER}/${REPO_NAME}"
    echo ""

    if [ "$NUCLEAR_MODE" = true ]; then
        echo "🔥 NUCLEAR MODE COMPLETE 🔥"
        echo "Repository was completely recreated from scratch"
        echo ""
    fi

    echo "Next steps:"
    echo "1. Visit the repository and verify it looks correct"
    echo "2. Check that LICENSE shows Apache 2.0"
    echo "3. Verify README shows the disclaimer"
    echo "4. Confirm no database or .env files are visible"
    echo "5. Add topics/tags to your repository (optional)"
    echo ""
else
    echo ""
    echo "========================================="
    echo "❌ Push failed - Common issues:"
    echo "========================================="
    echo ""
    echo "1. Authentication failed"
    echo "   - Use your PAT (Personal Access Token), not password"
    echo "   - Create PAT at: https://github.com/settings/tokens"
    echo ""
    echo "2. Repository not found"
    echo "   - Ensure repository exists"
    echo "   - Check you're logged into correct GitHub account"
    echo ""
    echo "3. Remote contains work you don't have"
    echo "   - Try option 2 (force push) or option 3 (fresh start)"
    echo ""
    echo "4. Network/firewall issues"
    echo "   - Check your internet connection"
    echo "   - Verify you can access github.com"
    echo ""
    exit 1
fi
