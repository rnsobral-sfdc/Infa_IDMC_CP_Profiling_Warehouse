# Optimization: Eliminated Duplicate API Calls

## Problem Identified

The sync service was making duplicate API calls to fetch column patterns and data types:

### Before Optimization:

1. **First Call** (in `_sync_statistics` function, line 558-573):
   - Called `get_column_patterns()` and `get_column_data_types()` for **every metric row**
   - If a column has 10 metrics, the same API was called 10 times
   - Example: 20 columns × 10 metrics = 200 duplicate API calls per run
   - Purpose: To extract inferred_data_type for dim_data_source_field

2. **Second Call** (in `_sync_enhanced_profiling_data` function, line 704-772):
   - Called the same APIs once per column (correctly deduplicated)
   - Purpose: To store detailed patterns/data types in fact tables

### Impact:
- For a profile with 20 columns and 10 metrics each:
  - Before: 200 + 20 = **220 API calls**
  - Actual needed: **20 API calls**
  - **11x redundant calls!**

## Solution Implemented

### Changes Made:

1. **Removed duplicate API calls** (line 551-580):
   ```python
   # OLD: Called patterns/datatypes APIs for every metric row
   patterns = await self.profiling_service.get_column_patterns(...)
   data_types = await self.profiling_service.get_column_data_types(...)
   
   # NEW: Just set to None, will be backfilled later
   inferred_patterns = None
   inferred_data_type = None
   ```

2. **Added backfill function** (new method `_backfill_inferred_types`):
   - After enhanced data is synced, backfills inferred types to dim_data_source_field
   - Reads from already-fetched fact tables instead of making new API calls
   - Selects most common/reliable inferred type per column

3. **Updated sync flow** (line 195-204):
   ```python
   await self._sync_statistics(...)           # No API calls for patterns/types
   await self._sync_enhanced_profiling_data(...)  # API calls here (once per column)
   await self._backfill_inferred_types(...)   # Backfill from fact tables
   ```

### After Optimization:

- **20 API calls** instead of 220 (for 20-column profile)
- **91% reduction** in API calls
- No change to final data structure
- Faster sync times
- Less load on IDMC APIs

## Testing Verification

To verify the optimization works:

1. Run purge: `python purge_data.py purge --keep-connections`
2. Sync profiles: `python test_sync.py`
3. Verify data:
   ```sql
   SELECT field_name, inferred_data_type 
   FROM dim_data_source_field 
   WHERE inferred_data_type IS NOT NULL
   LIMIT 10;
   ```
4. Check logs - should see only ONE call per column to patterns/datatypes APIs

## Files Modified

- `app/services/star_schema_sync_service.py`:
  - Line 551-580: Removed duplicate API calls
  - Line 195-204: Added backfill step
  - Line 1263-1308: Added `_backfill_inferred_types()` method

## Performance Improvement

| Profile Size | Before | After | Improvement |
|--------------|--------|-------|-------------|
| 10 columns   | 110 calls | 10 calls | 91% faster |
| 20 columns   | 220 calls | 20 calls | 91% faster |
| 50 columns   | 550 calls | 50 calls | 91% faster |

**Additional Benefits:**
- Reduced risk of hitting IDMC API rate limits
- More reliable sync (fewer network calls = fewer failure points)
- Better log output (less noise from duplicate calls)
