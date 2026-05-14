#!/bin/bash
# Script to publish IDMC Profiling Extractor to GitHub
# Run this from the project root directory

echo "========================================="
echo "IDMC Profiling Extractor - GitHub Setup"
echo "========================================="
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Error: Git is not installed. Please install Git first."
    exit 1
fi

echo "✅ Git is installed"
echo ""

# Check if already initialized
if [ -d ".git" ]; then
    echo "⚠️  Git repository already initialized"
    echo ""
    read -p "Do you want to reinitialize? This will remove existing git history (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf .git
        echo "✅ Removed existing .git directory"
    else
        echo "Keeping existing repository"
    fi
fi

# Initialize git if needed
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    echo "✅ Git repository initialized"
    echo ""
fi

# Get GitHub username
echo "Please enter your GitHub username:"
read -p "Username: " GITHUB_USER

if [ -z "$GITHUB_USER" ]; then
    echo "❌ Error: GitHub username cannot be empty"
    exit 1
fi

# Get repository name
echo ""
echo "Please enter repository name (default: idmc-profiling-extractor):"
read -p "Repository name: " REPO_NAME

if [ -z "$REPO_NAME" ]; then
    REPO_NAME="idmc-profiling-extractor"
fi

echo ""
echo "Repository will be created at: https://github.com/$GITHUB_USER/$REPO_NAME"
echo ""

# Confirm
read -p "Continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 0
fi

# Add all files
echo ""
echo "📝 Adding files to Git..."
git add .

# Show status
echo ""
echo "Files to be committed:"
git status --short

# Create commit
echo ""
echo "💾 Creating commit..."
git commit -m "Initial commit: IDMC Profiling Extractor

- FastAPI backend with star schema database
- Next.js frontend with Fluent UI
- Rule validation metrics with trend charts
- Column quality metrics with drift detection
- Multi-organization support
- Incremental and full sync modes
- Direct BI tool integration (Power BI, Tableau)
- Cross-platform support (Windows, macOS, Linux)
"

echo "✅ Commit created"
echo ""

# Rename branch to main
echo "🌿 Setting up main branch..."
git branch -M main
echo "✅ Main branch ready"
echo ""

# Add remote
REPO_URL="https://github.com/$GITHUB_USER/$REPO_NAME.git"
echo "🔗 Adding remote repository..."
git remote add origin $REPO_URL
echo "✅ Remote added: $REPO_URL"
echo ""

# Instructions for next steps
echo "========================================="
echo "Next Steps:"
echo "========================================="
echo ""
echo "1. Create the repository on GitHub:"
echo "   - Go to: https://github.com/new"
echo "   - Repository name: $REPO_NAME"
echo "   - Description: Data warehouse solution for IDMC profiling data extraction and analysis"
echo "   - Choose Public or Private"
echo "   - DO NOT initialize with README, .gitignore, or license"
echo "   - Click 'Create repository'"
echo ""
echo "2. Push your code:"
echo "   git push -u origin main"
echo ""
echo "3. If you haven't set up authentication:"
echo "   - Create a Personal Access Token (PAT) at:"
echo "     https://github.com/settings/tokens"
echo "   - Use the PAT as your password when pushing"
echo ""
echo "   OR set up SSH keys:"
echo "     ssh-keygen -t ed25519 -C \"your_email@example.com\""
echo "     # Add key to GitHub: Settings → SSH and GPG keys"
echo ""
echo "Alternative: Use GitHub CLI"
echo "   gh repo create $REPO_NAME --public --source=. --push"
echo ""
echo "========================================="
echo "Repository URL: $REPO_URL"
echo "========================================="
