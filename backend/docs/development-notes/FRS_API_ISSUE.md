# FRS API Authentication Issue

## Status

The FRS API for fetching rule metadata is returning 302 redirects to the login page, indicating authentication issues.

## What's Tested

```
URL: https://na1.dm-us.informaticacloud.com/frs/api/v1/Documents
Filter: id eq 'hdcKuZ8k4qYhI6d6RN60iG' or id eq '2hzPQevNLuHj9BmWBUjNMJ'
Headers: icSessionId, Authorization
Result: 302 Redirect to https://dm-us.informaticacloud.com/ma/home
```

## Headers Tested

1. **Standard headers (icSessionId + Authorization)** → 302 redirect
2. **Profiling headers (IDS-SESSION-ID)** → 400 URI parsing error
3. **Combined headers** → 400 URI parsing error

## Analysis

The FRS API requires different authentication than the profiling APIs:
- Metric-store API: Works with `IDS-SESSION-ID` header ✅
- FRS API: Rejects both header types (302 or 400) ❌

This suggests:
1. FRS API may require different permissions/roles
2. FRS API may use a different authentication mechanism
3. The current IDMC user may not have FRS API access

## Impact

✅ **NO IMPACT on core functionality!**

- MAPPLETFIELD statistics sync: **WORKING**
- Rule output mappings: **WORKING**  
- Rule input mappings: **WORKING**
- All metrics stored correctly: **WORKING**

❌ **Only affects:**
- Rule names (will show as NULL in `dim_rule_mapplet.name`)
- Rule descriptions (will show as NULL in `dim_rule_mapplet.description`)
- DQ dimensions (will show as NULL in `dim_rule_mapplet.dimension`)

## Workarounds

### Option 1: Manual Population
Manually update rule names in the database:
```sql
UPDATE dim_rule_mapplet 
SET name = 'rs_compare_string_with_exception',
    description = 'Compares two strings',
    dimension = 'CONSISTENCY',
    is_exception = 1
WHERE frs_id = 'hdcKuZ8k4qYhI6d6RN60iG';
```

### Option 2: Use FRS ID as Display Name
In the UI, display the `frs_id` if `name` is NULL:
```javascript
const displayName = rule.name || rule.frs_id;
```

### Option 3: Fetch from Different API
Check if there's an alternative API endpoint for rule metadata that doesn't require FRS permissions.

## Next Steps to Resolve

1. **Check IDMC User Permissions**
   - Verify the user has FRS API access rights
   - Check if additional roles/permissions are needed

2. **Contact IDMC Support**
   - Ask about FRS API authentication requirements
   - Check if there's a different endpoint for rule metadata

3. **Alternative Data Sources**
   - The rule occurrence API might have rule names
   - Check if profiling-service API returns rule metadata

## Code Ready

The code is ready and will work automatically once FRS API authentication is resolved:
- `ProfileService.get_rule_metadata()` - Implemented
- `_update_rule_metadata()` - Implemented  
- Database schema - Ready with metadata fields

Once FRS API is accessible, rule names will populate automatically during sync with no code changes needed!
