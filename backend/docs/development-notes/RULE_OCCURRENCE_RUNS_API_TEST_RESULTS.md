# Rule Occurrence Runs API Test Results

## Summary

Tested the rule occurrence runs API with multiple authentication methods and URL patterns. The API endpoint could not be successfully accessed with the current configuration.

## Authentication Methods Tested

### 1. JWT Token (Bearer)
- Successfully obtained JWT token via two-step process:
  - Step 1: Login to get session ID
  - Step 2: Exchange session ID for JWT token
- Token format: `Bearer eyJraWQiOiIxQ3dEeXFwNnRwOWZxU0xtS29hSWNHIi...`

### 2. Session ID (INFA-SESSION-ID)
- Successfully obtained session ID from login
- Header format: `INFA-SESSION-ID: {session_id}`

## URL Patterns Tested

### Data360 API Endpoints
1. `{profiling_url}/data360/data-quality/v1/rule-occurrences/{id}/runs`
   - Result: **503 Service Unavailable**

2. `{base_url}/data360/data-quality/v1/rule-occurrences/{id}/runs`
   - Result: **503 Service Unavailable**

### Profiling Service Endpoints
3. `{profiling_url}/profiling-service/api/v1/rule-occurrence/{id}/runs`
   - Result: **HTML login page** (authentication not accepted)

4. `{profiling_url}/profiling-service/api/v1/ruleOccurrence/{id}/runs`
   - Result: **HTML login page** (authentication not accepted)

5. `{profiling_url}/profiling-service/api/v1/rule-occurrences/{id}/runs`
   - Result: **HTML login page** (authentication not accepted)

6. `{base_url}/profiling-service/api/v1/rule-occurrences/{id}/runs`
   - Result: **503 Service Unavailable**

## Test Configuration

- **Base URL**: https://dm-us.informaticacloud.com
- **Profiling URL**: https://na1-dqprofile.dm-us.informaticacloud.com
- **Organization ID**: 6inyp1FQ2QQkemoflBDG8e
- **Test Rule Occurrence ID**: db492631-ec22-45ab-b9cc-ea86f3acfed6

## Findings

### 503 Service Unavailable
The Data360 API endpoints returned 503 errors, which suggests either:
- Data360 service is not enabled/available for this organization
- Data360 service is hosted on a different URL/pod
- Data360 requires different authentication or API access permissions

### HTML Login Page
The profiling service endpoints returned HTML login pages, which suggests:
- The authentication headers (both JWT and INFA-SESSION-ID) are not being recognized by these endpoints
- These endpoints may require a different authentication method
- The endpoints may not exist at these paths

## Questions for User

1. **Is Data360 enabled for your organization?**
   - The rule occurrence runs API is documented as `/data360/data-quality/v1/...`
   - Do you have access to Data360 features in your IDMC environment?

2. **What is the correct base URL for Data360 APIs?**
   - Is it the same as the profiling URL?
   - Is there a separate Data360-specific URL?

3. **Can you provide a working curl example?**
   - A successful API call would help us understand:
     - The exact URL pattern
     - The correct authentication method
     - The expected response format

4. **Alternative: Can you access rule occurrence runs through the IDMC UI?**
   - If yes, we can inspect the network calls to see what endpoint it uses
   - Check browser DevTools → Network tab when viewing rule occurrence history

## Next Steps (Pending User Input)

Once we have the correct endpoint and authentication method:

1. Create backend model `FactRuleOccurrenceRun`:
   - run_id
   - rule_occurrence_id
   - execution_date
   - total_rows
   - failed_rows
   - valid_rows
   - pass_percent
   - status

2. Create service to fetch and store runs

3. Add API endpoint `/profiling/rule-occurrences/{occurrence_id}/runs`

4. Update frontend to display run history in rule occurrence details

## Working APIs (For Reference)

The following APIs are confirmed working:

- **Login**: `{base_url}/identity-service/api/v1/Login`
- **JWT Token**: `{base_url}/identity-service/api/v1/jwt/Token?client_id=cdlg_app&nonce=1234`
- **Rule Occurrences**: `{profiling_url}/profiling-service/api/v1/ruleOccurrence/getAllRuleOccurrencesForProfile_V2_Token/{profileId}`
  - Uses INFA-SESSION-ID header
- **Profiling Results**: `{profiling_url}/metric-store/api/v1/odata/Profiles('{profileId}')/Columns`
  - Uses INFA-SESSION-ID header
