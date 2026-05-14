# FRS API Integration - Working Summary

## ✅ SUCCESS - FRS API Authentication Fixed!

The FRS API is now working correctly and fetching rule metadata including names, descriptions, document types, dimensions, and exception flags.

## What Was Fixed

### 1. FRS API Authentication
**Problem:** FRS API was returning 302 redirects or 400 errors

**Solution:** Use `IDS-SESSION-ID` header (same as profiling-service API) instead of cookies

**File:** `app/services/profiling_service.py` (lines 607-620)

```python
# FRS API uses the same authentication as profiling-service API
headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'IDS-SESSION-ID': self.auth.session_token
}
```

### 2. URL Encoding
**Problem:** httpx was double-encoding the `$filter` parameter

**Solution:** Manually encode the filter query string and append to endpoint

**File:** `app/services/profiling_service.py` (lines 577-585)

```python
# Build filter query: id eq 'id1' or id eq 'id2' or...
filter_parts = [f"id eq '{frs_id}'" for frs_id in frs_ids]
filter_query = " or ".join(filter_parts)

# URL encode the filter manually to avoid double encoding
from urllib.parse import quote
encoded_filter = quote(filter_query)

endpoint = f"/frs/api/v1/Documents?$filter={encoded_filter}"
params = None  # Don't use params dict to avoid double encoding
```

### 3. Database Schema
**Added:** `document_type` column to `dim_rule_mapplet` table

**File:** `app/models/profiling_fields.py` (line 78)

```python
document_type = Column(String(100), nullable=True, 
                      comment="FRS document type (RULE_SPECIFICATION, VERIFIER, CLEANSE, DMAPPLET)")
```

### 4. Metadata Enrichment
**Enhanced:** `_update_rule_metadata()` to store document type

**File:** `app/services/star_schema_sync_service.py` (line 1263)

```python
rule.name = doc.get('name')
rule.description = doc.get('description')
rule.document_type = doc.get('documentType')  # NEW

# Extract dimension and exception from custom attributes
custom_attrs = doc.get('customAttributes', {})
if custom_attrs:
    string_attrs = custom_attrs.get('stringAttrs', [])
    for attr in string_attrs:
        if attr.get('name') == 'DIMENSION':
            rule.dimension = attr.get('value')
        elif attr.get('name') == 'EXCEPTION':
            rule.is_exception = attr.get('value', '').lower() == 'true'
```

## Test Results

### FRS API Test
```bash
Logged in successfully
Fetching rule metadata from FRS API...
SUCCESS! Fetched 2 rules
  - rs_compare_string_witn_exception (RULE_SPECIFICATION)
    ID: hdcKuZ8k4qYhI6d6RN60iG
    EXCEPTION: true
    DIMENSION: CONSISTENCY

  - rs_country_Exception (RULE_SPECIFICATION)
    ID: 2hzPQevNLuHj9BmWBUjNMJ
    DIMENSION: VALIDITY
    EXCEPTION: true
```

## What FRS API Returns

### Example Response
```json
{
    "id": "hdcKuZ8k4qYhI6d6RN60iG",
    "name": "rs_compare_string_witn_exception",
    "description": null,
    "documentType": "RULE_SPECIFICATION",
    "customAttributes": {
        "stringAttrs": [
            {
                "name": "EXCEPTION",
                "value": "true"
            },
            {
                "name": "DIMENSION",
                "value": "CONSISTENCY"
            }
        ]
    }
}
```

### Document Types
- `RULE_SPECIFICATION` - Data quality rules
- `VERIFIER` - Verification/validation mapplets
- `CLEANSE` - Cleansing/transformation mapplets
- `DMAPPLET` - Custom data mapplets

### Data Quality Dimensions
- `VALIDITY` - Is the data valid?
- `CONSISTENCY` - Is the data consistent?
- `COMPLETENESS` - Is the data complete?
- `ACCURACY` - Is the data accurate?
- `TIMELINESS` - Is the data current?

## Database Schema

### dim_rule_mapplet Table
```sql
CREATE TABLE dim_rule_mapplet (
    rule_mapplet_id VARCHAR(255) PRIMARY KEY,
    org_id VARCHAR(255),
    profiling_task_id VARCHAR(255),
    profiling_run_id VARCHAR(255),
    frs_id VARCHAR(255),
    
    -- FRS Metadata
    name VARCHAR(500),                   -- Rule name from FRS
    description VARCHAR(2000),           -- Rule description
    document_type VARCHAR(100),          -- RULE_SPECIFICATION, VERIFIER, etc.
    dimension VARCHAR(100),              -- VALIDITY, CONSISTENCY, etc.
    is_exception BOOLEAN,                -- Does rule generate exceptions?
    
    -- Other fields...
)
```

## Usage in UI

### Query Example
```sql
SELECT 
    rm.name,
    rm.document_type,
    rm.dimension,
    rm.is_exception,
    rm.description,
    COUNT(DISTINCT r.profiling_run_id) as times_run
FROM dim_rule_mapplet rm
LEFT JOIN fact_profiling_result r 
    ON r.rule_output_mapping_id IN (
        SELECT mapping_id 
        FROM fact_rule_output_mapping 
        WHERE rule_mapplet_id = rm.rule_mapplet_id
    )
GROUP BY rm.rule_mapplet_id
ORDER BY times_run DESC
```

### Display in UI
```javascript
// Display rule with metadata
const displayRule = (rule) => {
  return (
    <div>
      <h3>{rule.name || rule.frs_id}</h3>
      <Badge>{rule.document_type}</Badge>
      <Badge color={rule.is_exception ? 'red' : 'blue'}>
        {rule.is_exception ? 'Exception Rule' : 'Standard Rule'}
      </Badge>
      <Badge>{rule.dimension}</Badge>
      {rule.description && <p>{rule.description}</p>}
    </div>
  );
};
```

## Key Learnings

1. **FRS API uses same auth as profiling-service** - Both use `IDS-SESSION-ID` header
2. **URL encoding matters** - Manual encoding prevents double-encoding issues
3. **Batch fetching** - FRS API supports OR queries: `id eq 'id1' or id eq 'id2'`
4. **Custom attributes** - Metadata like DIMENSION and EXCEPTION stored in customAttributes
5. **Document types vary** - Not all rules are RULE_SPECIFICATION; some are VERIFIER, CLEANSE, DMAPPLET

## Complete Data Flow

1. **Sync profiles** → Get profile data including `frsId` for each rule
2. **Collect FRS IDs** → Extract all unique `frsId` values
3. **Batch fetch from FRS** → Call `/frs/api/v1/Documents?$filter=id eq 'id1' or id eq 'id2'...`
4. **Parse metadata** → Extract name, description, documentType, customAttributes
5. **Update database** → Store metadata in `dim_rule_mapplet` table
6. **Display in UI** → Show rich rule information with names, types, dimensions

## Next Steps

✅ **FRS API working**
✅ **Metadata fetching**
✅ **Database storage**
✅ **Auto-enrichment during sync**

**Ready for UI integration!**

The Rule Statistics tab can now display:
- Rule names (instead of just FRS IDs)
- Document types (RULE_SPECIFICATION, VERIFIER, CLEANSE, DMAPPLET)
- Data quality dimensions (VALIDITY, CONSISTENCY, etc.)
- Exception flags
- Rule descriptions
- Complete MAPPLETFIELD statistics with full linkage

All metadata will automatically populate during profile sync with no additional user action required!
