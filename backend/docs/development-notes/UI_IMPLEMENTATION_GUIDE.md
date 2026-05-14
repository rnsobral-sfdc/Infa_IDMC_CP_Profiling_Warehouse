# UI Implementation Guide - Rule Statistics with Drill-Down

## ✅ Backend Complete

All backend APIs are working and returning rule metadata with input/output mappings.

### API Endpoint Created

**GET `/profiling/runs/{run_id}/rule-statistics`**

Returns complete rule information for a profiling run including:
```json
[
  {
    "rule_mapplet_id": "uuid",
    "frs_id": "hdcKuZ8k4qYhI6d6RN60iG",
    "name": "rs_compare_string_witn_exception",
    "description": "Rule description",
    "rule_type": "RULE_SPECIFICATION",
    "dimension": "CONSISTENCY",
    "is_exception": true,
    "input_mappings": [
      {
        "data_source_field_name": "LAST_NAME",
        "in_field_name": "in_str1",
        "precision": null,
        "scale": null
      }
    ],
    "output_mappings": [
      {
        "mapping_id": "uuid",
        "out_field_name": "ExceptionDescription",
        "column_key": 40012,
        "datatype": "string",
        "metric_count": 10,
        "metrics": {
          "TOTAL_ROWS": 1671,
          "NULL_COUNT": 0,
          "DISTINCT_COUNT": 5,
          ...
        }
      }
    ]
  }
]
```

### FRS API cURL Example

```bash
curl -X GET "https://na1.dm-us.informaticacloud.com/frs/api/v1/Documents?$filter=id eq 'hdcKuZ8k4qYhI6d6RN60iG' or id eq '2hzPQevNLuHj9BmWBUjNMJ'" \
  -H "IDS-SESSION-ID: your_session_token" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json"
```

**Response:**
```json
{
  "value": [
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
  ]
}
```

## 🔧 Frontend Changes Needed

### 1. Update Rule Statistics Tab

**File:** `frontend/pages/profiling-run-details.tsx`

**Current State:**
- Shows rule statistics grouped by column name
- Uses old `ruleStats` and `ruleStatsByColumn` data structures

**Needed Changes:**
- Replace content of `{selectedTab === 'rule' && (` section (line ~825)
- Use new `ruleStatistics` state variable (already added)
- Group by rule instead of by column

**New Structure:**
```tsx
{selectedTab === 'rule' && (
  <>
    {ruleStatistics.length > 0 ? (
      ruleStatistics.map((rule) => (
        <Card key={rule.rule_mapplet_id} className={styles.card}>
          <div style={{ padding: tokens.spacingVerticalL }}>
            {/* Rule Header */}
            <div className={styles.sectionHeader}>
              <CheckmarkCircle24Regular />
              <div>
                <Title3>{rule.name || rule.frs_id}</Title3>
                <div style={{ display: 'flex', gap: tokens.spacingHorizontalS, marginTop: tokens.spacingVerticalXXS }}>
                  <Badge appearance="outline">{rule.rule_type}</Badge>
                  {rule.dimension && (
                    <Badge appearance="outline" color="brand">{rule.dimension}</Badge>
                  )}
                  {rule.is_exception && (
                    <Badge appearance="filled" color="danger">Exception Rule</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Input Mappings Section */}
            <div style={{ marginTop: tokens.spacingVerticalM }}>
              <FluentText size={300} weight="semibold" style={{ display: 'block', marginBottom: tokens.spacingVerticalS }}>
                Input Mappings (Source → Rule Input)
              </FluentText>
              {rule.input_mappings.length > 0 ? (
                <Table size="small">
                  <TableHeader>
                    <TableRow>
                      <TableHeaderCell>Source Column</TableHeaderCell>
                      <TableHeaderCell>Rule Input Port</TableHeaderCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rule.input_mappings.map((input, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <TableCellLayout>
                            <Badge appearance="outline" color="informative">
                              {input.data_source_field_name}
                            </Badge>
                          </TableCellLayout>
                        </TableCell>
                        <TableCell>
                          <TableCellLayout>{input.in_field_name}</TableCellLayout>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <FluentText size={200} style={{ color: tokens.colorNeutralForeground3 }}>
                  No input mappings
                </FluentText>
              )}
            </div>

            {/* Output Mappings Section */}
            <div style={{ marginTop: tokens.spacingVerticalL }}>
              <FluentText size={300} weight="semibold" style={{ display: 'block', marginBottom: tokens.spacingVerticalS }}>
                Output Mappings (Rule Output → Statistics)
              </FluentText>
              {rule.output_mappings.map((output, idx) => (
                <div
                  key={idx}
                  style={{
                    marginBottom: tokens.spacingVerticalL,
                    padding: tokens.spacingVerticalM,
                    backgroundColor: tokens.colorNeutralBackground2,
                    borderRadius: tokens.borderRadiusMedium
                  }}
                >
                  <div style={{ marginBottom: tokens.spacingVerticalS }}>
                    <FluentText size={300} weight="semibold">
                      {output.out_field_name}
                    </FluentText>
                    <FluentText size={200} style={{ color: tokens.colorNeutralForeground3, marginLeft: tokens.spacingHorizontalS }}>
                      (key: {output.column_key})
                    </FluentText>
                  </div>

                  {/* Statistics Grid */}
                  <div className={styles.statsGrid}>
                    {Object.entries(output.metrics).map(([metric, value]) => (
                      <div key={metric} style={{ padding: tokens.spacingVerticalS }}>
                        <FluentText size={200} style={{ color: tokens.colorNeutralForeground3, display: 'block' }}>
                          {metric.replace(/_/g, ' ')}
                        </FluentText>
                        <FluentText size={400} weight="semibold">
                          {typeof value === 'number' ? value.toLocaleString() : value}
                        </FluentText>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* API Info Popover */}
            <div style={{ marginTop: tokens.spacingVerticalM, display: 'flex', justifyContent: 'flex-end' }}>
              <APIInfoPopover
                title="FRS Rule Metadata API"
                endpoint="/frs/api/v1/Documents"
                method="GET"
                description="Fetches rule metadata including name, description, document type, and custom attributes (dimension, exception flag)"
                baseUrl="https://na1.dm-us.informaticacloud.com"
                parameters={{
                  "$filter": `id eq '${rule.frs_id}'`
                }}
                responseExample={{
                  value: [{
                    id: rule.frs_id,
                    name: rule.name,
                    description: rule.description,
                    documentType: rule.rule_type,
                    customAttributes: {
                      stringAttrs: [
                        { name: "DIMENSION", value: rule.dimension },
                        { name: "EXCEPTION", value: String(rule.is_exception) }
                      ]
                    }
                  }]
                }}
                highlightedFields={['name', 'documentType', 'customAttributes']}
                curlExample={`curl -X GET "https://na1.dm-us.informaticacloud.com/frs/api/v1/Documents?\\$filter=id eq '${rule.frs_id}'" \\
  -H "IDS-SESSION-ID: your_session_token" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json"`}
              />
            </div>
          </div>
        </Card>
      ))
    ) : (
      <Card className={styles.card}>
        <div style={{ padding: tokens.spacingVerticalXL, textAlign: 'center' }}>
          <FluentText size={400}>No rule statistics available for this run</FluentText>
        </div>
      </Card>
    )}
  </>
)}
```

### 2. Update APIInfoPopover Component

**File:** `frontend/src/components/APIInfoPopover.tsx`

**Add Optional curlExample Prop:**
```tsx
export interface APIInfoPopoverProps {
  // ... existing props
  curlExample?: string;  // NEW: Optional cURL command
}

// In component render, after responseExample:
{curlExample && (
  <div style={{ marginTop: tokens.spacingVerticalM }}>
    <Text size={300} weight="semibold" style={{ display: 'block', marginBottom: tokens.spacingVerticalXXS }}>
      cURL Command:
    </Text>
    <pre style={{
      padding: tokens.spacingVerticalS,
      backgroundColor: tokens.colorNeutralBackground3,
      borderRadius: tokens.borderRadiusSmall,
      fontSize: tokens.fontSizeBase200,
      overflow: 'auto'
    }}>
      {curlExample}
    </pre>
  </div>
)}
```

### 3. Navigation Flow

**Profiling Tasks** → **Task Runs** → **Run Details** (with Rule Statistics tab)

1. User clicks on a profiling task
2. Views list of runs for that task
3. Clicks on a specific run
4. Switches to "Rule Statistics" tab
5. Sees:
   - List of rules (grouped by rule, not by column)
   - Rule name, type, dimension, exception flag
   - Input mappings table (source column → rule input port)
   - Output mappings with statistics for each output column
   - API info popover with cURL command for FRS API

## 📊 Data Verification

Run this query to verify data is correct:

```sql
SELECT 
    rm.name as rule_name,
    rm.rule_type,
    rm.dimension,
    rm.is_exception,
    rim.data_source_field_name as input_source,
    rim.in_field_name as input_port,
    rom.out_field_name as output_port,
    rom.column_key,
    COUNT(r.result_id) as metrics_count
FROM dim_rule_mapplet rm
LEFT JOIN fact_rule_input_mapping rim ON rm.rule_mapplet_id = rim.rule_mapplet_id
LEFT JOIN fact_rule_output_mapping rom ON rm.rule_mapplet_id = rom.rule_mapplet_id
LEFT JOIN fact_profiling_result r ON rom.mapping_id = r.rule_output_mapping_id
WHERE rm.profiling_run_id = '{run_id}'
GROUP BY rm.name, rm.rule_type, rm.dimension, rm.is_exception, 
         rim.data_source_field_name, rim.in_field_name, 
         rom.out_field_name, rom.column_key
ORDER BY rm.name, rom.out_field_name
```

Expected output for profile `23a47d79-8d74-45f5-9498-9589ab67b3e7`:

```
rs_compare_string_witn_exception | RULE_SPECIFICATION | CONSISTENCY | 1 | LAST_NAME   | in_str1  | ExceptionDescription | 40012 | 10
rs_compare_string_witn_exception | RULE_SPECIFICATION | CONSISTENCY | 1 | MIDDLE_NAME | in_str2  | ExceptionDescription | 40012 | 10
rs_compare_string_witn_exception | RULE_SPECIFICATION | CONSISTENCY | 1 | NULL        | NULL     | ExceptionPriority    | 40011 | 10
rs_compare_string_witn_exception | RULE_SPECIFICATION | CONSISTENCY | 1 | NULL        | NULL     | isValid              | 40010 | 10
rs_country_Exception             | RULE_SPECIFICATION | VALIDITY    | 1 | COUNTRY     | country  | ExceptionDescription | 40006 | 10
rs_country_Exception             | RULE_SPECIFICATION | VALIDITY    | 1 | NULL        | NULL     | ExceptionPriority    | 40001 | 10
rs_country_Exception             | RULE_SPECIFICATION | VALIDITY    | 1 | NULL        | NULL     | IsCountryValid       | 40009 | 10
```

## 🎯 Summary

- ✅ Backend API complete (`/profiling/runs/{run_id}/rule-statistics`)
- ✅ FRS metadata fetching working (names, types, dimensions)
- ✅ Data syncing correctly (input/output mappings + statistics)
- ⏳ Frontend UI update needed (replace Rule Statistics tab content)
- ⏳ Add cURL example to APIInfoPopover component

The backend is 100% ready. The frontend just needs the Rule Statistics tab restructured to group by rule instead of by column, and display the input/output flow clearly.
