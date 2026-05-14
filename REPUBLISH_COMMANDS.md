# Commands to Purge and Republish Repository

## Step 1: Resolve LICENSE Merge Conflict

```bash
# Keep the Apache License (remove MIT)
git checkout --theirs LICENSE
git add LICENSE
```

## Step 2: Update README with Disclaimer

The README.md will be updated to include the disclaimer at the top.

## Step 3: Complete the Merge

```bash
# Commit the merge resolution
git commit -m "Resolve merge conflict: Use Apache License 2.0"
```

## Step 4: Push to GitHub

```bash
# Push the changes
git push -u origin main
```

## Complete Command Sequence

Run these commands in order:

```bash
cd C:\Temp\Claude\ProfilingReport

# Resolve LICENSE conflict (use Apache)
git checkout --theirs LICENSE
git add LICENSE

# Commit the merge
git commit -m "Resolve merge conflict: Use Apache License 2.0"

# Push to GitHub
git push -u origin main
```

---

## Alternative: If You Want to Start Fresh

If you prefer to completely reset and republish:

```bash
cd C:\Temp\Claude\ProfilingReport

# Remove all git history
rd /s /q .git

# Reinitialize
git init
git add .
git commit -m "Initial commit: IDMC Profiling Extractor with Apache License 2.0"
git branch -M main
git remote add origin https://github.com/rnsobral-sfdc/Infa_IDMC_CP_Profiling_Warehouse.git

# Force push (overwrites everything on GitHub)
git push -u origin main --force
```

**⚠️ Warning:** The force push will completely overwrite the GitHub repository.

---

## After Publishing

The repository will have:
- ✅ Apache License 2.0
- ✅ Disclaimer in README
- ✅ All documentation
- ✅ Clean codebase
