# Testing Quick Start Guide

## Fast Testing Workflow (< 1 minute)

For quick testing during development, use this workflow:

### 1. Clear Database
```bash
cd C:/Temp/Claude/ProfilingReport/backend
python purge_data.py purge --keep-connections
```

### 2. Sync 1 Profile (10-20 seconds)
```bash
python sync_1_profile.py
```

### 3. View Results
- Backend API: http://localhost:8000/docs
- Frontend: http://localhost:3000
- Test Profile: aaa_Profile_Customer_Data

## Available Sync Options

| Script | Profiles | Time | Best For |
|--------|----------|------|----------|
| `sync_1_profile.py` | 1 | 10-20s | Quick smoke tests |
| `sync_2_profiles.py` | 2 | 20-40s | Multi-dataset testing |
| `sync_5_profiles.py` | 5 | ~1min | Full feature testing |
| `test_star_schema_sync.py` | All (329) | ~15min | Production sync |

## Custom Sync

Sync any number of profiles:
```bash
python test_star_schema_sync.py 1     # 1 profile
python test_star_schema_sync.py 10    # 10 profiles
python test_star_schema_sync.py       # All profiles
```

## Complete Test Cycle

```bash
# 1. Purge database
python purge_data.py purge --keep-connections

# 2. Quick sync (1 profile)
python sync_1_profile.py

# 3. Verify sync
# - Check console output for "SUCCESS"
# - Look for rule metadata fetching message

# 4. Test backend API
curl http://localhost:8000/profiling/tasks | python -m json.tool | head -20

# 5. Test frontend
# Navigate to: http://localhost:3000/profiling-tasks
# Click on a task → View runs → View run details
# Check both "Column Statistics" and "Rule Statistics" tabs
```

## What Gets Synced (1 Profile)

When syncing 1 profile (aaa_Profile_Customer_Data), you get:
- ✓ 1 profiling task
- ✓ 1 profiling run
- ✓ 23 data source fields (columns)
- ✓ 2 rules (with metadata from FRS API)
- ✓ 3 input mappings
- ✓ 6 output mappings
- ✓ ~290 statistics records
- ✓ Column patterns, data types, value frequencies
- ✓ Rule occurrences

## Troubleshooting

### Backend errors?
```bash
# Check if backend is running
curl http://localhost:8000/docs

# Restart backend
cd C:/Temp/Claude/ProfilingReport/backend
uvicorn app.main:app --reload --port 8000
```

### Frontend errors?
```bash
# Check if frontend is running
curl http://localhost:3000

# Restart frontend
cd C:/Temp/Claude/ProfilingReport/frontend
npm run dev
```

### Database issues?
```bash
# Nuclear option - recreate database
python purge_data.py recreate

# Then sync again
python sync_1_profile.py
```

### Slow sync?
- Check network connection
- Use `sync_1_profile.py` for fastest testing
- Recent optimizations reduced sync time by 91%

## Performance Tips

**Before optimization:**
- 20 columns × 11 metrics = 220 API calls (patterns/datatypes)

**After optimization:**
- 20 columns = 20 API calls (patterns/datatypes)
- **91% reduction!**

See `OPTIMIZATION_DUPLICATE_API_CALLS.md` for technical details.

## Files Reference

| File | Purpose |
|------|---------|
| `purge_data.py` | Clear database |
| `sync_1_profile.py` | Sync 1 profile (fastest) |
| `sync_2_profiles.py` | Sync 2 profiles |
| `sync_5_profiles.py` | Sync 5 profiles |
| `test_star_schema_sync.py` | Main sync script with limit options |

## Common Scenarios

### Scenario 1: Testing UI changes
```bash
python sync_1_profile.py  # 10-20 seconds
# Make UI changes
# Refresh browser
```

### Scenario 2: Testing backend changes
```bash
python purge_data.py purge --keep-connections
python sync_1_profile.py
# Check API at http://localhost:8000/docs
```

### Scenario 3: Full integration test
```bash
python purge_data.py purge --keep-connections
python sync_5_profiles.py  # ~1 minute
# Test all features in frontend
```

### Scenario 4: Production deployment
```bash
python purge_data.py purge --keep-connections
python test_star_schema_sync.py  # ~15 minutes, all profiles
```

## Next Steps

After successful sync:
1. **View Profiling Tasks**: http://localhost:3000/profiling-tasks
2. **View Task Runs**: Click on any task
3. **View Run Details**: Click on any run
4. **Rule Statistics Tab**: See rule names, input/output mappings, metrics
5. **Column Statistics Tab**: See column-level profiling data

## Support

For issues:
1. Check console output for error messages
2. Verify backend API is running
3. Check browser console (F12) for frontend errors
4. Review `FINAL_IMPLEMENTATION_STATUS.md` for architecture
5. Review `OPTIMIZATION_DUPLICATE_API_CALLS.md` for performance details
