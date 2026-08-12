# Smart Fill Floating Mode — Android/Flutter Implementation Prompt

## Purpose

Add a **Smart Fill Floating Mode** to the existing Flutter application.

This is **not a specification for rebuilding the whole application**.

The existing app already has the document/profile system. This task is only for implementing the **Start Smart Fill button, Android permissions, floating control, Chrome/browser interaction, HTML/form analysis, field matching, and user-confirmed autofill workflow**.

Target platform for the floating feature:

- Android
- Flutter UI
- Native Android/Kotlin integration where Flutter cannot provide the required OS functionality

iOS must not be treated as if it supports Android-style system floating overlays.

---

# 1. Main User Flow

Implement this exact flow:

```text
Existing App
    ↓
Smart Fill Section
    ↓
User taps "Start Smart Fill"
    ↓
Check required Android permissions
    ↓
Request missing permissions
    ↓
Permission setup complete
    ↓
Start Smart Fill
    ↓
Create Android floating overlay
    ↓
User minimizes/leaves the app
    ↓
Floating Smart Fill button remains visible
    ↓
User opens Chrome
    ↓
User opens a supported form
    ↓
User taps floating Smart Fill button
    ↓
Analyze the current page/form
    ↓
Read available form structure/HTML where technically accessible
    ↓
Detect input fields
    ↓
Match fields with approved user data
    ↓
Calculate confidence
    ↓
Show review/confirmation when required
    ↓
Fill approved fields
    ↓
Show result
    ↓
User manually reviews and submits the website
```

---

# 2. Important Architecture Rule

Do NOT assume that an Android overlay automatically gives access to Chrome's HTML.

These are separate capabilities:

### Overlay permission

Used for:

```text
Floating Smart Fill button
```

### Accessibility Service

Can provide Android UI-level interaction with other applications where permitted.

It does NOT automatically provide unrestricted access to every website's raw HTML.

### WebView / controlled browser

If the application itself loads the website in a WebView, the app can use JavaScript/DOM APIs in that controlled WebView.

### Browser extension / supported browser integration

For actual Chrome page DOM access, use a supported browser-extension/integration architecture where available.

The implementation must select the correct architecture instead of pretending that an overlay can directly read Chrome's DOM.

---

# 3. Smart Fill Start Button

Existing UI should contain:

```text
┌──────────────────────────────┐
│                              │
│        Smart Fill            │
│                              │
│    [ Start Smart Fill ]      │
│                              │
└──────────────────────────────┘
```

When pressed:

```text
onStartSmartFill()
```

must run a permission/state-check flow.

Do not immediately start the service if required permissions are missing.

---

# 4. Permission Manager

Create a dedicated Android permission manager.

Suggested architecture:

```text
Flutter
   ↓
SmartFillPermissionManager
   ↓
MethodChannel
   ↓
Native Android Kotlin
```

The Flutter layer controls UI.

The native Android layer handles Android-specific permissions and services.

---

# 5. Permission Step 1 — Display Over Other Apps

The first required permission is the Android:

**Display over other apps**

This permission is required for the floating Smart Fill control.

Show a clear explanation before opening Android Settings.

Example:

```text
Enable Floating Smart Fill

Smart Fill needs permission to display a small
floating control while you use another app.

This allows you to start or pause Smart Fill
without returning to this application.

[Enable Permission]
```

Then open the appropriate Android system settings page.

Do NOT attempt to silently grant this permission.

After the user returns:

```text
Check permission again.
```

Never assume that opening Settings means permission was granted.

---

# 6. Permission Step 2 — Accessibility

If the chosen Android implementation uses Accessibility Service for cross-application UI interaction, explain it separately.

Example:

```text
Enable Smart Fill Access

Smart Fill uses Android's Accessibility framework
to identify compatible visible form controls and
perform user-requested interactions.

It only operates when Smart Fill is explicitly active.

[Open Accessibility Settings]
```

After returning:

```text
Check Accessibility Service status again.
```

The application must not activate the Smart Fill service before the user explicitly enables it.

Follow Android and Google Play policies for Accessibility usage.

Do not disguise an Accessibility Service as another feature.

---

# 7. Permission Status Screen

Create a dedicated setup screen.

Example:

```text
Smart Fill Setup

✓ Display over other apps
✓ Accessibility access

Smart Fill is ready.

[Start Smart Fill]
```

If something is missing:

```text
Smart Fill Setup

✓ Display over other apps
✕ Accessibility access

[Enable]
```

Use clear status indicators.

---

# 8. Start State

Once permissions are available, pressing:

```text
Start Smart Fill
```

should:

1. Validate permission state.
2. Start the native Smart Fill service.
3. Create the floating overlay.
4. Store Smart Fill state as active.
5. Return the user to the normal app state.
6. Allow the user to minimize the application.

State:

```text
SMART_FILL_ACTIVE
```

---

# 9. Floating Smart Fill Button

Create a native Android floating overlay.

Visual concept:

```text
┌──────────────────────────────┐
│                              │
│       Chrome                 │
│                              │
│   Name [____________]        │
│                              │
│   Email [___________]         │
│                         ◉    │
│                              │
└──────────────────────────────┘
                           ↑
                    Smart Fill
```

The floating button should:

- Be small
- Be draggable
- Stay above supported applications
- Avoid blocking normal controls
- Have accessible content description
- Have visible active/inactive states
- Provide pause/stop controls
- Be removable when Smart Fill is stopped

---

# 10. Floating Button Interaction

When the user taps the floating button:

Show a compact control panel:

```text
Smart Fill

Status: Ready

[Fill Form]
[Pause]
[Stop]
```

Do not automatically fill immediately if sensitive fields are detected.

---

# 11. Pause

When user taps:

```text
Pause
```

change state to:

```text
SMART_FILL_PAUSED
```

Floating control remains visible.

Example:

```text
Smart Fill
Paused

[Resume]
[Stop]
```

No field interaction should occur while paused.

---

# 12. Stop

When user taps:

```text
Stop
```

the application must:

1. Stop the active Smart Fill operation.
2. Remove the floating overlay.
3. Stop the relevant service/session.
4. Clear temporary page/session data.
5. Return state to:

```text
SMART_FILL_OFF
```

The user must be able to stop Smart Fill at any time.

---

# 13. Opening Chrome

After Smart Fill is active:

```text
User minimizes app
        ↓
Floating button remains
        ↓
User opens Chrome
        ↓
User navigates to a website
```

Do not automatically navigate the user to arbitrary websites.

The user controls the browser.

---

# 14. Detect Current Page

When the user presses:

```text
Fill Form
```

the system should determine whether the current screen is supported.

Possible states:

```text
ANALYZING
SUPPORTED
PARTIALLY_SUPPORTED
UNSUPPORTED
ERROR
```

Example:

```text
Analyzing form...

Detecting fields
Matching profile data
Checking field types
```

---

# 15. HTML / DOM Handling

The implementation must distinguish between:

## A. App-controlled WebView

If the website is opened inside the application's WebView:

Use JavaScript/DOM APIs to inspect the page.

Possible DOM targets:

```html
<input>
<textarea>
<select>
<button>
<label>
<form>
```

Read only information necessary to identify form fields.

Example conceptual extraction:

```text
field.type
field.name
field.id
field.placeholder
field.autocomplete
associated label
visible text
input value state
```

Do not collect the entire webpage unnecessarily.

## B. External Chrome

A normal Flutter app cannot simply request Chrome's complete DOM.

For Chrome, implement only a technically and policy-supported integration.

Possible approaches include:

- supported browser extension architecture where applicable
- Android Accessibility UI interaction where appropriate
- opening the site inside the app's controlled WebView instead

Do NOT fake DOM access.

Do NOT attempt to bypass Chrome security.

---

# 16. Form Field Detection

For supported pages, identify fields such as:

```text
text
email
tel
number
date
address
postal code
select
checkbox
radio
textarea
```

Also inspect semantic hints:

```text
name
id
label
placeholder
autocomplete
aria-label
input type
```

Example:

```text
Field detected:

Label: Full Name
Type: text
Name: full_name
ID: applicant-name
```

---

# 17. Field Matching Engine

Match detected fields against the user's approved data.

Example:

```text
Website field:
"Mobile Number"

Possible profile values:
phone
mobile
contact_number

Match:
profile.phone

Confidence:
98%
```

Another example:

```text
Website field:
"Applicant Name"

Possible matches:
name
full_name
document_name

Match:
profile.fullName

Confidence:
96%
```

Use multiple signals rather than only the field label.

---

# 18. Matching Signals

Use:

- field label
- input name
- input ID
- placeholder
- autocomplete attribute
- input type
- surrounding text
- semantic aliases
- previously approved mapping

Example aliases:

```text
phone:
mobile
mobile number
telephone
telephone number
contact number
phone number

name:
name
full name
applicant name
customer name
candidate name
```

Create a centralized mapping system so aliases can be updated without rewriting the entire application.

---

# 19. Confidence System

Every proposed mapping must have a confidence score.

Example:

```text
Full Name
Confidence: 99%

Phone
Confidence: 97%

Date of Birth
Confidence: 95%

PAN
Confidence: 88%
```

Suggested behavior:

```text
95–100%
High confidence

80–94%
Require user review

Below 80%
Do not automatically fill
```

These thresholds should be configurable.

---

# 20. Sensitive Data Protection

Sensitive fields require additional confirmation.

Examples:

```text
Aadhaar
PAN
Date of birth
Phone
Email
Address
Identity document uploads
```

For sensitive values:

```text
PAN
ABCDE•••••

[Confirm]
[Skip]
```

Never display unnecessary full sensitive values in the floating UI.

---

# 21. Review Screen

Before filling sensitive or uncertain fields:

```text
Smart Fill Review

✓ Full Name
  ANAM JASIYA

✓ Phone
  +91 XXXXXXX123

✓ Email
  user@example.com

⚠ PAN
  ABCDE•••••

⚠ Date of Birth
  Please confirm

[Fill Selected]
[Cancel]
```

The user explicitly approves the selected fields.

---

# 22. Filling Logic

After confirmation:

```text
Approved fields
      ↓
Field interaction layer
      ↓
Fill one field
      ↓
Verify field accepted the value
      ↓
Move to next field
      ↓
Continue
```

Do not blindly assume that every field accepted the value.

After filling:

```text
6 fields filled
2 fields skipped
1 field requires manual input
```

---

# 23. Website Compatibility

Different websites may use:

- normal HTML inputs
- JavaScript controls
- custom dropdowns
- iframes
- shadow DOM
- dynamically generated fields
- masked inputs
- multi-step forms

The Smart Fill engine should detect unsupported structures and report them.

Example:

```text
This field could not be safely identified.

Please fill it manually.
```

Do not use unsafe heuristics to force a value into an unrelated control.

---

# 24. CAPTCHA / Security Controls

The system must NOT:

- bypass CAPTCHA
- defeat anti-bot systems
- bypass login
- bypass OTP
- bypass website authentication
- defeat security controls
- bypass access restrictions
- automatically solve security challenges

If CAPTCHA or another security challenge appears:

```text
Security verification detected.

Please complete this step manually.
```

Then Smart Fill can continue only if the page remains supported and the user explicitly resumes it.

---

# 25. Legal / Consent Fields

Do not automatically accept:

```text
Terms and Conditions
Privacy Policy
Consent
Declarations
Legal agreements
Electronic signatures
```

These must remain user-controlled.

Example:

```text
Consent field detected.

Please review and select this manually.
```

---

# 26. Payment Fields

Do not automatically submit payments.

Payment-related fields should be treated as sensitive.

Never automatically:

- enter payment authorization
- submit payment
- confirm a purchase
- click final payment buttons

The user must remain in control.

---

# 27. Form Submission

The system must NEVER automatically submit the final form.

After filling:

```text
Smart Fill Complete

Fields filled: 7
Fields skipped: 2
Manual fields: 1

Please review the website before submitting.

[Return to Form]
```

The user manually presses the website's Submit button.

---

# 28. Temporary Data Handling

During Smart Fill:

```text
Website field data
        ↓
Temporary session memory
        ↓
Match
        ↓
User confirmation
        ↓
Fill
        ↓
Clear temporary session data
```

Do not permanently store arbitrary webpage content.

Do not save entire HTML documents unless there is a legitimate, explicitly documented reason.

---

# 29. Logging

Never log:

```text
Aadhaar number
PAN
OTP
password
full identity-document contents
authentication tokens
payment information
full form values
```

Instead log:

```text
Smart Fill started
Form analysis completed
7 fields detected
5 fields matched
2 fields skipped
Smart Fill stopped
```

---

# 30. Flutter ↔ Android Architecture

Recommended:

```text
Flutter UI
   │
   ├── SmartFillController
   │
   ├── PermissionManager
   │
   └── MethodChannel
          │
          ▼
Android Kotlin
   │
   ├── OverlayService
   ├── SmartFillAccessibilityService
   ├── PermissionManager
   ├── FormInteractionEngine
   └── SessionManager
```

Use Flutter for:

- screens
- buttons
- state
- review UI
- user preferences

Use native Android for:

- overlay
- Android permissions
- service lifecycle
- Accessibility integration where justified
- Android-specific UI interaction

---

# 31. Suggested Flutter States

Create:

```text
SmartFillState.off
SmartFillState.permissionRequired
SmartFillState.ready
SmartFillState.starting
SmartFillState.active
SmartFillState.analyzing
SmartFillState.reviewRequired
SmartFillState.filling
SmartFillState.completed
SmartFillState.paused
SmartFillState.error
```

The UI must react to state changes.

---

# 32. MethodChannel API

Create a clearly defined native bridge.

Conceptual methods:

```text
checkOverlayPermission()
requestOverlayPermission()

checkAccessibilityPermission()
openAccessibilitySettings()

startSmartFill()
pauseSmartFill()
resumeSmartFill()
stopSmartFill()

getSmartFillStatus()

analyzeCurrentPage()
getDetectedFields()

requestFillConfirmation()

fillApprovedFields()
```

The actual implementation must use Android-supported APIs.

---

# 33. Android Service Lifecycle

Do not create an uncontrolled background process.

When Smart Fill starts:

```text
User explicitly starts
        ↓
Foreground/service requirements checked
        ↓
Overlay created
        ↓
Session active
```

When stopped:

```text
Overlay removed
Service stopped where appropriate
Temporary session data cleared
```

Respect Android background execution and foreground-service rules for the target Android version.

---

# 34. Floating Button Design

Use the existing application's visual identity.

Recommended:

- 3D-inspired circular button
- Soft shadow
- Small Smart Fill icon
- Active pulse only when useful
- Drag support
- Long press → settings/stop
- Tap → Smart Fill controls

Example:

```text
        ◉
     Smart Fill
```

Do not make the animation continuously consume CPU.

---

# 35. Floating Control Menu

On tap:

```text
┌─────────────────────┐
│ Smart Fill          │
│                     │
│ ● Active            │
│                     │
│ [Fill Form]         │
│ [Pause]             │
│ [Stop]              │
└─────────────────────┘
```

On pause:

```text
┌─────────────────────┐
│ Smart Fill          │
│                     │
│ ⏸ Paused            │
│                     │
│ [Resume]            │
│ [Stop]              │
└─────────────────────┘
```

---

# 36. Error Handling

Examples:

### Missing overlay permission

```text
Floating permission is required.
```

### Missing Accessibility permission

```text
Smart Fill interaction permission is required.
```

### Unsupported page

```text
This page is not supported for Smart Fill.
```

### No fields

```text
No compatible form fields were detected.
```

### Low confidence

```text
Some fields could not be safely matched.
```

### Security challenge

```text
Manual verification is required.
```

---

# 37. Security Requirements

Implement:

- HTTPS
- secure token storage
- encrypted local sensitive storage
- biometric protection
- session expiration
- authorization checks
- no sensitive logs
- temporary-data cleanup
- secure document access
- permission checks before every sensitive operation

Never put:

```text
API secrets
private keys
encryption master keys
production credentials
```

inside Flutter source code.

---

# 38. Testing

Test the following sequence on real Android devices:

```text
1. Open app
2. Open Smart Fill
3. Tap Start Smart Fill
4. Display permission missing
5. Open Android Settings
6. Enable permission
7. Return to app
8. Accessibility permission missing
9. Enable required service
10. Return to app
11. Start Smart Fill
12. Minimize app
13. Verify floating button
14. Open Chrome
15. Open a test form
16. Tap floating Smart Fill
17. Analyze supported fields
18. Display matches
19. Review sensitive fields
20. Confirm
21. Fill approved fields
22. Verify results
23. Stop Smart Fill
24. Verify overlay disappears
25. Verify temporary data is cleared
```

Use a test website/form owned or controlled by the development team for automated testing.

---

# 39. Performance Requirements

The floating service must be lightweight.

Avoid:

- continuous page polling
- continuous screenshots
- unnecessary OCR
- constant DOM/UI scanning
- high-frequency animations
- storing full webpage contents

Analyze only when the user presses:

```text
Fill Form
```

or when another explicitly justified event occurs.

---

# 40. Final Acceptance Criteria

The feature is complete when:

- [ ] Smart Fill has a Start button.
- [ ] Start checks permissions.
- [ ] Display-over-other-apps permission is requested correctly.
- [ ] Accessibility permission is requested only if required by the selected architecture.
- [ ] Permission status is rechecked after returning from Settings.
- [ ] Floating Smart Fill button appears after activation.
- [ ] Floating button can be dragged.
- [ ] Floating button can be paused.
- [ ] Floating button can be stopped.
- [ ] Stopping removes the floating overlay.
- [ ] User can minimize the app while the supported Smart Fill session remains active.
- [ ] User can open Chrome manually.
- [ ] The system can analyze supported forms through a technically supported integration.
- [ ] Form fields are identified using semantic information.
- [ ] Fields are matched against approved user data.
- [ ] Confidence scoring is implemented.
- [ ] Sensitive fields require confirmation.
- [ ] Unsupported fields are skipped rather than guessed.
- [ ] CAPTCHA/security challenges are not bypassed.
- [ ] Legal consent is not automatically accepted.
- [ ] Payment/final submission is not automatically performed.
- [ ] User can review the completed form before submitting.
- [ ] Sensitive values are not written to logs.
- [ ] Temporary page/session data is cleared appropriately.
- [ ] Android service lifecycle follows current Android requirements.
- [ ] The implementation does not falsely claim unrestricted Chrome DOM access.
- [ ] A controlled WebView/browser-extension approach is used where raw HTML/DOM access is required.

---

# 41. Developer Instruction

Implement this as an **addition to the existing Flutter application**, not as a new application.

First inspect the existing:

```text
Smart Fill screen
Start button
Flutter state management
Android configuration
navigation
```

Then integrate the feature into the existing architecture.

Do not rewrite unrelated parts of the application.

Prioritize:

```text
Correct permissions
      ↓
Reliable floating control
      ↓
Correct Android service lifecycle
      ↓
Supported browser/form interaction
      ↓
Accurate field matching
      ↓
User confirmation
      ↓
Safe filling
```

The goal is a smooth experience where the user can start Smart Fill, minimize the app, see the floating Smart Fill control while using supported Android applications/browser flows, and use that control to initiate accurate, user-approved form filling.
