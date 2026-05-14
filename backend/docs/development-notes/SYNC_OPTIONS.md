# Sync Options - Quick Testing Guide

## Overview

The sync process can be configured to sync a limited number of profiles for faster testing. This is especially useful during development when you want to quickly test changes without waiting for all 329 profiles to sync.

## Available Options

### Quick Sync Scripts (Recommended)

Use these shortcut scripts for common testing scenarios:

```bash
# Sync 1 profile (10-20 seconds) - Fastest for quick testing
python sync_1_profile.py

# Sync 2 profiles (20-40 seconds) - Test with multiple datasets
python sync_2_profiles.py

# Sync 5 profiles (~1 minute) - Comprehensive test set
python sync_5_profiles.py
```

### Manual Sync with Custom Limit

```bash
# Sync specific number of profiles
python test_star_schema_sync.py 1          # 1 profile
python test_star_schema_sync.py 2          # 2 profiles
python test_star_schema_sync.py 5          # 5 profiles
python test_star_schema_sync.py 10         # 10 profiles
python test_star_schema_sync.py 50         # 50 profiles

# Sync all profiles (no limit)
python test_star_schema_sync.py
```

## Typical Sync Times

| Profiles | Estimated Time | Use Case |
|----------|----------------|----------|
| 1        | 10-20 seconds  | Quick smoke test |
| 2        | 20-40 seconds  | Multi-dataset testing |
| 5        | ~1 minute      | Full feature test (includes our test profile) |
| 10       | ~2 minutes     | Small sample set |
| 50       | ~5 minutes     | Large sample set |
| All (329)| ~15 minutes    | Full production sync |

## Test Profile Information

The **first 5 profiles** in IDMC include our main test profile:
- **Profile 1**: `aaa_Profile_Customer_Data` - The profile we've been testing with
  - Has 2 rules with input/output mappings
  - Has MAPPLETFIELD statistics
  - Best for testing rule statistics UI

## Workflow for Development

### Option 1: Quick Testing (1 profile)
```bash
# 1. Purge existing data
python purge_data.py purge --keep-connections

# 2. Sync 1 profile
python sync_1_profile.py

# 3. Test in browser
# Open http://localhost:3000
```

### Option 2: Standard Testing (5 profiles)
```bash
# 1. Purge existing data
python purge_data.py purge --keep-connections

# 2. Sync 5 profiles (includes test profile + 4 others)
python sync_5_profiles.py

# 3. Test in browser
```

### Option 3: Full Sync (all profiles)
```bash
# 1. Purge existing data
python purge_data.py purge --keep-connections

# 2. Sync all profiles
python test_star_schema_sync.py

# 3. Wait ~15 minutes
```

## Performance Optimizations

Recent optimizations have made syncing **91% faster**:
- Eliminated duplicate API calls for patterns/datatypes
- Reduced API calls from 220 to 20 per profile (20 columns)
- Backfill inferred types from fact tables instead of re-fetching

See `OPTIMIZATION_DUPLICATE_API_CALLS.md` for details.

## Common Commands Summary

```bash
# Purge database (keep connections)
python purge_data.py purge --keep-connections

# Purge database (remove connections too)
python purge_data.py purge

# Quick sync shortcuts
python sync_1_profile.py    # Fastest
python sync_2_profiles.py   # Two profiles
python sync_5_profiles.py   # Test set

# Custom sync
python test_star_schema_sync.py 1    # Any number 1-329
python test_star_schema_sync.py      # All profiles
```

## Troubleshooting

**Sync taking too long?**
- Use `sync_1_profile.py` for quickest testing
- Check network connection
- Verify IDMC API is responding

**Need fresh start?**
```bash
python purge_data.py purge --keep-connections
python sync_1_profile.py
```

**Frontend not showing data?**
- Check that backend sync completed successfully
- Verify backend API is running: `http://localhost:8000/docs`
- Check frontend is running: `http://localhost:3000`
- Look for errors in browser console (F12)
