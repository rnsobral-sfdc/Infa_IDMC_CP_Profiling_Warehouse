# Publishing to GitHub

This guide will help you publish this project to GitHub.

## Prerequisites

1. GitHub account created
2. Git installed on your machine
3. GitHub repository created (can be done via web or CLI)

## Option 1: Via GitHub Web Interface (Recommended for First Time)

### Step 1: Create Repository on GitHub

1. Go to https://github.com/new
2. Enter repository details:
   - **Repository name**: `idmc-profiling-extractor` (or your preferred name)
   - **Description**: "Data warehouse solution for IDMC profiling data extraction and analysis"
   - **Visibility**: Public or Private (your choice)
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
3. Click **Create repository**

### Step 2: Initialize and Push from Your Local Machine

Open terminal/command prompt in the project root directory:

```bash
# Initialize git repository (if not already initialized)
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: IDMC Profiling Extractor"

# Add remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/idmc-profiling-extractor.git

# Verify remote
git remote -v

# Push to GitHub
git branch -M main
git push -u origin main
```

### Step 3: Verify

1. Go to your GitHub repository page
2. You should see all files uploaded
3. README.md should display on the homepage

---

## Option 2: Via GitHub CLI

If you have GitHub CLI installed:

```bash
# Initialize git repository
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit: IDMC Profiling Extractor"

# Create and push to GitHub in one command
gh repo create idmc-profiling-extractor --public --source=. --push

# Or for private repository
gh repo create idmc-profiling-extractor --private --source=. --push
```

---

## Post-Publication Steps

### 1. Add Topics/Tags

On your GitHub repository page:
1. Click ⚙️ (gear icon) next to "About"
2. Add topics: `python`, `fastapi`, `react`, `nextjs`, `informatica`, `data-quality`, `etl`, `star-schema`, `sqlite`, `data-warehouse`
3. Click "Save changes"

### 2. Enable GitHub Pages (Optional)

For documentation hosting:
1. Go to repository Settings → Pages
2. Source: Deploy from a branch
3. Branch: main, folder: /docs
4. Click Save

### 3. Set Up Branch Protection

Recommended settings:
1. Go to Settings → Branches
2. Add branch protection rule for `main`:
   - ☑ Require pull request reviews before merging
   - ☑ Require status checks to pass before merging
   - ☑ Require branches to be up to date before merging

### 4. Create Release

```bash
# Tag the current version
git tag -a v1.0.0 -m "Initial release"
git push origin v1.0.0
```

Then on GitHub:
1. Go to Releases → Draft a new release
2. Choose tag v1.0.0
3. Title: "v1.0.0 - Initial Release"
4. Add release notes highlighting key features
5. Click "Publish release"

---

## Updating the Repository

After making changes:

```bash
# Check status
git status

# Add changed files
git add .

# Or add specific files
git add backend/app/some_file.py

# Commit with descriptive message
git commit -m "feat: add new sync mode for incremental updates"

# Push to GitHub
git push origin main
```

---

## Troubleshooting

### Authentication Issues

If using HTTPS and encountering password issues:
1. Create a Personal Access Token (PAT):
   - Go to GitHub Settings → Developer settings → Personal access tokens
   - Generate new token with `repo` scope
   - Use PAT instead of password

Or use SSH:
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Add to GitHub: Settings → SSH and GPG keys → New SSH key
cat ~/.ssh/id_ed25519.pub

# Change remote to SSH
git remote set-url origin git@github.com:YOUR_USERNAME/idmc-profiling-extractor.git
```

### Large Files

If you have files > 100MB:
1. Add to .gitignore
2. Use Git LFS (Large File Storage):
   ```bash
   git lfs install
   git lfs track "*.db"
   git add .gitattributes
   git commit -m "Add Git LFS"
   ```

### Accidental Sensitive Data

If you committed passwords/keys:
1. **DO NOT** just delete and recommit
2. Use BFG Repo-Cleaner or git-filter-repo
3. Change all exposed credentials immediately
4. Consider repository as compromised

---

## Repository Maintenance

### Regular Tasks

1. **Update Dependencies**:
   ```bash
   # Backend
   pip install --upgrade -r requirements.txt
   pip freeze > requirements.txt
   
   # Frontend
   npm update
   ```

2. **Review Issues and PRs** regularly
3. **Tag Releases** for significant updates
4. **Update Documentation** when features change
5. **Monitor Security Alerts** from GitHub

### Creating Issues Template

Create `.github/ISSUE_TEMPLATE/bug_report.md`:
```markdown
---
name: Bug report
about: Create a report to help us improve
title: '[BUG] '
labels: bug
---

**Describe the bug**
A clear description of the bug.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '...'
3. See error

**Expected behavior**
What you expected to happen.

**Environment:**
 - OS: [e.g. Windows 11]
 - Python Version: [e.g. 3.10.5]
 - Node Version: [e.g. 16.14.0]
```

---

## Sharing Your Repository

Once published, share your repository:
- Add link to your LinkedIn profile
- Share on Reddit (r/dataengineering, r/python)
- Tweet about it
- Add to Awesome Lists
- Blog about your implementation

---

## Need Help?

- GitHub Docs: https://docs.github.com
- Git Basics: https://git-scm.com/book/en/v2
- GitHub CLI: https://cli.github.com/manual/
