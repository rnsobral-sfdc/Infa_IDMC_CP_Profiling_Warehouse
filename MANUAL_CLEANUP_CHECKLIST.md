# Manual Cleanup Checklist Before Publishing

**IMPORTANT:** Complete these steps to ensure no sensitive data is published to GitHub.

## ✅ Pre-Publication Checklist

### 1. Stop All Running Services
```bash
# Stop backend (Ctrl+C in backend terminal)
# Stop frontend (Ctrl+C in frontend terminal)
```

### 2. Remove Database Files

**The database may contain:**
- IDMC credentials
- Organization data
- Connection information

```bash
# Windows
cd C:\Temp\Claude\ProfilingReport\backend
del /f idmc_profiling.db
del /f idmc_profiling.db-journal

# macOS/Linux
cd backend
rm -f idmc_profiling.db
rm -f idmc_profiling.db-journal
```

**Verification:**
```bash
# Check database is NOT in git
git status
# Should NOT see idmc_profiling.db listed
```

### 3. Remove Environment Files with Credentials

```bash
# Windows
del /f backend\.env
del /f frontend\.env.local

# macOS/Linux
rm -f backend/.env
rm -f frontend/.env.local
```

### 4. Verify .gitignore

Check these patterns are in `.gitignore`:
```
*.db
*.db-journal
.env
.env.local
backend/idmc_profiling.db*
```

### 5. Check for Sensitive Data in Code

Search for:
- Hardcoded passwords
- API keys
- Organization IDs
- Connection strings
- Personal information

```bash
# Search for potential secrets
grep -r "password\s*=" backend/
grep -r "api_key" backend/
grep -r "@salesforce.com" backend/
```

### 6. Review Git Status

```bash
git status
```

**Should NOT see:**
- ❌ `idmc_profiling.db`
- ❌ `.env`
- ❌ `.env.local`
- ❌ `venv/` or `node_modules/`
- ❌ Any files with credentials

**Should see (OK to commit):**
- ✅ `.gitignore`
- ✅ `README.md`
- ✅ `LICENSE`
- ✅ Source code files
- ✅ `.env.example` files (templates only)

### 7. Verify .env.example Files

Check that example files contain NO real credentials:

**backend/.env.example:**
```env
SECRET_KEY=your-secret-key-here-change-this-in-production  # Generic
```

**frontend/.env.example:**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000  # Generic
```

## 🚀 Ready to Publish

Once all checks pass, run:

```bash
cd C:\Temp\Claude\ProfilingReport
.\CLEAN_AND_PUBLISH.bat
```

Or manually:

```bash
# Resolve LICENSE
git checkout --theirs LICENSE
git add LICENSE

# Stage changes
git add README.md .gitignore backend/.env.example frontend/.env.example

# Commit
git commit -m "Update: Apache License 2.0 with disclaimer"

# Push
git push -u origin main
```

## 🔍 Post-Publication Verification

After pushing, check on GitHub:

1. Visit: https://github.com/rnsobral-sfdc/Infa_IDMC_CP_Profiling_Warehouse
2. Verify these files are **NOT** present:
   - ❌ `backend/idmc_profiling.db`
   - ❌ `backend/.env`
   - ❌ `frontend/.env.local`
3. Check README displays disclaimer
4. Verify LICENSE shows Apache 2.0

## ⚠️ If You Accidentally Committed Sensitive Data

If you pushed sensitive data to GitHub:

### Immediate Actions:
1. **Rotate all credentials immediately**
   - Change IDMC passwords
   - Generate new API tokens
   - Update connection configs

2. **Remove from git history:**
```bash
# Remove file from history (DESTRUCTIVE - use carefully)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/idmc_profiling.db" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (overwrites GitHub)
git push origin --force --all
```

3. **Alternative: Delete and recreate repository**
   - Delete repository on GitHub
   - Create new repository
   - Push clean version

### Prevention:
- Always run cleanup checklist
- Double-check `git status` before committing
- Use `.gitignore` properly
- Review diffs before pushing

## 📋 Summary

**Safe to commit:**
- ✅ Source code (Python, TypeScript, React)
- ✅ Configuration templates (.env.example)
- ✅ Documentation (*.md files)
- ✅ LICENSE and .gitignore
- ✅ Package files (requirements.txt, package.json)

**NEVER commit:**
- ❌ Database files (*.db)
- ❌ Environment files with real values (.env)
- ❌ Credentials or API keys
- ❌ Virtual environments (venv/, node_modules/)
- ❌ Build artifacts (.next/, __pycache__/)
- ❌ Personal or organization data

---

**When in doubt, DON'T commit it!**
