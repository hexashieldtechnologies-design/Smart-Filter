# Secure Smart Fill — Floating Control, Local Documents, AI Screen Analysis & Auto Fill
## Detailed Implementation Prompt for the AI Coding Agent

> **Project type:** Mobile Smart Fill / Secure Vault
>
> **Target:** Android + iOS
>
> **Primary UI:** Compact floating Smart Fill control with a radial/mini-panel interaction
>
> **Data model:** Local-first, encrypted, offline-capable
>
> **Important:** Do not rebuild the application from scratch. Modify the existing Smart Fill/Secure Vault architecture and preserve existing working functionality.

---

# 1. MAIN OBJECTIVE

Implement a polished floating Smart Fill system with the following flow:

```text
USER OPENS APP
      ↓
UNLOCK LOCAL VAULT
      ↓
START SMART FILL
      ↓
FLOATING ROUND CONTROL APPEARS
      ↓
USER TAPS FLOATING CONTROL
      ↓
COMPACT FLOATING PANEL OPENS
      ↓
FOUR ROUND ACTION BUTTONS
      │
      ├── Files
      ├── See This Screen / AI Analyze
      ├── Start Fill Up
      └── Close
```

The floating panel must look like a **native premium mobile mini-tool**, not like four random buttons placed over the screen.

It should use:

- Glassmorphism
- Liquid-glass appearance
- Soft blur
- Rounded surfaces
- Subtle depth
- Smooth spring animation
- 3D-style elevation
- Clear icons
- Haptic feedback where available
- Dark/light theme support
- Small footprint
- No obstruction of the current webpage/app

---

# 2. IMPORTANT DATA PRINCIPLE

The local encrypted vault remains the source of truth.

Documents uploaded by the user:

```text
Aadhaar
PAN
Passport
Driving Licence
Resume
Profile photo
Other supported documents
```

must remain stored locally according to the existing secure-storage architecture.

The system should keep two separate concepts:

```text
ORIGINAL DOCUMENT
        +
OPTIMIZED UPLOAD COPY
        +
STRUCTURED JSON
```

Do NOT destroy the original document when creating an optimized 50 KB upload copy.

---

# 3. DOCUMENT UPLOAD FLOW

When user uploads a document:

```text
Select Document
      ↓
Validate file
      ↓
Store original securely
      ↓
Create optimized upload copy if required
      ↓
Run document analysis
      ↓
Extract structured fields
      ↓
Normalize values
      ↓
Validate
      ↓
Show user review
      ↓
User confirms
      ↓
Save structured JSON locally
      ↓
Mark document as READY ✓
```

The analysis happens **at document upload time**.

Do NOT repeatedly OCR the document every time Smart Fill is pressed.

---

# 4. DOCUMENT JSON

Every successfully analyzed document should have structured local data.

Example:

```json
{
  "documentId": "local-generated-id",
  "documentType": "aadhaar",
  "status": "verified_local",
  "originalFile": {
    "localUri": "secure://documents/aadhaar/original",
    "mimeType": "image/jpeg"
  },
  "uploadCopy": {
    "localUri": "secure://documents/aadhaar/upload-copy",
    "mimeType": "image/jpeg",
    "targetMaxBytes": 51200
  },
  "extractedData": {
    "fullName": "",
    "aadhaarNumber": "",
    "dateOfBirth": "",
    "gender": "",
    "address": "",
    "city": "",
    "district": "",
    "state": "",
    "pincode": ""
  },
  "analysis": {
    "completed": true,
    "confidence": 0.98,
    "timestamp": ""
  }
}
```

Use the project's existing schema if one already exists. Do not create duplicate databases.

---

# 5. PROFILE DATA

The user's manually entered profile data must also be available to Smart Fill.

Example:

```json
{
  "profile": {
    "fullName": "",
    "firstName": "",
    "lastName": "",
    "email": "",
    "phone": "",
    "dateOfBirth": "",
    "gender": "",
    "address": "",
    "city": "",
    "district": "",
    "state": "",
    "pincode": "",
    "linkedinUrl": ""
  }
}
```

Profile data and document-extracted data should be separate sources.

The field resolver chooses the appropriate source.

---

# 6. FLOATING CONTROL

## Initial state

When Smart Fill is started:

```text
                 ◉
             FLOATING
              CONTROL
```

Use a small circular button.

It must remain visible when the user minimizes the main application if the operating system/platform permissions and implementation support a system overlay.

The floating control must not disappear merely because the main app is minimized.

---

# 7. FLOATING CONTROL POSITION

Default:

```text
Right side
Middle-to-lower area
```

Allow the user to drag the control.

Persist its position locally.

Do not cover:

- Browser navigation controls
- Important form fields
- System navigation
- Keyboard
- Accessibility controls

Snap the button to a safe screen edge after dragging.

---

# 8. TAP FLOATING CONTROL

When the user taps the main circular control:

```text
                Files
                  ◉
                  |
AI Analyze ◉ — MAIN — ◉ Start Fill
                  |
                Close
                  ◉
```

The exact radial geometry may adapt to available screen space.

If there is insufficient space, switch automatically to a compact horizontal/vertical mini-panel.

Do NOT add four permanent buttons to the screen.

The four actions should appear only while the floating control is expanded.

---

# 9. FOUR ACTION BUTTONS

The floating panel contains exactly four primary actions.

## Button 1 — Files

Icon:

```text
📁
```

Label:

```text
Files
```

Purpose:

Open the local document selector.

---

## Button 2 — See This Screen / AI Analyze

Icon:

```text
AI / scan icon
```

Label:

```text
See This Screen
```

or:

```text
AI Analyze
```

Purpose:

Analyze the currently visible page/screen and determine:

- Which fields are present
- What each field means
- Which local profile/document value corresponds to it
- Which fields are file-upload controls
- Which fields are unsupported or ambiguous

---

## Button 3 — Start Fill Up

Icon:

```text
▶
```

Label:

```text
Start Fill Up
```

Purpose:

Start the normal Smart Fill process using already stored local JSON.

It should NOT automatically run OCR again.

---

## Button 4 — Close

Icon:

```text
✕
```

Label:

```text
Close
```

Purpose:

Immediately hide the floating control.

The user should not need to reopen the main app just to stop the floating control.

---

# 10. FILES BUTTON — MINI DOCUMENT PANEL

When the user taps:

```text
Files
```

do not open a full-screen generic file manager unless necessary.

Open a compact floating/mini-sheet panel.

Example:

```text
┌──────────────────────────────┐
│ Files                    ✕   │
├──────────────────────────────┤
│ All                          │
│                              │
│ ✓ Aadhaar                    │
│ ✓ PAN Card                   │
│ ✓ Driving Licence            │
│ ✓ Passport                   │
│ ✓ Resume                     │
│ ✓ Profile Photo              │
│                              │
│ Select                       │
└──────────────────────────────┘
```

Use the user's actual stored documents dynamically.

---

# 11. FILE FILTERS

The Files panel should support:

```text
All
Identity
Financial
Education
Employment
Personal
Other
```

At minimum:

```text
All
```

must exist.

---

# 12. SELECTING A DOCUMENT

When the user selects:

```text
Aadhaar
```

show:

```text
Aadhaar
✓ Available locally

[ Use for Fill ]
[ Upload to Current Form ]
```

Do not immediately upload it to a website without user action/authorization.

---

# 13. LOCAL DOCUMENT → WEBSITE FILE UPLOAD

If the current website has:

```text
Upload Aadhaar
Choose File
Upload Identity Document
Attach ID
```

and the user has selected Aadhaar:

```text
Local Aadhaar
      ↓
Determine accepted MIME/type
      ↓
Determine size limit
      ↓
Use optimized upload copy if compatible
      ↓
Provide file to supported upload mechanism
      ↓
Verify upload state
```

The original local document remains untouched.

---

# 14. 50 KB IMAGE REQUIREMENT

If the product requirement is:

```text
maximum upload copy ≈ 50 KB
```

create a separate optimized copy.

Example:

```text
Original:
2.4 MB JPEG

Upload copy:
≤ 50 KB
```

However:

**Do not blindly force every document to 50 KB if doing so makes text unreadable or violates the target website's requirements.**

Use:

```text
Target: ≤ 50 KB
Minimum readable quality: configurable
```

If a readable image cannot be produced under 50 KB:

```text
Show:
"Image cannot be safely reduced to 50 KB without losing readability."
```

Never destroy the original.

---

# 15. IMAGE COMPRESSION PIPELINE

```text
Original Image
      ↓
Read dimensions
      ↓
Remove unnecessary metadata
      ↓
Resize while preserving aspect ratio
      ↓
Compress
      ↓
Check file size
      ↓
If > 50 KB:
    reduce dimensions/quality gradually
      ↓
Check readability
      ↓
Save optimized copy
```

Supported formats:

```text
JPEG
PNG
WebP
```

Use the format required by the destination website.

Do not convert a document to an incompatible format.

---

# 16. AI DOCUMENT ANALYSIS

When a document is uploaded, call the configured AI/document-analysis API if the user has enabled that integration.

The AI should return structured data, not free-form prose.

Expected output:

```json
{
  "documentType": "pan",
  "fields": {
    "fullName": {
      "value": "",
      "confidence": 0.99
    },
    "panNumber": {
      "value": "",
      "confidence": 0.99
    },
    "dateOfBirth": {
      "value": "",
      "confidence": 0.97
    }
  }
}
```

Validate the response against a strict schema.

Do not blindly trust arbitrary AI output.

---

# 17. SENSITIVE DATA RULE

If an external AI API is used for document analysis:

```text
User must explicitly enable the feature.
```

Clearly state that the selected document/image is being sent to the configured AI service.

If the application is intended to remain fully local:

```text
Use on-device OCR/document parsing instead.
```

Do not silently upload Aadhaar/PAN or other sensitive documents to an external API.

---

# 18. AI "SEE THIS SCREEN" BUTTON

When the user presses:

```text
See This Screen
```

the system should analyze the currently visible page.

Preferred flow:

```text
Current screen/page
       ↓
Supported screen capture / browser integration
       ↓
Analyze page structure/content
       ↓
Extract candidate fields
       ↓
Match against local JSON
       ↓
Generate fill plan
       ↓
Show preview
       ↓
User confirms
       ↓
Fill
```

Do not automatically upload the screen to the AI service without explicit user action.

---

# 19. SCREEN ANALYSIS RESULT

The AI should return structured JSON such as:

```json
{
  "pageType": "registration_form",
  "fields": [
    {
      "label": "Full Name",
      "semanticType": "fullName",
      "source": "profile.fullName",
      "confidence": 0.98
    },
    {
      "label": "Email",
      "semanticType": "email",
      "source": "profile.email",
      "confidence": 0.99
    },
    {
      "label": "Aadhaar Number",
      "semanticType": "aadhaarNumber",
      "source": "documents.aadhaar.extractedData.aadhaarNumber",
      "confidence": 0.97
    }
  ]
}
```

The mobile app should execute the fill plan, not the AI API.

---

# 20. AI MUST NOT INVENT DATA

If the AI sees:

```text
LinkedIn URL
```

but the user has no LinkedIn URL:

```text
source = null
```

Do not generate one.

If the AI is uncertain:

```text
confidence < threshold
```

do not automatically fill.

Ask for user confirmation or leave unresolved.

---

# 21. START FILL UP

When the user taps:

```text
Start Fill Up
```

execute:

```text
Load local profile
       ↓
Load local document JSON
       ↓
Detect current form
       ↓
Create field map
       ↓
Resolve values
       ↓
Check permissions
       ↓
Fill supported fields
       ↓
Verify
       ↓
Report result
```

No OCR unless the user explicitly requests document re-analysis.

---

# 22. FIELD RESOLUTION PRIORITY

Use:

```text
1. Explicit user profile value
2. Confirmed structured document value
3. User-selected document value
4. High-confidence AI mapping
5. Otherwise unresolved
```

Do not guess.

---

# 23. EXAMPLE

Website:

```text
Full Name
Email
Phone
Aadhaar Number
Upload Aadhaar
```

Local data:

```text
profile.fullName
profile.email
profile.phone

documents.aadhaar.extractedData.aadhaarNumber
documents.aadhaar.uploadCopy
```

Fill plan:

```text
Full Name
→ profile.fullName

Email
→ profile.email

Phone
→ profile.phone

Aadhaar Number
→ documents.aadhaar.extractedData.aadhaarNumber

Upload Aadhaar
→ documents.aadhaar.uploadCopy
```

---

# 24. UPLOAD FIELD DETECTION

Recognize file inputs by:

```text
<input type="file">
```

and related accessible labels.

Semantic examples:

```text
Upload Aadhaar
Upload PAN
Upload Passport
Upload Photo
Upload Resume
Choose document
Attach file
Upload ID proof
```

Map them to the correct local document.

---

# 25. DOCUMENT TYPE SAFETY

Do not upload Aadhaar when the website requests PAN.

Example:

```text
Website:
Upload PAN

Selected:
Aadhaar
```

Result:

```text
❌ Type mismatch

Expected:
PAN

Selected:
Aadhaar
```

Do not continue until corrected.

---

# 26. FILE SIZE VALIDATION

Before upload:

```text
Check:
MIME type
extension
file size
image dimensions
website restrictions
```

Example:

```text
Accepted:
JPG / PNG
Max:
100 KB

Local optimized copy:
48 KB
```

→ compatible.

---

# 27. DOCUMENT CHECKMARK

A document gets:

```text
✓
```

only when:

```text
Original saved
+
Analysis completed
+
Structured JSON saved
```

If optimized upload copy is also available:

```text
Upload-ready ✓
```

can be shown separately.

---

# 28. MINI FILE PANEL STATES

### Empty

```text
No documents added

[ Add Document ]
```

### Loading

```text
Analyzing document...
████████░░
```

### Ready

```text
✓ Aadhaar
✓ PAN
✓ Resume
```

### Error

```text
⚠ PAN analysis needs review
```

---

# 29. FLOATING UI ANIMATION

Opening:

```text
MAIN CIRCLE
     ↓
scale 0.8 → 1.0
     ↓
four buttons spring outward
```

Closing:

```text
four buttons
     ↓
spring inward
     ↓
main circle
```

Use approximately:

```text
180–300 ms
```

for the primary transition.

Avoid excessive animation on low-end devices.

---

# 30. 2 GB RAM DEVICE REQUIREMENT

The floating UI must remain lightweight.

Do not:

- continuously render screenshots
- continuously call AI
- keep full-resolution images in RAM
- preload every document
- load all document images simultaneously

Instead:

```text
Load metadata first
      ↓
Load thumbnail only
      ↓
Load full image only when required
      ↓
Release image memory
```

---

# 31. SMART FILL CACHE

Smart Fill should use:

```text
Structured JSON
```

rather than repeatedly processing images.

Example:

```text
Aadhaar uploaded
      ↓
AI/OCR
      ↓
JSON saved
      ↓
Future Smart Fill
      ↓
JSON read
      ↓
Fast field mapping
```

This makes repeated Smart Fill operations much faster.

---

# 32. FIELD MATCHING

Support aliases.

Example:

```text
first name
firstname
first_name
given name
fname
```

→

```text
profile.firstName
```

Email:

```text
email
email address
e-mail
username
```

→

```text
profile.email
```

Phone:

```text
phone
mobile
mobile number
contact number
telephone
```

→

```text
profile.phone
```

Aadhaar:

```text
aadhaar
aadhaar number
uid
uidai number
```

→

```text
documents.aadhaar.extractedData.aadhaarNumber
```

PAN:

```text
PAN
PAN number
permanent account number
```

→

```text
documents.pan.extractedData.panNumber
```

---

# 33. DO NOT AUTO-SUBMIT

Smart Fill must never automatically press:

```text
Submit
Apply
Pay
Confirm
Continue
Next
Send
Register
Login
```

After filling:

```text
Fields filled ✓

Please review before submitting.
```

The user performs the final action.

---

# 34. DO NOT AUTO-ACCEPT LEGAL CONSENT

Never automatically check:

```text
Terms & Conditions
Privacy Policy
Marketing consent
Declaration
I agree
```

These remain user-controlled.

---

# 35. OTP / CAPTCHA / SECURITY

Never automatically solve or bypass:

```text
CAPTCHA
OTP
2FA
Security questions
Payment verification
CVV
```

Leave these for the user.

---

# 36. FLOATING PANEL UX

The expanded mini-panel should contain:

```text
             ┌─────────────┐
             │    Files    │
             │      ◉      │
             └─────────────┘

 AI Analyze ◉     ◉ Start Fill

             ◉ Close
```

But dynamically reposition based on the floating button's location.

If the button is near the bottom:

```text
open upward
```

If near the top:

```text
open downward
```

If near the right edge:

```text
open toward the left
```

Never place controls outside the screen.

---

# 37. FILE PANEL INTERACTION

Flow:

```text
Floating Control
      ↓
Files
      ↓
Mini File Panel
      ↓
All
      ↓
Aadhaar / PAN / Resume / etc.
      ↓
Select
      ↓
Use for Current Form
```

The selected document must be visually highlighted:

```text
✓ Selected
```

---

# 38. AI ANALYZE INTERACTION

Flow:

```text
Floating Control
      ↓
See This Screen
      ↓
Permission / confirmation if required
      ↓
Analyze current screen
      ↓
AI returns structured mapping
      ↓
Preview
      ↓
User confirms
      ↓
Start Fill
```

Example preview:

```text
Detected:

✓ Full Name → Profile
✓ Email → Profile
✓ Phone → Profile
✓ Aadhaar → Aadhaar document

4 fields ready

[ Cancel ] [ Fill ]
```

---

# 39. START FILL RESULT

After filling:

```text
Smart Fill Complete

✓ 5 fields filled
⚠ 1 field needs attention
○ 1 field unavailable
```

Example:

```text
✓ Full Name
✓ Email
✓ Phone
✓ Aadhaar Number
✓ Aadhaar Upload

⚠ LinkedIn URL — not available
```

---

# 40. VERIFICATION AFTER FILL

For every field:

```text
Expected value
      ↓
Fill
      ↓
Read target value/state
      ↓
Compare
      ↓
SUCCESS / FAILED
```

Do not show "success" merely because the fill request was sent.

---

# 41. ACCESSIBILITY / BROWSER INTEGRATION

For external browser/app pages, use the platform-supported integration already present in the project.

Do not pretend that an Android floating overlay automatically has unrestricted access to Chrome's HTML DOM.

Where DOM access is available, inspect:

```text
name
id
type
placeholder
autocomplete
aria-label
label
```

Where only Android accessibility information is available, use relevant accessibility metadata.

---

# 42. SECURITY BOUNDARY FOR SCREEN AI

The "See This Screen" feature is potentially sensitive.

Before sending screen content to the configured AI API:

```text
User presses AI Analyze
      ↓
Show:
"This will send the current screen to your configured AI service."
      ↓
User confirms
      ↓
Send only required screen/page data
```

Do not silently transmit:

- passwords
- OTPs
- payment information
- unrelated private screens
- unrelated applications

If possible, redact sensitive fields before external analysis.

---

# 43. OFFLINE BEHAVIOR

When internet is unavailable:

```text
Files → WORKS
Profile → WORKS
Local JSON → WORKS
Previously available Smart Fill → WORKS
Local document selection → WORKS
```

External AI screen analysis:

```text
No network
→ show "AI analysis unavailable offline"
```

Do not secretly upload data later.

---

# 44. PERFORMANCE TARGETS

Approximate engineering targets:

```text
Open floating panel:
< 300 ms

Open Files mini-panel:
< 300 ms

Read local JSON:
< 100 ms

Field mapping:
< 300 ms

Simple form fill:
~0.5–2 seconds

Local document selection:
< 500 ms after metadata is loaded
```

These are targets, not guarantees.

---

# 45. ERROR HANDLING

Never show a generic:

```text
No matching fields
```

when fields were detected.

Instead:

```text
Detected: 6
Matched: 5
Filled: 4
Needs review: 1
Unavailable: 1
```

Example:

```text
Smart Fill

✓ Full Name
✓ Email
✓ Phone
✓ Aadhaar Number

⚠ Aadhaar upload needs compatible file format
○ LinkedIn not available
```

---

# 46. LOGGING

Developer diagnostics may contain:

```text
field type
semantic type
confidence
source path
status
```

Never log:

```text
actual password
full Aadhaar number
full PAN number
full document image
OTP
CVV
```

Mask sensitive identifiers in development logs.

Example:

```text
Aadhaar: ********1234
PAN: *****1234
```

---

# 47. TEST CASE — COMPLETE FLOW

### Step 1

User uploads:

```text
Aadhaar
PAN
Profile Photo
Resume
```

### Step 2

System:

```text
Stores originals locally
Analyzes documents
Creates JSON
Creates optimized upload copies
```

### Step 3

Files panel shows:

```text
✓ Aadhaar
✓ PAN
✓ Profile Photo
✓ Resume
```

### Step 4

User opens a website.

### Step 5

User taps floating button.

### Step 6

Four buttons appear:

```text
Files
See This Screen
Start Fill Up
Close
```

### Step 7

User taps:

```text
See This Screen
```

### Step 8

AI analyzes the page and returns structured field mapping.

### Step 9

User confirms.

### Step 10

Smart Fill uses:

```text
Local JSON
+
Selected document
```

### Step 11

Fields are filled.

### Step 12

If the page asks for an image:

```text
Local optimized image
      ↓
Upload field
```

### Step 13

System verifies the result.

### Step 14

Final result:

```text
Smart Fill Complete

✓ 7 fields
✓ 1 document upload

Review before submitting.
```

---

# 48. UI QUALITY REQUIREMENTS

The UI must feel like a finished production application.

Use:

- Consistent 8/12/16/24 dp spacing
- Rounded cards
- Proper icon sizing
- Clear typography hierarchy
- Glass blur
- Subtle shadows
- Smooth spring animations
- Haptic feedback
- Dark/light support
- Proper touch targets
- Safe-area handling
- Keyboard-aware layout
- Screen-edge collision detection

Do not use:

- random emoji as final icons
- oversized buttons
- excessive gradients
- permanently visible action menus
- overlapping controls
- tiny unreadable text

---

# 49. FLOATING CONTROL STATES

Implement explicit states:

```text
IDLE
STARTING
RUNNING
EXPANDED
FILES_OPEN
ANALYZING
READY_TO_FILL
FILLING
SUCCESS
ERROR
STOPPED
```

Example:

```text
IDLE
 ↓
START
 ↓
RUNNING
 ↓
EXPANDED
 ↓
START FILL
 ↓
ANALYZING FORM
 ↓
READY
 ↓
FILLING
 ↓
SUCCESS
```

---

# 50. CLOSE BEHAVIOR

When user presses:

```text
Close
```

the floating overlay disappears immediately.

State:

```text
STOPPED
```

The app's main UI remains unaffected.

When the user later opens the app:

```text
Start Smart Fill
```

can enable the floating control again.

---

# 51. FINAL ACCEPTANCE CHECKLIST

- [ ] Floating Smart Fill control works.
- [ ] Floating control remains available after minimizing where OS permission allows.
- [ ] Tapping it opens exactly four actions.
- [ ] Files button opens a compact document panel.
- [ ] All document types are shown dynamically.
- [ ] Existing uploaded documents show ✓.
- [ ] Document selection works.
- [ ] Selected document is visually highlighted.
- [ ] Current form document requirements are detected.
- [ ] Correct document type is selected.
- [ ] Original documents remain untouched.
- [ ] Optimized upload copies can target ~50 KB.
- [ ] Original documents are never destroyed to achieve 50 KB.
- [ ] Document JSON is generated at upload/analysis time.
- [ ] Smart Fill reads JSON instead of rerunning OCR.
- [ ] AI screen analysis uses structured output.
- [ ] External AI transmission requires explicit user action.
- [ ] AI cannot invent missing values.
- [ ] Start Fill Up performs the actual fill operation.
- [ ] Filled fields are verified.
- [ ] Upload fields are verified.
- [ ] Submit buttons are never automatically clicked.
- [ ] OTP/CAPTCHA/payment/security fields remain user-controlled.
- [ ] Sensitive data is not logged.
- [ ] Passwords are never exposed to normal logs or plain JSON.
- [ ] UI is responsive on low-end Android devices.
- [ ] Expanded floating panel adapts to screen edges.
- [ ] No controls overlap the keyboard or system UI.
- [ ] Dark/light mode works.
- [ ] Animations remain smooth.
- [ ] App works with local data when offline.
- [ ] Existing Secure Vault architecture is preserved.

---

# FINAL PRODUCT FLOW

```text
                    MAIN APP
                       │
                       ▼
               START SMART FILL
                       │
                       ▼
                ┌─────────────┐
                │   ◉ FLOAT   │
                └──────┬──────┘
                       │ TAP
                       ▼
        ┌─────────────────────────────┐
        │       FLOATING MINI PANEL   │
        │                             │
        │          📁 Files            │
        │                             │
        │  🤖 See This Screen        │
        │                             │
        │          ▶ Start Fill       │
        │                             │
        │            ✕ Close           │
        └─────────────────────────────┘
             │          │          │
             ▼          ▼          ▼
           FILES       AI        FILL
             │       ANALYZE       │
             ▼          │          ▼
       LOCAL DOCS       │     LOCAL JSON
             │          │          │
             └──────────┴──────────┘
                        │
                        ▼
                 FIELD MAPPING
                        │
                        ▼
                  USER REVIEW
                        │
                        ▼
                   AUTO FILL
                        │
                        ▼
                VERIFY RESULTS
                        │
                        ▼
                 USER SUBMITS
```

## Non-negotiable rule

**The AI decides/assists with field understanding; the local vault supplies the user's actual data; the fill engine executes only supported mappings; and the user remains in control of sensitive documents, credentials, consent, and final submission.**
