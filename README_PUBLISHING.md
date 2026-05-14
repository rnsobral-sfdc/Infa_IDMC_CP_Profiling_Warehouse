# Publishing Instructions - Complete Guide

This document provides complete instructions for publishing the IDMC Profiling Extractor to GitHub with Apache License 2.0 and educational disclaimer.

## 📋 What's Been Prepared

### ✅ Repository Information
- **GitHub URL**: https://github.com/rnsobral-sfdc/Infa_IDMC_CP_Profiling_Warehouse
- **Username**: rnsobral-sfdc
- **License**: Apache License 2.0
- **Disclaimer**: Educational use only - added to README

### ✅ Security
- Database files excluded (*.db)
- Environment files excluded (.env, .env.local)
- Virtual environments excluded (venv/, node_modules/)
- All sensitive data protected by .gitignore

### ✅ Documentation
- README updated with prominent disclaimer
- LICENSE changed to Apache 2.0
- Setup guides for all platforms
- Contributing guidelines
- Publishing scripts created

## 🚀 Quick Start - Automated Publishing

### Step 1: Stop Running Servers
```bash
# Press Ctrl+C in backend terminal
# Press Ctrl+C in frontend terminal
```

### Step 2: Run Publishing Script

**Windows:**
```powershell
cd C:\Temp\Claude\ProfilingReport
.\CLEAN_AND_PUBLISH.bat
```

**macOS/Linux:**
```bash
cd /path/to/ProfilingReport
./CLEAN_AND_PUBLISH.sh
```

### What the Script Does

1. ✓ Cleans sensitive data (database, .env files)
2. ✓ Verifies .gitignore protection
3. ✓ Initializes git repository (if needed)
4. ✓ Registers remote repository
5. ✓ Configures main branch
6. ✓ Resolves LICENSE to Apache 2.0
7. ✓ Stages all safe files
8. ✓ Shows preview of what will be committed
9. ✓ Creates commit with disclaimer
10. ✓ Pushes to GitHub

### Authentication

When prompted:
- **Username**: `rnsobral-sfdc`
- **Password**: Your Personal Access Token (PAT)

**Create PAT:**
1. Visit: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Name: "IDMC Profiling Extractor"
4. Scope: ☑️ `repo` (full control)
5. Generate and copy token
6. Use as password when pushing

## 📝 Manual Publishing (If Preferred)

If you prefer manual control:

```bash
cd C:\Temp\Claude\ProfilingReport

# 1. Initialize git (if not already)
git init

# 2. Register remote repository
git remote add origin https://github.com/rnsobral-sfdc/Infa_IDMC_CP_Profiling_Warehouse.git

# 3. Verify remote
git remote -v

# 4. Set main branch
git branch -M main

# 5. Resolve LICENSE to Apache 2.0
git checkout --theirs LICENSE

# 6. Stage all changes
git add .

# 7. Review what will be committed
git status

# 8. Create commit
git commit -m "Update: Apache License 2.0 with educational disclaimer"

# 9. Push to GitHub
git push -u origin main
```

## 🔒 Security Verification

### Files That Will BE Published
- ✅ Source code (`backend/app/`, `frontend/src/`, `frontend/pages/`)
- ✅ Documentation (`README.md`, `SETUP.md`, etc.)
- ✅ Configuration templates (`.env.example`)
- ✅ LICENSE (Apache 2.0)
- ✅ .gitignore

### Files That Will NOT BE Published
- ❌ `backend/idmc_profiling.db` - Your database
- ❌ `backend/.env` - Your credentials
- ❌ `frontend/.env.local` - Local config
- ❌ `venv/` - Virtual environment
- ❌ `node_modules/` - Node modules
- ❌ `__pycache__/` - Python cache
- ❌ `.next/` - Build artifacts

**These are automatically excluded by .gitignore!**

## ✅ Post-Publishing Checklist

After successful push:

### 1. Verify on GitHub
Visit: https://github.com/rnsobral-sfdc/Infa_IDMC_CP_Profiling_Warehouse

Check:
- [ ] README displays disclaimer prominently
- [ ] LICENSE shows "Apache License Version 2.0"
- [ ] No database files visible
- [ ] No .env files visible
- [ ] Source code is complete
- [ ] Documentation is readable

### 2. Configure Repository (Optional)

**Add Topics/Tags:**
1. Click ⚙️ (gear icon) next to "About"
2. Add topics:
   - `python`
   - `fastapi`
   - `react`
   - `nextjs`
   - `informatica`
   - `data-quality`
   - `etl`
   - `star-schema`
   - `sqlite`
   - `apache-license`
3. Click "Save changes"

**Update Description:**
```
Data warehouse solution for IDMC profiling data extraction and analysis. 
Educational use only. Features FastAPI backend, React frontend, rule validation 
metrics, drift detection, and BI tool integration.
```

**Set Website (if applicable):**
- Your documentation URL or demo site

### 3. Create First Release (Optional)

```bash
# Tag current version
git tag -a v1.0.0 -m "Initial release with Apache License 2.0"
git push origin v1.0.0
```

Then on GitHub:
1. Go to Releases → Draft a new release
2. Choose tag: v1.0.0
3. Title: "v1.0.0 - Initial Release"
4. Description: Key features
5. Publish release

## 🐛 Troubleshooting

### Issue: "Repository not found"

**Cause**: Repository doesn't exist on GitHub or wrong URL

**Solution**:
1. Verify repository exists: https://github.com/rnsobral-sfdc/Infa_IDMC_CP_Profiling_Warehouse
2. Check remote URL: `git remote -v`
3. Update if needed: `git remote set-url origin https://github.com/rnsobral-sfdc/Infa_IDMC_CP_Profiling_Warehouse.git`

### Issue: "Authentication failed"

**Cause**: Wrong credentials or using password instead of PAT

**Solution**:
1. Create Personal Access Token at https://github.com/settings/tokens
2. Use PAT as password (not your GitHub password)
3. Select `repo` scope when creating PAT

### Issue: "Remote contains work you don't have"

**Cause**: GitHub repository has files your local repo doesn't

**Solution**:
```bash
# Pull and merge
git pull origin main --allow-unrelated-histories

# Resolve any conflicts if needed
git status

# Push again
git push -u origin main
```

### Issue: "Database file locked"

**Cause**: Backend server still running or database in use

**Solution**:
1. Stop backend server (Ctrl+C)
2. Close any database browser tools
3. The script will continue anyway - .gitignore protects the file

### Issue: "Permission denied (publickey)"

**Cause**: Using SSH URL without SSH key configured

**Solution**:
Use HTTPS instead:
```bash
git remote set-url origin https://github.com/rnsobral-sfdc/Infa_IDMC_CP_Profiling_Warehouse.git
```

## 📞 Need Help?

1. **Check Script Output**: The script provides detailed error messages
2. **Review PUBLISH_NOW.txt**: Quick reference for common issues
3. **Check Git Status**: `git status` shows current state
4. **Verify Remote**: `git remote -v` shows repository URL
5. **Check GitHub**: Ensure repository exists and you have access

## 📚 Additional Resources

- **Quick Reference**: See `PUBLISH_NOW.txt`
- **Cleanup Checklist**: See `MANUAL_CLEANUP_CHECKLIST.md`
- **Main README**: See `README.md`
- **Setup Guide**: See `SETUP.md`

## ✨ Success!

Once published, your repository will be available at:
**https://github.com/rnsobral-sfdc/Infa_IDMC_CP_Profiling_Warehouse**

The repository includes:
- ✅ Apache License 2.0
- ✅ Educational use disclaimer
- ✅ Complete source code
- ✅ Comprehensive documentation
- ✅ Cross-platform setup instructions
- ✅ No sensitive data

**Ready to publish? Run `.\CLEAN_AND_PUBLISH.bat` now!**
