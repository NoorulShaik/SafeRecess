# Phase 2 Plan: Backend Implementation - COMPLETED

## Goals
- [x] Implement two SNS topics: SchoolAlertsTopic (public) and DemoAlertsTopic (existing)
- [x] Implement POST /subscribe endpoint with validation and subscription management
- [x] Add abuse limits (throttling, per-email cooldown, school cap)
- [x] Add demo key protection for /simulate endpoints
- [x] Update alert emails to include required data credits and demo project line
- [x] Add necessary IAM permissions
- [x] Keep existing AlertTopic unchanged (for demo/owner alerts only)

## Files Modified
1. [x] template.yaml - Added new SNS topic, parameters, and IAM permissions
2. [x] backend/lambda/api.js - Updated POST /subscribe, added demo key validation, updated alert formatting
3. [x] backend/lambda/alerts.js - Updated alert formatting to include required credits and demo line, enhanced subscription handling
4. [x] Created test files for validation scenarios

## Components Implemented
### 1. Template Updates
- [x] Added SchoolAlertsTopic resource (AWS::SNS::Topic)
- [x] Added DEMO_KEY parameter (NoEcho: true)
- [x] Added AllowedOrigin parameter (default "*")
- [x] Added IAM permissions for SchoolAlertsTopic (Subscribe, ListSubscriptionsByTopic, SetSubscriptionAttributes)
- [x] Updated ApiFunction environment to reference both topics
- [x] Updated ApiFunction policies to include permissions for new topic
- [x] Updated CORS configuration to use AllowedOrigin parameter
- [x] Kept existing AlertTopic unchanged

### 2. API Handler Updates
- [x] Added demo key validation middleware for /simulate and /simulate/reset
- [x] Implemented POST /subscribe with:
  - [x] Email validation
  - [x] Role validation (parent/principal/pe_teacher)
  - [x] School ID validation (exist and not demo school)
  - [x] Subscription merging logic (update existing filter policy)
  - [x] Throttling and cooldown limits
  - [x] Support for school_ids array (max 10 schools)
- [x] Updated alert publishing to use appropriate topic based on school type
- [x] Alert emails include data credits line and "Sample school: demo project."

### 3. Alerts Updates
- [x] Modified formatAlertMessage to include required data credits and "Sample school: demo project." line
- [x] Enhanced subscribeEmailToSchool to handle multiple schools and merge subscriptions
- [x] Added proper status determination (pending confirmation vs confirmed)
- [x] Demo alerts use DemoAlertsTopic and school alerts use SchoolAlertsTopic

### 4. Testing
- [x] Created comprehensive test suite for subscription endpoint validation
- [x] Tests for missing/invalid inputs
- [x] Tests for demo school rejection
- [x] Tests for abuse prevention (throttling, cooldown, school limits)
- [x] Tests for demo key validation
- [x] Tests for subscription merging functionality

## Steps Completed
1. [x] Updated template.yaml with new resources and parameters
2. [x] Modified alerts.js to update alert formatting and subscription handling
3. [x] Updated api.js with subscribe endpoint and demo key validation
4. [x] Created test files for validation scenarios
5. [x] Ran sam validate and sam build successfully

## Verification
- [x] Template validation passed
- [x] Project build succeeded
- [x] All backend changes committed
- [x] Security constraints maintained (no secrets in repo, demo key protection)