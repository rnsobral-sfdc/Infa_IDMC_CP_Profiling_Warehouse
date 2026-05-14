# IDMC Profiling API Endpoints Reference

Complete reference for all IDMC APIs used to extract profiling data and metadata.

## Authentication

All API calls require authentication using session token obtained from login.

**Login API:**
```
POST https://{base_url}/ma/api/v2/user/login
Content-Type: application/json

{
  "username": "your-username",
  "password": "your-password"
}

Response:
{
  "userInfo": { "sessionId": "..." },
  "products": [
    { "name": "Data Integration", "baseApiUrl": "https://na1.dm-us.informaticacloud.com" }
  ]
}
```

**Headers for Authenticated Calls:**
- `INFA-SESSION-ID: {sessionId}` (for base URL APIs)
- `IDS-SESSION-ID: {sessionId}` (for profiling service APIs)

---

## 1. Connection Details API

**Purpose:** Fetch detailed connection metadata including hierarchy, connection type, and FRS document details.

**Endpoint:**
```
GET https://{base_url}/frs/api/v1/Documents('{connectionId}')
```

**Parameters:**
- `connectionId` - FRS connection document ID (from profiling task metadata)

**Response Example:**
```json
{
  "id": "au6XBDuPoLffGnbj0LBsso",
  "name": "Oracle_RNS",
  "description": null,
  "owner": "453QHuYGjnIldBi1sDw6CS",
  "createdBy": "453QHuYGjnIldBi1sDw6CS",
  "createdTime": "2019-11-22T21:10:08Z",
  "lastUpdatedTime": "2023-08-31T05:53:50Z",
  "documentType": "SAAS_CONNECTION",
  "documentState": "COMPLETE",
  "aclRule": "org",
  "parentInfo": [
    {
      "parentId": "bynSJ9htKIAlQPHWHUrnW1",
      "parentName": "SYS",
      "parentType": "Space"
    },
    {
      "parentId": "7dwUlbmNkGadOMiPq3CfMf",
      "parentName": "_SYSTEM_PROJECT",
      "parentType": "Project"
    }
  ],
  "customAttributes": {
    "stringAttrs": [
      {
        "name": "CONNECTION_TYPE",
        "value": "Oracle"
      },
      {
        "name": "CONNECTION_SUB_TYPE",
        "value": ""
      }
    ]
  },
  "repoInfo": {
    "repoHandle": "010X4V0B00000000000A"
  }
}
```

**Mapped to:** `dim_connection` table

**Key Fields:**
- `id` → `connection_id`
- `name` → `connection_name`
- `customAttributes.stringAttrs.CONNECTION_TYPE` → `connection_type`
- `customAttributes.stringAttrs.CONNECTION_SUB_TYPE` → `connection_sub_type`
- `parentInfo` → `space_id`, `space_name`, `project_id`, `project_name`, `folder_id`, `folder_name`

---

## 2. Rule Occurrences API

**Purpose:** Fetch rule occurrences for a profiling task, including thresholds, targets, criticality, and mapplet column mappings.

**Endpoint:**
```
GET https://{profiling_url}/profiling-service/api/v1/ruleOccurrence/getAllRuleOccurrencesForProfile_V2_Token/{profileId}
```

**Parameters:**
- `profileId` - Profiling task FRS ID (from `dim_profiling_task.frs_id`)

**Response Example:**
```json
[
  {
    "id": "edf9102c-c3c8-4c4f-87bb-56139190f6bb",
    "status": "READ",
    "metadata": "",
    "ruleOccurrenceRM": {
      "id": "edf9102c-c3c8-4c4f-87bb-56139190f6bb",
      "name": "UNIQUENESS_FullName_IsValid",
      "description": "Uniqueness of FullName based on Uniqueness Check insight (recommended by CLAIRE)",
      "ruleFRSId": "1OZil2j1Do6ixRyRpNpDS8",
      "threshold": "84.0",
      "target": "95.0",
      "measuringMethod": "InformaticaCloudDataQuality",
      "frequency": "Daily",
      "criticality": "High",
      "type": "Uniqueness",
      "mappletColumnId": "52d99784-ebc2-42fd-8332-aa2c5b889a90"
    }
  }
]
```

**Mapped to:** `dim_rule_occurrence` table

**Key Fields:**
- `ruleOccurrenceRM.id` → `occurrence_id`
- `ruleOccurrenceRM.ruleFRSId` → `rule_frs_id` (links to `dim_rule_mapplet.frs_id`)
- `ruleOccurrenceRM.mappletColumnId` → `mapplet_column_id` (links to `fact_rule_output_mapping.mapping_id`)
- `ruleOccurrenceRM.threshold` → `threshold`
- `ruleOccurrenceRM.target` → `target`
- `ruleOccurrenceRM.criticality` → `criticality`
- `ruleOccurrenceRM.type` → `type`

---

## 3. Run Detail API

**Purpose:** Fetch detailed metadata for a profiling run including data source fields, rules, input/output mappings, sampling settings, and coverage statistics.

**Endpoint:**
```
GET https://{profiling_url}/profiling-service/api/v1/runDetail/{runId}
```

**Parameters:**
- `runId` - Profiling run ID

**Response Structure:**
```json
{
  "id": "run-uuid",
  "profileId": "profile-uuid",
  "runKey": "2",
  "status": "COMPLETED",
  "startTime": 1620000000000,
  "endTime": 1620003600000,
  "executionTimeMs": 3600000,
  "samplingType": "ALL_ROWS",
  "samplingRows": -1,
  "isFilterEnabled": false,
  "rowsProcessed": 1500000,
  "numberOfDSColumns": 25,
  "numberOfRules": 5,
  "numberOfMappletColumns": 10,
  "numberOfColumns": 35,
  "runCostMb": 250.5,
  "isDetectOutlier": true,
  "profiledFields": [
    {
      "id": "field-uuid",
      "columnKey": 10013,
      "sourceName": "CUSTOMER",
      "fieldName": "FAX_NUMBER",
      "precision": 26,
      "scale": 0,
      "fieldType": "DATASOURCEFIELD",
      "isDeleted": false,
      "appliedBy": "USER"
    },
    {
      "id": "rule-uuid",
      "frsId": "2hzPQevNLuHj9BmWBUjNMJ",
      "ruleType": "RULE_SPECIFICATION",
      "fieldType": "MAPPLETFIELD",
      "isDeleted": false,
      "appliedBy": "USER",
      "inputFieldMappings": [
        {
          "id": "mapping-uuid",
          "dataSourceFieldName": "LAST_NAME",
          "inFieldName": "in_str1",
          "dataSourceFieldPrecision": 100,
          "dataSourceFieldScale": 0
        }
      ],
      "outputFieldMappings": [
        {
          "id": "output-uuid",
          "columnKey": 40011,
          "datatype": "string",
          "outFieldName": "ExceptionPriority",
          "label": null
        }
      ]
    }
  ]
}
```

**Mapped to Multiple Tables:**

1. **`dim_profiling_run` Enhancement:**
   - `samplingType`, `samplingRows`, `isFilterEnabled`
   - `rowsProcessed`, `numberOfDSColumns`, `numberOfRules`, `numberOfMappletColumns`
   - `runCostMb`, `isDetectOutlier`

2. **`dim_data_source_field` (DATASOURCEFIELD):**
   - `id` → `field_id`
   - `columnKey` → `column_key`
   - `sourceName` → `source_name`
   - `fieldName` → `field_name`
   - `precision`, `scale`

3. **`dim_rule_mapplet` (MAPPLETFIELD):**
   - `id` → `rule_mapplet_id`
   - `frsId` → `frs_id`
   - `ruleType` → `rule_type`

4. **`fact_rule_input_mapping`:**
   - `inputFieldMappings[].id` → `mapping_id`
   - `dataSourceFieldName`, `inFieldName`
   - `dataSourceFieldPrecision`, `dataSourceFieldScale`

5. **`fact_rule_output_mapping`:**
   - `outputFieldMappings[].id` → `mapping_id`
   - `columnKey` → `column_key` (used to join with profiling results)
   - `outFieldName`, `datatype`, `label`

---

## 4. Column Statistics API

**Purpose:** Fetch profiling statistics for a specific profiling run.

**Endpoint:**
```
GET https://{profiling_url}/profiling-service/api/v1/profile/{profileId}/run/{runKey}
```

**Parameters:**
- `profileId` - Profile ID
- `runKey` - Run key/number

**Mapped to:** `fact_profiling_result` table

---

## 5. Column Patterns API

**Purpose:** Fetch inferred data patterns for a specific column.

**Endpoint:**
```
GET https://{profiling_url}/metric-store/api/v1/odata/Profiles('{profileId}')/Columns('{columnId}')/InferredPatterns?$filter=RunKey eq {runKey}
```

**Mapped to:** `fact_column_pattern` table

---

## 6. Column Data Types API

**Purpose:** Fetch documented and inferred data types with frequency counts.

**Endpoint:**
```
GET https://{profiling_url}/metric-store/api/v1/odata/Profiles('{profileId}')/Columns('{columnId}')/InferredDataTypes?$filter=RunKey eq {runKey}
```

**Mapped to:** `fact_column_datatype` table

---

## 7. Column Value Frequencies API

**Purpose:** Fetch top N most frequent values sorted by frequency.

**Endpoint:**
```
GET https://{profiling_url}/metric-store/api/v1/odata/Profiles('{profileId}')/Columns('{columnId}')/FrequentValueDistribution?$filter=RunKey eq {runKey}&$top=100&$orderby=Frequency desc
```

**Mapped to:** `fact_column_value_frequency` table

---

## Data Flow Summary

```
1. Login → Get sessionId
2. Fetch Profiles → Get all profiling tasks
3. For each profile:
   a. Fetch Connection Details → dim_connection
   b. Fetch Rule Occurrences → dim_rule_occurrence
   c. Fetch Profile Objects → Get path/hierarchy
   d. Fetch Run History → dim_profiling_run
   e. For each run:
      - Fetch Run Detail → dim_data_source_field, dim_rule_mapplet, 
                          fact_rule_input_mapping, fact_rule_output_mapping
      - Fetch Column Statistics → fact_profiling_result
      - Fetch Patterns → fact_column_pattern
      - Fetch Data Types → fact_column_datatype
      - Fetch Value Frequencies → fact_column_value_frequency
```

---

## Curl Examples

### Connection Details
```bash
curl -X GET \
  'https://na1.dm-us.informaticacloud.com/frs/api/v1/Documents('\''au6XBDuPoLffGnbj0LBsso'\'')' \
  -H 'INFA-SESSION-ID: your-session-id' \
  -H 'Accept: application/json'
```

### Rule Occurrences
```bash
curl -X GET \
  'https://na1-dqprofile.dm-us.informaticacloud.com/profiling-service/api/v1/ruleOccurrence/getAllRuleOccurrencesForProfile_V2_Token/profile-uuid' \
  -H 'IDS-SESSION-ID: your-session-id' \
  -H 'Accept: application/json'
```

### Run Detail
```bash
curl -X GET \
  'https://na1-dqprofile.dm-us.informaticacloud.com/profiling-service/api/v1/runDetail/run-uuid' \
  -H 'IDS-SESSION-ID: your-session-id' \
  -H 'Accept: application/json'
```
