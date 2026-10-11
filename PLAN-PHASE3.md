# Phase 3 Plan: Frontend Integration

## Goals
- [ ] Wire the subscribe drawer/modal to POST /subscribe endpoint
- [ ] Implement owner-only demo key control that keeps key in memory only (never localStorage)
- [ ] Show demo simulation controls only after owner enters valid demo key
- [ ] Role-specific message wording for subscriptions (P1 - if time remains)
- [ ] Recent alerts panel (P1 - if time remains)

## Files to Modify
1. src/App.jsx - Add subscription form handling, demo key validation, and UI controls
2. src/index.css - Add styles for subscribe drawer, demo key input, and alert status panel

## Components to Implement

### 1. Subscribe Drawer/Modal
- Triggered by clicking "Subscribe" button on school cards
- Pre-selects the clicked school in the school selection
- Allows selecting additional schools (up to 10 total)
- Form fields: email, role (parent/principal/pe_teacher), school selection (checkboxes)
- Validation: email format, role selection, at least one school selected
- Submission: POST to /subscribe with {email, role, school_ids}
- Loading state during submission
- Success message: "Check your inbox and click Confirm in the email from AWS Notifications. You won't get alerts until you confirm."
- Error handling for validation errors and server errors
- Close button and backdrop click to close

### 2. Demo Key Control
- Input field for demo key (password type)
- "Validate Key" button
- Validation via POST to /simulate (test call with severity: moderate)
- 403 response indicates invalid key
- Any other response (200, 429 for cooldown) indicates valid key
- Key stored in memory only (React state, never localStorage/sessionStorage)
- After validation success:
  - Set isOwner = true
  - Show demo school simulation controls
  - Clear demo key from memory (security)
- Error message for invalid key
- Loading state during validation

### 3. Demo School Simulation Controls
- Only visible when isOwner = true
- Buttons for severity levels: Moderate, Poor, Very Poor
- Reset button
- Loading state during simulation/reset
- Status display showing SNS result (e.g., "accepted by SNS")
- Respect cooldown (3 min between simulations) and expiry (~10 min)
- Hourly email cap enforcement (5 demo alerts/hour)

### 4. Alert Status Panel (for demo school)
- Shows when demo alerts are sent
- Displays: "Status: accepted by SNS" or error message
- Automatically hides after a timeout or when new simulation starts

### 5. Role-Specific Messaging (P1)
- Different success messages based on role:
  - Parent: Plain language confirmation
  - Principal/PE Teacher: Action-oriented messaging
- Implement if time remains after core functionality

## Implementation Details

### API Integration
- Use existing API_BASE from environment variables
- Handle loading/error states appropriately
- Use proper HTTP methods and headers
- Parse JSON responses
- Handle non-200 responses with error messages from API

### State Management
- React useState for:
  - Form values (email, role, schoolIds)
  - Loading states (subscribeLoading, demoKeyLoading, demoSimulating)
  - Error states (subscribeError, demoKeyError)
  - Success states (subscribeSuccess, demoKeySuccess)
  - UI states (subscribeDrawerOpen, isOwner)
  - Status displays (demoAlertStatus)

### Security Considerations
- Demo key never stored in localStorage or sessionStorage
- Demo key cleared from memory immediately after validation
- Client-side validation supplemented by server-side validation
- Proper error handling without leaking sensitive information
- Input sanitization where appropriate

### User Experience
- Mobile-first responsive design
- Accessible form controls with proper labels
- Loading states for asynchronous operations
- Clear success and error messages
- Visual feedback for disabled states
- Focus management for modal/drawer (basic implementation)

## Build Order Verification
This phase follows the FRONTEND.md build order:
1. [x] Dashboard against existing GET /schools (Completed in Phase 1)
2. [x] Backend: two topics, /subscribe, demo key (Completed in Phase 2)
3. [ ] Wire the subscribe drawer (This phase)
4. [ ] Plus the owner-only demo key control (This phase)
5. [ ] P1 only if time remains: role-specific message wording, recent alerts

## Success Criteria
- [ ] Subscribe form opens when clicking Subscribe on a school card
- [ ] Form pre-selects the clicked school
- [ ] User can select additional schools (max 10)
- [ ] Form validates email format, role selection, and school selection
- [ ] Submission calls POST /subscribe with correct payload
- [ ] Loading state shown during submission
- [ ] Success message shown on 202 response
- [ ] Error messages shown for validation and server errors
- [ ] Demo key validation works via test call to /simulate
- [ ] Demo key accepted only with correct header
- [ ] Demo key cleared from memory after validation
- [ ] Demo school controls shown only after validation success
- [ ] Simulation buttons work and call appropriate endpoints
- [ ] Alert status shows SNS response
- [ ] No demo key stored in localStorage or visible in devtools
- [ ] Responsive design works on mobile and desktop