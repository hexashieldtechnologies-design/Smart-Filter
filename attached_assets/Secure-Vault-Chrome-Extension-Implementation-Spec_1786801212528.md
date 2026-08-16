# Secure Vault Chrome Extension
## Developer Implementation Specification

**Version:** 1.0  
**Product:** Secure Vault Smart Fill  
**Target:** Google Chrome Desktop, Manifest V3  
**Status:** Implementation blueprint — not the extension source code

> यह document developer को सीधे दिया जा सकता है। इसमें Chrome extension का architecture, logic, data properties, field matching, document selection, PAN/Aadhaar mapping, security rules, message contracts और testing requirements दिए गए हैं।

---

## 1. Product Goal

Secure Vault Chrome Extension का काम user के **पहले से approved local profile और document JSON** से supported web forms को भरने में मदद करना है।

Extension को:

1. Current webpage के visible form controls पहचानने हैं।
2. हर control का semantic meaning समझना है।
3. Local profile/document JSON से candidate value ढूँढनी है।
4. User को fill plan दिखाना है।
5. User के confirm करने के बाद केवल selected fields भरने हैं।
6. हर filled field का result verify करना है।
7. Final submit user के लिए छोड़ना है।

Extension को password manager, captcha solver, payment bot या automatic form submitter नहीं बनाना है।

### Non-negotiable rule

> **AI/field matcher field को समझता है, local vault actual value देता है, fill engine केवल approved mapping execute करता है, और user sensitive data तथा final submission पर control रखता है।**

---

## 2. Existing Secure Vault Rules to Preserve

Current mobile app के अनुसार ये rules extension में भी लागू होंगे:

- Smart Fill user-confirmed है।
- Sensitive identity fields default रूप से unselected रहेंगे।
- PAN और Aadhaar को mask करके दिखाना है।
- User review के बिना sensitive value fill नहीं करनी है।
- Website का `Submit`, `Apply`, `Pay`, `Login`, `Register`, `Continue`, `Next` आदि button अपने-आप press नहीं करना है।
- Terms, privacy policy, declaration, marketing consent और “I agree” checkbox अपने-आप check नहीं करना है।
- OTP, CAPTCHA, 2FA, security question, CVV और payment verification manual रहेंगे।
- Original document को कभी destroy नहीं करना है।
- OCR/AI analysis document upload/analysis समय पर होनी चाहिए; हर Smart Fill click पर OCR दोबारा नहीं चलाना है।
- Smart Fill को saved structured JSON पढ़ना है।
- Full Aadhaar, PAN, password, OTP या document image logs में नहीं आने चाहिए।
- Web/PC पर normal in-page review flow रहेगा। Android floating overlay केवल native Android bridge के लिए है; Chrome extension में Android floating behavior copy नहीं करना है।

---

## 3. Very Important Platform Boundary

### Chrome extension mobile app की private storage सीधे नहीं पढ़ सकती

Mobile app में document files और vault state app-private/encrypted storage में रहती है। Chrome extension:

- Android app के private filesystem को सीधे नहीं पढ़ सकती।
- Expo AsyncStorage/private file URI को सीधे resolve नहीं कर सकती।
- Android Keystore में रखे credential को directly access नहीं कर सकती।
- Mobile app के native `SmartFillModule` को directly call नहीं कर सकती।

इसलिए extension के लिए एक explicit data bridge आवश्यक है।

### Recommended Phase 1 bridge: encrypted export/import

सबसे सुरक्षित और सरल पहला implementation:

```text
Mobile Secure Vault
        ↓
User explicitly exports encrypted vault package
        ↓
User imports package into Chrome Extension
        ↓
Extension decrypts only after user passphrase/authentication
        ↓
Extension keeps encrypted data at rest
```

Import/export में user की explicit action अनिवार्य है। Extension को background में mobile app से data खींचने की कोशिश नहीं करनी है।

### Phase 2 bridge options

बाद में इनमें से एक विकल्प बनाया जा सकता है:

1. **Desktop companion app + Chrome Native Messaging**
   - Companion app encrypted vault पढ़ेगा।
   - Chrome extension उससे approved request/response protocol से बात करेगी।
   - Password और full document data extension में persist नहीं होगा।

2. **Authenticated Secure Vault API**
   - केवल user-approved, minimum required fields fetch हों।
   - HTTPS, short-lived session, per-user authorization और audit log अनिवार्य।
   - Raw documents और full identity values को unnecessary sync नहीं करना है।

3. **Manual file import**
   - User extension में एक local JSON/document package चुनता है।
   - यह demo/MVP के लिए acceptable fallback है।

### Recommended decision for first extension

पहले version में:

- Encrypted export/import use करें।
- Direct mobile-to-extension sync न बनाएं।
- Plain JSON import को production में allow न करें, या केवल clearly marked development mode में allow करें।

---

## 4. Recommended Chrome Extension Architecture

```text
Chrome Extension
├── manifest.json
├── src/
│   ├── background/
│   │   └── service-worker.ts
│   ├── content/
│   │   ├── content-script.ts
│   │   ├── field-discovery.ts
│   │   ├── field-matcher.ts
│   │   ├── fill-engine.ts
│   │   ├── upload-engine.ts
│   │   └── dom-utils.ts
│   ├── popup/
│   │   ├── popup.html
│   │   ├── popup.tsx
│   │   └── popup.css
│   ├── options/
│   │   ├── options.html
│   │   └── options.tsx
│   ├── shared/
│   │   ├── types.ts
│   │   ├── messages.ts
│   │   ├── field-aliases.ts
│   │   ├── normalize.ts
│   │   ├── resolver.ts
│   │   ├── redaction.ts
│   │   └── constants.ts
│   └── vault/
│       ├── encrypted-store.ts
│       ├── vault-import.ts
│       ├── vault-export.ts
│       └── session-store.ts
└── tests/
    ├── unit/
    ├── fixtures/
    └── integration/
```

### Component responsibilities

#### `service-worker.ts`

- Extension lifecycle handle करे।
- Popup/content script messages route करे।
- Current session state रखे।
- `chrome.storage.local` और `chrome.storage.session` access करे।
- Tab/session ownership validate करे।
- Content script inject करे जब user action हो।
- Sensitive value को logs में न लिखे।
- Long-running page DOM logic service worker में न रखे।

#### `content-script.ts`

- Current webpage पर DOM inspect करे।
- Visible semantic controls discover करे।
- Dynamic DOM changes observe करे।
- Service worker से fill plan ले।
- Actual field filling execute करे।
- Readback verification करे।
- Page submit न करे।

#### `popup` या `side panel`

- Start Smart Fill।
- Files open/select।
- Select all।
- Current page scan।
- Review matches।
- Sensitive field confirmation।
- Start fill।
- Pause/stop।
- Completion summary।

Desktop extension के लिए persistent UI चाहिए तो `chrome.sidePanel` optional enhancement है। पहला MVP popup + in-page review panel से बनाया जा सकता है।

#### `options`

- Encrypted vault import।
- Passphrase unlock।
- Document list।
- Profile data review।
- Domain/session settings।
- “Clear extension vault”।
- Permission explanation।

---

## 5. Manifest V3

### MVP manifest

```json
{
  "manifest_version": 3,
  "name": "Secure Vault Smart Fill",
  "version": "1.0.0",
  "description": "User-controlled form filling from an encrypted local identity vault.",
  "action": {
    "default_title": "Secure Vault Smart Fill",
    "default_popup": "popup.html"
  },
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  },
  "permissions": [
    "storage",
    "scripting",
    "activeTab"
  ],
  "optional_permissions": [
    "sidePanel",
    "notifications"
  ],
  "host_permissions": [],
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  },
  "icons": {
    "16": "icons/icon-16.png",
    "32": "icons/icon-32.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  }
}
```

### Permission properties

| Property | Required? | Why |
|---|---:|---|
| `manifest_version: 3` | Yes | Current Chrome extension platform |
| `action` | Yes | Popup/start button |
| `background.service_worker` | Yes | Session/message orchestration |
| `storage` | Yes | Encrypted vault envelope and non-sensitive preferences |
| `scripting` | Yes | User-triggered content script injection |
| `activeTab` | Yes for MVP | Current tab access only after user action |
| `sidePanel` | Optional | Persistent desktop review UI |
| `notifications` | Optional | Non-sensitive completion notification |
| `host_permissions` | Prefer empty for MVP | Avoid broad website access |

### Optional per-site access

यदि extension को हर page पर automatically detect करना हो:

```json
{
  "optional_host_permissions": [
    "https://*/*",
    "http://*/*"
  ]
}
```

लेकिन इसे install पर तुरंत request नहीं करना है। User के “Enable on this site” action के बाद, केवल current site के लिए permission मांगें।

### Never request without need

इन permissions को default में न लें:

- `<all_urls>`
- `tabs`
- `history`
- `downloads`
- `clipboardRead`
- `clipboardWrite`
- `webRequest`
- broad host access

अगर कोई feature इन्हें सच में मांगता है, तो feature-specific justification और user confirmation दें।

---

## 6. Core Data Model

### 6.1 Canonical field keys

Extension में सभी field keys canonical form में रहें। Spaces, hyphens, uppercase/lowercase और OCR aliases को एक ही key में normalize करें।

```ts
type CanonicalFieldKey =
  | 'fullName'
  | 'firstName'
  | 'middleName'
  | 'lastName'
  | 'fatherName'
  | 'motherName'
  | 'spouseName'
  | 'phone'
  | 'alternatePhone'
  | 'email'
  | 'alternateEmail'
  | 'dateOfBirth'
  | 'gender'
  | 'nationality'
  | 'maritalStatus'
  | 'aadhaar'
  | 'pan'
  | 'passportNumber'
  | 'drivingLicenceNumber'
  | 'address'
  | 'houseFlat'
  | 'buildingStreet'
  | 'areaLocality'
  | 'city'
  | 'district'
  | 'state'
  | 'country'
  | 'pincode'
  | 'linkedinUrl'
  | 'qualification'
  | 'institution'
  | 'course'
  | 'yearOfPassing'
  | 'occupation'
  | 'organization'
  | 'designation'
  | 'resume'
  | 'profilePhoto';
```

Password को normal canonical vault JSON में value के रूप में नहीं रखना है।

### 6.2 Profile schema

```json
{
  "profile": {
    "fullName": "Anam Jasiya",
    "firstName": "Anam",
    "middleName": "",
    "lastName": "Jasiya",
    "dateOfBirth": "1999-04-12",
    "gender": "",
    "nationality": "Indian",
    "maritalStatus": "",
    "fatherName": "",
    "motherName": "",
    "spouseName": "",
    "mobile": "+91XXXXXXXXXX",
    "alternateMobile": "",
    "email": "user@example.com",
    "alternateEmail": "",
    "linkedinUrl": "",
    "permanentAddress": {
      "houseFlat": "",
      "buildingStreet": "",
      "areaLocality": "",
      "city": "",
      "district": "",
      "state": "",
      "country": "India",
      "pinCode": ""
    },
    "currentAddress": {
      "houseFlat": "",
      "buildingStreet": "",
      "areaLocality": "",
      "city": "",
      "district": "",
      "state": "",
      "country": "India",
      "pinCode": ""
    },
    "sameAsPermanent": true,
    "aadhaarNumber": "",
    "panNumber": "",
    "drivingLicenceNumber": "",
    "passportNumber": "",
    "qualification": "",
    "institution": "",
    "course": "",
    "yearOfPassing": "",
    "occupation": "",
    "organization": "",
    "designation": ""
  }
}
```

> Extension UI में sensitive profile values भी masked दिखें। `aadhaarNumber` और `panNumber` को document-owned values से अलग source के रूप में track करें।

### 6.3 Document schema

```ts
type DocumentStatus =
  | 'verified_local'
  | 'processing'
  | 'not_added'
  | 'analysis_failed'
  | 'needs_review';

type ExtractedDocumentField = {
  key: string;
  value: string;
  confidence: number; // 0 to 100
  source: string;     // e.g. "PAN Card · on-device OCR"
  confirmed?: boolean;
};

type VaultDocument = {
  id: string;
  type: string;
  label: string;
  status: DocumentStatus;
  identifier?: string;
  updatedAt?: string;
  mimeType?: string;
  extractedFields: ExtractedDocumentField[];
  originalAsset?: {
    present: boolean;
    encryptedReference?: string;
  };
  uploadAsset?: {
    present: boolean;
    encryptedReference?: string;
    mimeType?: string;
    sizeBytes?: number;
  };
  analysis?: {
    completed: boolean;
    completedAt?: string;
    model?: string;
    overallConfidence?: number;
  };
};
```

### 6.4 Important document ownership rules

```text
AADHAAR document → aadhaar
PAN document     → pan
PASSPORT document → passportNumber
DRIVING LICENCE document → drivingLicenceNumber
RESUME document → resume + education/employment fields
```

The parser must not save a PAN value inside the Aadhaar document record just because OCR accidentally saw a PAN-like string.

### 6.5 Canonical extracted JSON

```json
{
  "documentId": "aadhaar-local-id",
  "documentType": "aadhaar",
  "status": "verified_local",
  "extractedData": {
    "fullName": "ANAM JASIYA",
    "aadhaar": "4678 9012 1234",
    "dateOfBirth": "1999-04-12",
    "gender": "FEMALE",
    "address": "",
    "city": "",
    "district": "",
    "state": "",
    "pincode": "110001"
  },
  "fieldConfidence": {
    "fullName": 94,
    "aadhaar": 97,
    "dateOfBirth": 91
  },
  "source": "Aadhaar Card · local OCR",
  "confirmed": true
}
```

```json
{
  "documentId": "pan-local-id",
  "documentType": "pan",
  "status": "verified_local",
  "extractedData": {
    "fullName": "ANAM JASIYA",
    "pan": "ABCDE1234F",
    "dateOfBirth": "1999-04-12"
  },
  "fieldConfidence": {
    "fullName": 94,
    "pan": 98,
    "dateOfBirth": 91
  },
  "source": "PAN Card · local OCR",
  "confirmed": true
}
```

---

## 7. Encrypted Vault Export Package

### 7.1 Plain internal payload before encryption

यह payload केवल memory में unlock के दौरान रहे:

```json
{
  "schemaVersion": 1,
  "kind": "secure-vault-export",
  "exportedAt": "2026-08-15T00:00:00.000Z",
  "profile": {},
  "documents": [],
  "preferences": {
    "smartFillEnabled": true
  }
}
```

Password और raw credential secret इसमें नहीं होना चाहिए।

### 7.2 Encrypted package envelope

```json
{
  "format": "secure-vault-encrypted",
  "formatVersion": 1,
  "kdf": {
    "name": "PBKDF2",
    "hash": "SHA-256",
    "iterations": 600000,
    "salt": "<base64-random-salt>"
  },
  "cipher": {
    "name": "AES-GCM",
    "iv": "<base64-random-iv>",
    "tagLength": 128
  },
  "payload": "<base64-ciphertext>"
}
```

Implementation rules:

- Salt और IV हर export पर random बनें।
- Same key/IV pair दोबारा use न करें।
- Passphrase को `chrome.storage` में न रखें।
- Decrypted payload को `chrome.storage.local` में plain form में न save करें।
- Unlock के बाद decrypted values केवल session memory या `chrome.storage.session` में रखें।
- Lock/stop/logout पर memory और session storage clear करें।
- Import file को process होने के बाद page DOM या logs में न छोड़ें।

> Web Crypto API use करें। अपना encryption algorithm invent न करें।

---

## 8. Extension Storage Properties

### `chrome.storage.local`

केवल ये data रखें:

```ts
{
  encryptedVaultEnvelope: string;
  vaultMetadata: {
    schemaVersion: number;
    importedAt: string;
    documentCount: number;
    labels: string[];
  };
  userPreferences: {
    theme: 'system' | 'light' | 'dark';
    requireReviewEverySession: boolean;
    enabledSitePatterns: string[];
  };
}
```

यहाँ plain PAN, full Aadhaar, password, document image या OTP नहीं रखना है।

### `chrome.storage.session`

Session-unlocked data के लिए:

```ts
{
  unlockedVault?: UnlockedVault;
  activeSession?: SmartFillSession;
}
```

Session stop, browser restart, lock या timeout पर clear करें।

### In-memory only

इन values को maximum short-lived रखें:

- Current page field values।
- Fill plan।
- Unmasked sensitive values।
- Imported file bytes।
- Password authorization token/reference।

---

## 9. Extension UI Flow

### 9.1 Initial states

```text
LOCKED
  └─ Unlock Vault

NO_VAULT
  └─ Import Encrypted Vault

READY
  └─ Start Smart Fill

ACTIVE_SESSION
  ├─ See This Screen
  ├─ Files
  ├─ Start Fill Up
  └─ Stop
```

Desktop Chrome में native Android-style floating bubble नहीं बनाना है। User को:

- toolbar popup,
- optional side panel,
- या current-page review panel

दिखाना है।

### 9.2 Files panel

Files panel में:

- `All`
- `Identity`
- `Financial`
- `Education`
- `Employment`
- `Personal`
- `Other`

filters रहें।

हर document row में:

```text
Document label
Status
Structured fields count
Selected / unselected state
Available upload asset state
```

### 9.3 Multi-select rules

- एक session में कई documents select हो सकते हैं।
- `Select all` केवल available/verified documents select करे।
- `Select all` दूसरी बार press करने पर सभी available documents deselect करे।
- `not_added`, `processing`, `analysis_failed` document fill source के रूप में selectable नहीं होंगे।
- Selection session में persist रहे।
- Files panel बंद/open होने पर selection न मिटे।
- `Use for Fill` के बाद selected document IDs fill plan में जाएँ।
- कोई file selected न हो तो text दिखे: `All available local documents`.
- User explicitly selected subset तो केवल उसी subset से document values resolve हों।

### 9.4 Sensitive review

Default:

```text
Normal profile fields → selected if high confidence
PAN → unselected
Aadhaar → unselected
Date of birth → unselected or explicit review
Address → unselected or explicit review
Password → never from normal JSON
```

Sensitive field पर click:

1. Masked preview दिखाएं।
2. Exact destination field का label दिखाएं।
3. User confirmation लें।
4. Confirm होने पर ही selected करें।

---

## 10. Smart Fill Session State Machine

```ts
type SmartFillPhase =
  | 'idle'
  | 'starting'
  | 'locked'
  | 'scanning'
  | 'files_open'
  | 'review_required'
  | 'ready_to_fill'
  | 'filling'
  | 'filled'
  | 'paused'
  | 'stopped'
  | 'error';
```

### Allowed transitions

```text
idle
  → starting

starting
  → locked
  → scanning
  → error

locked
  → starting
  → stopped

scanning
  → files_open
  → review_required
  → error

files_open
  → scanning
  → review_required
  → stopped

review_required
  → ready_to_fill
  → files_open
  → stopped

ready_to_fill
  → filling
  → stopped

filling
  → filled
  → error
  → stopped

filled
  → review_required
  → stopped

paused
  → ready_to_fill
  → stopped
```

### Stop behavior

Stop button:

- Content script observer disconnect करे।
- Pending fill queue cancel करे।
- Current page field values को undo करने की कोशिश न करे।
- Sensitive values memory से clear करे।
- `chrome.storage.session` से active session हटाए।
- In-page panel हटाए।
- Audit event में केवल count/status रखें।

---

## 11. Current Page Field Discovery

### 11.1 Supported controls

पहले ये controls support करें:

- `input[type=text]`
- `input[type=email]`
- `input[type=tel]`
- `input[type=number]`
- `input[type=date]`
- `input[type=url]`
- `input[type=search]`
- `textarea`
- `select`
- visible `[contenteditable="true"]`
- `input[type=file]` — explicit upload flow में

### 11.2 Exclude controls

इनको discover/fill न करें:

- `input[type=password]` in normal profile flow
- hidden input
- `display:none`
- `visibility:hidden`
- zero-size controls
- disabled controls
- readonly controls
- off-screen trap controls
- honeypot-like controls
- CAPTCHA controls
- OTP/2FA controls
- payment/CVV controls
- legal consent checkbox
- submit/button/reset/image controls
- browser address bar या Chrome UI — content script को वैसे भी access नहीं मिलता

### 11.3 Visibility check

Control visible तभी माने:

```ts
const rect = element.getBoundingClientRect();
const style = getComputedStyle(element);

const visible =
  rect.width > 0 &&
  rect.height > 0 &&
  style.display !== 'none' &&
  style.visibility !== 'hidden' &&
  style.opacity !== '0';
```

Viewport visibility optional है; scroll करके field तक जाना अलग feature हो सकता है। First version में viewport से बाहर fields को “detected but not currently visible” status दें।

### 11.4 Semantic metadata collect करें

हर control के लिए:

```ts
type DomFieldSignals = {
  elementId: string;
  tagName: string;
  inputType?: string;
  name?: string;
  id?: string;
  placeholder?: string;
  ariaLabel?: string;
  ariaLabelledByText?: string;
  autocomplete?: string;
  associatedLabel?: string;
  nearbyText?: string;
  accept?: string;
  required: boolean;
  disabled: boolean;
  readonly: boolean;
  visible: boolean;
  inIframe: boolean;
  insideShadowRoot: boolean;
};
```

### 11.5 Label lookup order

Label text निकालने का order:

1. `aria-label`
2. `aria-labelledby` का visible text
3. `<label for="...">`
4. Control के अंदर/पास label
5. `placeholder`
6. `name`
7. `id`
8. Nearby heading/helper text
9. `autocomplete`

Text को:

- trim करें,
- whitespace collapse करें,
- lowercase करें,
- punctuation normalize करें,
- Hindi/English common aliases support करें जहाँ संभव हो।

---

## 12. Field Deduplication

Browser accessibility trees और modern frameworks एक ही logical field को कई DOM nodes के रूप में दिखा सकते हैं। हर editable node को अलग field न मानें।

### Dedup identity priority

```text
data-secure-vault-field-id
→ name + form owner
→ id
→ autocomplete + nearby label
→ normalized label + DOM position
```

### Dedup rules

- Same `name` और same form में duplicates merge करें।
- Hidden mirror input को visible input से merge करें।
- Label text same लेकिन अलग visible controls हों तो अलग रखें।
- File input और text input को एक field न बनाएं।
- Same semantic field की candidate list में strongest DOM node रखें।

---

## 13. Canonical Alias Map

Aliases को `field-aliases.ts` में centralize करें।

### Full name

```text
name
full name
full_name
fullname
applicant name
customer name
candidate name
legal name
given name and surname
```

→ `fullName`

### First name

```text
first name
firstname
first_name
given name
fname
```

→ `firstName`

### Last name

```text
last name
lastname
last_name
surname
family name
lname
```

→ `lastName`

### Email

```text
email
email address
e-mail
mail id
username
```

→ `email`

`username` को email तभी मानें जब:

- `type=email`, या
- autocomplete `username` हो और stored value email-format हो।

### Phone

```text
phone
phone number
mobile
mobile number
contact number
telephone
tel
```

→ `phone`

### Date of birth

```text
dob
date of birth
birth date
birthdate
born on
```

→ `dateOfBirth`

### Aadhaar

```text
aadhaar
aadhar
aadhaar number
aadhar number
uid
uid number
uidai
uidai number
unique identification number
```

→ `aadhaar`

### PAN

```text
pan
pan card
pan number
permanent account number
tax identification number
```

→ `pan`

### Passport

```text
passport
passport number
passport no
travel document number
```

→ `passportNumber`

### Address

```text
address
full address
residential address
permanent address
current address
street address
address line 1
address line 2
```

→ `address`, `buildingStreet`, `areaLocality` according to context.

### Location

```text
city
town
district
state
province
country
pin
pincode
pin code
postal code
zip
zip code
```

→ `city`, `district`, `state`, `country`, `pincode`

### Education

```text
qualification
degree
education
institution
college
university
course
year of passing
graduation year
```

→ education profile keys.

### Employment

```text
occupation
job title
designation
role
company
organization
employer
```

→ employment profile keys.

---

## 14. Field Matching Engine

### 14.1 Matching signals

हर candidate के लिए multiple signals combine करें:

| Signal | Suggested weight |
|---|---:|
| `autocomplete` exact match | 0.30 |
| `name` exact/alias match | 0.22 |
| `id` exact/alias match | 0.18 |
| associated label | 0.15 |
| placeholder/ARIA text | 0.08 |
| input type/inputmode | 0.05 |
| nearby context | 0.02 |

Weights configurable रखें; hardcode करके अलग-अलग modules में duplicate न करें।

### 14.2 Score ranges

```text
0.90 – 1.00 → strong match
0.80 – 0.89 → match, review if sensitive
0.65 – 0.79 → manual review required
below 0.65 → unresolved; do not fill
```

### 14.3 Hard stops

Score चाहे high हो, इन cases में automatic fill रोकें:

- Field password है।
- Field CAPTCHA/OTP/2FA है।
- Field payment/CVV/card security है।
- Field terms/consent/declaration है।
- Website label document type से conflict करता है।
- Selected document unavailable है।
- Value not confirmed है।
- Field cross-origin inaccessible iframe में है।
- Website control readback verify नहीं हो रहा।

### 14.4 Match result

```ts
type FieldMatch = {
  fieldId: string;
  semanticType: CanonicalFieldKey | 'manual' | 'unknown';
  label: string;
  elementDescriptor: {
    tagName: string;
    type?: string;
    name?: string;
    id?: string;
    autocomplete?: string;
  };
  source:
    | { kind: 'profile'; key: string }
    | { kind: 'document'; documentId: string; key: string }
    | { kind: 'upload'; documentId: string }
    | { kind: 'none' };
  valueAvailable: boolean;
  confidence: number;
  sensitive: boolean;
  selected: boolean;
  status: 'matched' | 'needs_review' | 'unavailable' | 'unsupported';
  reason?: string;
};
```

---

## 15. Source Resolution Rules

### 15.1 General source priority

```text
1. User-selected, confirmed document field
2. Explicit user profile field
3. Confirmed field from selected document
4. Other approved local source
5. AI semantic mapping only
6. Unresolved
```

### 15.2 Document-owned identity fields

PAN और Aadhaar के लिए stricter rule:

```text
Website asks Aadhaar
  → only selected Aadhaar document.aadhaar
  → profile.aadhaarNumber may be fallback only if user explicitly allows it

Website asks PAN
  → only selected PAN document.pan
  → profile.panNumber may be fallback only if user explicitly allows it
```

Aadhaar document से PAN-like string मिलने पर उसे PAN source न बनाएं। PAN document से Aadhaar-like string मिलने पर उसे Aadhaar source न बनाएं।

### 15.3 Example

Page fields:

```text
Full Name
Email
Aadhaar Number
PAN Number
Upload Aadhaar
Upload PAN
```

Selected files:

```text
All available
  ├─ Aadhaar Card
  └─ PAN Card
```

Plan:

```text
Full Name
  → profile.fullName

Email
  → profile.email

Aadhaar Number
  → selectedDocument(aadhaar).extractedData.aadhaar

PAN Number
  → selectedDocument(pan).extractedData.pan

Upload Aadhaar
  → selectedDocument(aadhaar).uploadAsset

Upload PAN
  → selectedDocument(pan).uploadAsset
```

---

## 16. Value Normalization

Normalization canonical key के आधार पर करें; raw value को blindly fill न करें।

### Aadhaar

```ts
function normalizeAadhaar(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 12);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}
```

Validation:

```text
exactly 12 digits after removing spaces
```

Display:

```text
•••• •••• 1234
```

### PAN

```ts
function normalizePan(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 10);
}
```

Validation:

```text
5 uppercase letters + 4 digits + 1 uppercase letter
```

Pattern:

```regex
^[A-Z]{5}[0-9]{4}[A-Z]$
```

Display:

```text
ABCDE•••••
```

### Phone

- Keep country code when available.
- Do not silently change country.
- For verification compare digits only.
- Display masked in review if sensitive.

### Email

- Trim whitespace.
- Lowercase only for comparison.
- Preserve user-entered casing if product requires display preservation.
- Validate basic email format before fill.

### Date

- Convert known formats to page-required format only when field metadata indicates expected format.
- Never guess day/month order from ambiguous text.
- If ambiguous, manual review.

### General text

```ts
value.trim().replace(/\s+/g, ' ')
```

---

## 17. Files and Upload Logic

### 17.1 Detect upload fields

Primary signal:

```html
<input type="file">
```

Also inspect:

- associated label,
- button text,
- drop-zone text,
- `accept`,
- nearby text,
- `aria-label`,
- `data-testid`,
- document type words.

Examples:

```text
Upload Aadhaar
Upload PAN
Upload passport
Upload identity proof
Choose file
Attach document
Profile photo
Resume
```

### 17.2 Upload type safety

```text
Website asks PAN + selected asset is Aadhaar
  → stop
  → show type mismatch
  → do not upload
```

Accepted MIME/extension check:

```text
accept attribute
MIME type
extension
file size
website-specific requirement
```

### 17.3 Chrome file input limitation

Chrome extension automatically arbitrary local file path set नहीं कर सकती। Secure implementation options:

1. User explicitly chooses file through extension file picker।
2. User imports encrypted package containing an approved upload asset।
3. Companion/native bridge provides bytes after explicit authorization।

MVP में recommended:

- Files panel document select करे।
- यदि upload bytes extension में उपलब्ध हैं, तभी `Upload to Current Form` दिखाएं।
- Bytes उपलब्ध न हों तो `Please choose the document file` manual picker दिखाएं।
- User confirmation के बिना upload न करें।

### 17.4 Setting a file input

Supported page पर:

```ts
const dataTransfer = new DataTransfer();
dataTransfer.items.add(file);
input.files = dataTransfer.files;
input.dispatchEvent(new Event('change', { bubbles: true }));
```

फिर verify करें:

- `input.files.length > 0`
- file name/type/size expected है
- page preview/state बदल गया

कुछ websites programmatic file assignment reject कर सकती हैं। उस case में:

```text
Upload could not be completed automatically.
Please choose the selected document manually.
```

---

## 18. Controlled React/Vue/Angular Inputs

सिर्फ `element.value = value` पर्याप्त नहीं है। Controlled input में framework state update होनी चाहिए।

Recommended sequence:

```text
focus()
select existing value
set value using native setter
dispatch input event
dispatch change event
dispatch blur if safe
wait one animation frame
read value back
```

Example:

```ts
function setReactCompatibleValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;

  const descriptor = Object.getOwnPropertyDescriptor(
    prototype,
    'value',
  );

  descriptor?.set?.call(element, value);
  element.dispatchEvent(new InputEvent('input', {
    bubbles: true,
    inputType: 'insertText',
    data: value,
  }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}
```

### Verification

```text
read element.value
normalize both expected and actual
compare
```

यदि readback fail हो:

1. एक retry करें।
2. Existing value select करें।
3. Controlled setter फिर run करें।
4. Fallback paste केवल user-initiated action में करें।
5. Infinite MutationObserver retry loop न बनाएं।

---

## 19. Fill Plan

```ts
type FillPlan = {
  sessionId: string;
  tabId: number;
  origin: string;
  createdAt: string;
  fields: FieldMatch[];
  selectedDocumentIds: string[];
  requiresSensitiveConfirmation: boolean;
  uploadActions: UploadAction[];
  blockedActions: BlockedAction[];
};

type UploadAction = {
  fieldId: string;
  documentId: string;
  expectedDocumentType: string;
  status: 'ready' | 'needs_file' | 'type_mismatch' | 'unsupported';
};

type BlockedAction = {
  fieldId?: string;
  reason:
    | 'captcha'
    | 'otp'
    | 'password'
    | 'consent'
    | 'submit'
    | 'payment'
    | 'low_confidence'
    | 'unsupported_control'
    | 'cross_origin_frame';
};
```

### Plan creation

```text
1. Discover visible unique controls.
2. Classify control type.
3. Normalize DOM labels/signals.
4. Generate semantic candidates.
5. Resolve local source.
6. Calculate confidence.
7. Apply hard safety stops.
8. Mark sensitive fields unselected.
9. Show review.
10. Wait for user confirm.
```

---

## 20. Message Contracts

हर message में `requestId` और `sessionId` रखें।

```ts
type BaseMessage = {
  requestId: string;
  sessionId?: string;
  type: string;
};
```

### Popup → service worker

```ts
type StartSessionMessage = BaseMessage & {
  type: 'SESSION_START';
  tabId?: number;
};

type ScanPageMessage = BaseMessage & {
  type: 'PAGE_SCAN_REQUEST';
  tabId: number;
};

type OpenFilesMessage = BaseMessage & {
  type: 'FILES_OPEN';
};

type SelectDocumentsMessage = BaseMessage & {
  type: 'FILES_SET_SELECTION';
  documentIds: string[];
};

type FillConfirmMessage = BaseMessage & {
  type: 'FILL_CONFIRM';
  fieldIds: string[];
  sensitiveFieldIds: string[];
};

type StopSessionMessage = BaseMessage & {
  type: 'SESSION_STOP';
};
```

### Service worker → content script

```ts
type ScanPageCommand = BaseMessage & {
  type: 'CONTENT_SCAN';
};

type ApplyFillCommand = BaseMessage & {
  type: 'CONTENT_APPLY_FILL';
  plan: FillPlan;
};

type RemovePanelCommand = BaseMessage & {
  type: 'CONTENT_CLOSE_PANEL';
};
```

### Content script → service worker

```ts
type PageScanResult = BaseMessage & {
  type: 'CONTENT_SCAN_RESULT';
  fields: DomFieldSignals[];
  page: {
    origin: string;
    title: string;
    urlPath: string;
  };
};

type FillProgress = BaseMessage & {
  type: 'CONTENT_FILL_PROGRESS';
  result: FillResult;
};
```

### Response envelope

```ts
type MessageResponse<T> =
  | {
      ok: true;
      requestId: string;
      data: T;
    }
  | {
      ok: false;
      requestId: string;
      errorCode: string;
      message: string;
    };
```

Never put a full sensitive value in an error message.

---

## 21. Fill Result and Verification

```ts
type FillResult = {
  sessionId: string;
  startedAt: string;
  completedAt: string;
  detectedCount: number;
  matchedCount: number;
  filledCount: number;
  skippedCount: number;
  needsReviewCount: number;
  unavailableCount: number;
  fields: Array<{
    fieldId: string;
    semanticType: string;
    status:
      | 'filled_verified'
      | 'fill_sent_not_verified'
      | 'skipped'
      | 'blocked'
      | 'unavailable'
      | 'failed';
    reason?: string;
  }>;
};
```

Success केवल request भेजने पर न दिखाएं। हर field के लिए:

```text
expected value
  ↓
fill action
  ↓
read actual value/state
  ↓
normalize compare
  ↓
verified / failed
```

UI summary:

```text
Detected: 8
Matched: 6
Filled and verified: 4
Needs review: 1
Unavailable: 1
Skipped: 2
```

---

## 22. AI / “See This Screen” Logic

### Preferred MVP

पहले AI के बिना deterministic DOM matcher बनाएं। इससे:

- private page data external service में नहीं जाएगा।
- offline fill काम करेगा।
- debugging आसान रहेगी।
- user को transparent field source दिखेगा।

### Optional AI mode

अगर बाद में AI जोड़ना हो:

1. User `See This Screen` press करे।
2. Clear consent dialog दिखे:

   ```text
   This will analyze the current page with your configured AI service.
   Do not include passwords, OTPs, payment details or unrelated content.
   ```

3. User explicitly confirm करे।
4. केवल redacted DOM metadata भेजें; full page HTML और full values नहीं।
5. AI से strict structured JSON लें।
6. Zod/JSON schema validate करें।
7. AI को actual user value invent करने न दें।
8. AI result review panel में दिखाएं।
9. User confirm के बाद fill करें।

### AI response contract

```json
{
  "pageType": "registration_form",
  "fields": [
    {
      "fieldId": "dom-generated-id",
      "label": "Aadhaar Number",
      "semanticType": "aadhaar",
      "sourceDocumentType": "aadhaar",
      "confidence": 0.97,
      "action": "review_required"
    }
  ]
}
```

AI response में actual PAN/Aadhaar value नहीं होनी चाहिए। Value local resolver से आएगी।

### AI must not

- missing LinkedIn URL invent करना।
- PAN/Aadhaar guess करना।
- unknown field में credential डालना।
- CAPTCHA solve करना।
- site security bypass करना।
- user confirmation bypass करना।

---

## 23. Password and Credential Policy

### MVP

Chrome extension के normal vault JSON में password न रखें और password fields fill न करें।

User को:

```text
Chrome Password Manager can handle passwords.
Secure Vault Smart Fill handles approved profile/document fields.
```

दिखाया जा सकता है।

### Optional future credential flow

अगर password support आवश्यक हो:

- Exact origin binding अनिवार्य।
- User-initiated action अनिवार्य।
- Extension popup में explicit authentication/confirmation।
- Password केवल one-time in-memory operation में।
- `chrome.storage.local` में plaintext password नहीं।
- Password को normal content-script messages में broadcast नहीं करें।
- Wrong origin पर password release नहीं।
- Stop/error/tab navigation पर staged secret clear करें।
- Password, username और origin matching का audit log masked हो।

Password feature को identity document fill के साथ silently combine न करें।

---

## 24. Security and Privacy Rules

### Never log

- Full Aadhaar number।
- Full PAN number।
- Password।
- OTP।
- CVV/card number।
- Full document image।
- Raw page HTML।
- Full input values।
- Encryption passphrase।
- Decrypted export payload।

### Safe diagnostic logging

```text
sessionId: hashed/short-lived id
origin: example.com
fieldType: aadhaar
confidence: 0.97
sourceType: selected_document
status: blocked_sensitive_review
```

Masking examples:

```text
Aadhaar: ********1234
PAN: *****1234F
Phone: ******1234
Email: a***@example.com
```

### Origin binding

Session में current origin save करें:

```ts
{
  origin: "https://example.com",
  tabId: 123,
  startedAt: "...",
  expiresAt: "..."
}
```

यदि tab origin बदल जाए:

- session invalidate करें,
- pending plan clear करें,
- sensitive values clear करें,
- user को फिर से start करने को कहें।

### Session timeout

Suggested default:

```text
idle timeout: 10 minutes
hard session timeout: 30 minutes
```

Timeout configurable रखें, लेकिन sensitive session indefinite न रखें।

### Page trust

- `http://` pages पर warning दिखाएं।
- `https://` को preferred/required रखें।
- Extension page या browser internal page पर run न करें।
- Chrome Web Store, settings, new tab, PDF viewer जैसे restricted pages पर graceful unsupported state दें।

---

## 25. Content Security Rules

- `innerHTML` में untrusted page text inject न करें।
- Review UI DOM में `textContent`/framework escaping use करें।
- Remote JavaScript load न करें।
- Inline `eval`/`new Function` न use करें।
- Extension CSP कमजोर न करें।
- Page script context में secret expose न करें।
- Content script और page context bridge में केवल minimum data भेजें।
- Page website को extension secret access न मिले।

### Isolated world vs page context

Content script isolated world में चलेगा। Website के JavaScript framework state तक direct access की आवश्यकता हो तो छोटा page bridge use कर सकते हैं, लेकिन:

- bridge में secrets न रखें,
- `window.postMessage` messages validate करें,
- origin/source check करें,
- arbitrary page messages accept न करें।

---

## 26. Dynamic Pages and MutationObserver

Web forms अक्सर बाद में render होते हैं।

Observer logic:

```text
Start session
  ↓
Initial scan
  ↓
MutationObserver on relevant root
  ↓
Debounce 250–500 ms
  ↓
Re-discover only changed/added controls
  ↓
Deduplicate
  ↓
Update review plan
```

Rules:

- हर mutation पर full scan न करें।
- Observer loop में अपना injected UI ignore करें।
- Fill के बाद observer को temporarily pause करें।
- Session stop पर `disconnect()` करें।
- Sensitive field changes पर plan फिर review-required कर दें।

---

## 27. Iframes, Shadow DOM and Browser Limits

### Same-origin iframe

- यदि content script permitted है, frame में separately scan करें।
- `frameId` को field identity में include करें।

### Cross-origin iframe

- Arbitrary DOM access का दावा न करें।
- Host permission/content script उपलब्ध हो तो ही inspect करें।
- अन्यथा field को `cross_origin_frame` blocked status दें।

### Shadow DOM

- Open shadow root support कर सकते हैं।
- Closed shadow root को force/access bypass करने की कोशिश न करें।
- Shadow field की identity में host path रखें।

### Browser Chrome UI

Content script webpage DOM देखता है, browser address bar या Chrome UI नहीं। Developer को Chrome DOM access का promise नहीं करना है।

---

## 28. File Selection UX Contract

### All selected behavior

```text
User opens Files
  ↓
Presses Select all
  ↓
All verified/available documents selected
  ↓
Button label becomes All selected
  ↓
User presses Use for Fill
  ↓
Current form plan reads each selected document JSON once
```

### PAN/Aadhaar example

```text
Selected:
  ✓ Aadhaar Card
  ✓ PAN Card

Current page:
  Aadhaar Number
  PAN Number

Resolver:
  Aadhaar Number → Aadhaar Card JSON key "aadhaar"
  PAN Number → PAN Card JSON key "pan"
```

Never:

```text
Aadhaar Number → first available document's first numeric field
PAN Number → arbitrary profile/document value
```

---

## 29. Error Catalog

```ts
type ErrorCode =
  | 'VAULT_LOCKED'
  | 'VAULT_NOT_IMPORTED'
  | 'VAULT_DECRYPT_FAILED'
  | 'UNSUPPORTED_PAGE'
  | 'INSECURE_PAGE'
  | 'NO_VISIBLE_FIELDS'
  | 'NO_MATCHES'
  | 'LOW_CONFIDENCE'
  | 'DOCUMENT_NOT_SELECTED'
  | 'DOCUMENT_NOT_READY'
  | 'DOCUMENT_TYPE_MISMATCH'
  | 'UPLOAD_ASSET_UNAVAILABLE'
  | 'UPLOAD_REJECTED'
  | 'CONTROLLED_INPUT_NOT_VERIFIED'
  | 'CROSS_ORIGIN_FRAME'
  | 'SENSITIVE_CONFIRMATION_REQUIRED'
  | 'SESSION_EXPIRED'
  | 'ORIGIN_CHANGED'
  | 'USER_CANCELLED'
  | 'AI_CONSENT_REQUIRED'
  | 'AI_UNAVAILABLE';
```

### User-facing examples

```text
Vault locked
Unlock Secure Vault before starting Smart Fill.
```

```text
No safe match found
The page has fields, but no approved local value matched safely.
```

```text
Document type mismatch
This page asks for PAN, but the selected file is Aadhaar.
```

```text
Manual action required
This control is a CAPTCHA, OTP, consent, or security challenge.
```

```text
Could not verify field
The website did not accept the value through its controlled input.
Please review and enter it manually.
```

---

## 30. Audit Events

Audit events must be privacy-safe:

```ts
type AuditEvent = {
  type:
    | 'vault_imported'
    | 'vault_locked'
    | 'session_started'
    | 'page_scanned'
    | 'documents_selected'
    | 'sensitive_field_confirmed'
    | 'fill_started'
    | 'field_filled'
    | 'field_failed'
    | 'upload_verified'
    | 'session_stopped'
    | 'session_completed';
  origin?: string;
  count?: number;
  fieldType?: string;
  documentType?: string;
  timestamp: string;
};
```

Do not save:

- actual field value,
- full document id if it reveals identity,
- screenshot,
- page form contents,
- password metadata beyond safe status.

---

## 31. Implementation Pseudocode

### Start session

```ts
async function startSmartFill(tabId: number) {
  const vault = await requireUnlockedVault();
  const tab = await chrome.tabs.get(tabId);

  assertSupportedOrigin(tab.url);

  const session = createSession({
    tabId,
    origin: new URL(tab.url!).origin,
  });

  await ensureContentScript(tabId);
  const discovered = await sendToContentScript(tabId, {
    type: 'CONTENT_SCAN',
    requestId: randomId(),
    sessionId: session.id,
  });

  const selectedDocuments = getSelectedDocumentsOrAll(vault.documents);
  const plan = buildFillPlan({
    discoveredFields: discovered.fields,
    profile: vault.profile,
    documents: selectedDocuments,
    session,
  });

  await saveSession(session);
  return plan;
}
```

### Build plan

```ts
function buildFillPlan(input: BuildPlanInput): FillPlan {
  const matches = input.discoveredFields.map((domField) => {
    const semantic = classifyDomField(domField);

    if (isHardBlocked(semantic, domField)) {
      return blockedMatch(domField, semantic);
    }

    const source = resolveLocalSource(
      semantic,
      input.profile,
      input.documents,
    );

    const confidence = scoreMatch(domField, semantic, source);

    return {
      ...createMatch(domField, semantic, source, confidence),
      selected: confidence >= 0.9 && !isSensitive(semantic),
    };
  });

  return {
    sessionId: input.session.id,
    tabId: input.session.tabId,
    origin: input.session.origin,
    createdAt: new Date().toISOString(),
    fields: matches,
    selectedDocumentIds: input.documents.map((doc) => doc.id),
    requiresSensitiveConfirmation: matches.some(
      (match) => match.sensitive && match.valueAvailable,
    ),
    uploadActions: buildUploadActions(matches, input.documents),
    blockedActions: buildBlockedActions(matches),
  };
}
```

### Fill approved fields

```ts
async function fillApprovedFields(plan: FillPlan, approvedFieldIds: string[]) {
  assertSessionOriginUnchanged(plan);

  const approved = plan.fields.filter(
    (field) =>
      approvedFieldIds.includes(field.fieldId) &&
      field.selected &&
      !field.sensitiveConfirmationPending &&
      field.status === 'matched',
  );

  const results = [];

  for (const field of approved) {
    if (field.semanticType === 'password') {
      results.push(blocked(field, 'password'));
      continue;
    }

    const result = await fillOneField(field);
    results.push(await verifyOneField(field, result));
  }

  return summarizeResults(results);
}
```

---

## 32. What the Extension Must Not Do

```text
No silent form submission
No captcha solving
No OTP reading or bypass
No payment/CVV automation
No anti-bot bypass
No credential injection into unknown fields
No arbitrary Chrome UI access
No unrestricted cross-origin DOM access
No background capture without consent
No automatic external AI upload
No full sensitive values in logs
No raw password in normal vault JSON
No automatic upload of Aadhaar/PAN
No invented missing data
No silent origin change continuation
```

---

## 33. Suggested Development Phases

### Phase 1 — Extension shell

- Manifest V3
- Service worker
- Popup
- Active tab permission
- Session start/stop
- Content script injection
- Basic supported-page detection

### Phase 2 — Encrypted vault import

- Encrypted export envelope
- Web Crypto decrypt
- Unlock/lock flow
- Metadata-only document list
- Clear vault action

### Phase 3 — Deterministic field matcher

- DOM discovery
- Label/ARIA/name/id/autocomplete parsing
- Alias map
- Confidence score
- Canonical resolver
- PAN/Aadhaar document ownership

### Phase 4 — Review and fill

- In-page review panel
- Multi-select Files
- Select all toggle
- Sensitive confirmation
- Controlled-input setter
- Readback verification
- Completion summary

### Phase 5 — Upload support

- Document type detection
- MIME/accept/size checks
- Explicit user file picker
- File input assignment
- Upload verification
- Manual fallback

### Phase 6 — Quality and compatibility

- MutationObserver
- React/Vue/Angular controls
- open shadow roots
- same-origin frames
- unsupported page states
- performance optimization

### Phase 7 — Optional features

- Side Panel
- per-site permission
- AI screen analysis with explicit consent
- Native Messaging companion
- authorized API bridge

---

## 34. Testing Plan

### 34.1 Unit tests

Test:

- `normalizeAadhaar`
- `normalizePan`
- email/phone/date normalization
- alias normalization
- document type ownership
- PAN-from-PAN only rule
- Aadhaar-from-Aadhaar only rule
- source priority
- confidence score
- sensitive default selection
- Select all toggle
- unavailable document exclusion
- session transitions
- session timeout
- origin change invalidation
- masking/redaction
- encrypted envelope validation

### 34.2 DOM fixture tests

Create fixtures for:

```text
plain HTML input
label + for/id
aria-label only
autocomplete only
React controlled input
Vue controlled input
Angular input
textarea
select
contenteditable
file input
hidden duplicate input
dynamic form
open shadow DOM
same-origin iframe
cross-origin iframe
captcha-like form
consent checkbox
payment form
OTP form
```

### 34.3 End-to-end flows

#### Flow A — Profile fields

```text
Import encrypted vault
Unlock
Open test form
Start Smart Fill
Detect full name/email/phone
Review
Confirm safe fields
Fill
Verify readback
Do not submit
```

#### Flow B — PAN/Aadhaar

```text
Import Aadhaar JSON
Import PAN JSON
Select All
Open form with Aadhaar + PAN
Verify Aadhaar reads Aadhaar JSON
Verify PAN reads PAN JSON
Verify no cross-document mix-up
Sensitive review required
```

#### Flow C — File upload

```text
Select Aadhaar
Page asks PAN upload
Show type mismatch
Do not upload
Select correct PAN
User confirms
Upload/verify or show manual fallback
```

#### Flow D — unsafe page

```text
OTP/CAPTCHA/consent/payment field detected
Field is blocked
No value filled
User sees manual action message
```

#### Flow E — origin change

```text
Start on example.com
Navigate to another origin
Session invalidates
Sensitive plan clears
User must start again
```

### 34.4 Security tests

- Inspect `chrome.storage.local` and confirm no plain PAN/Aadhaar.
- Search all logs for sensitive values.
- Verify unlock passphrase is never persisted.
- Verify tab-origin binding.
- Verify stop clears session.
- Verify malformed encrypted package is rejected.
- Verify wrong passphrase does not expose partial data.
- Verify page cannot request vault data through arbitrary `postMessage`.
- Verify password is never returned by normal resolver.
- Verify broad host permissions are absent in MVP.

---

## 35. Acceptance Checklist

### Architecture

- [ ] Manifest V3।
- [ ] Service worker + content script separation।
- [ ] Popup/side panel does not directly manipulate page DOM।
- [ ] Content script does not own persistent vault secrets।
- [ ] Mobile app private storage boundary documented।

### Vault

- [ ] Encrypted import works।
- [ ] Wrong passphrase fails safely।
- [ ] Plain sensitive data is not stored in `chrome.storage.local`।
- [ ] Lock clears decrypted session data।
- [ ] Document metadata and structured fields load correctly।

### Files

- [ ] All filter।
- [ ] Category filters।
- [ ] Multi-select।
- [ ] Select all selects all available documents।
- [ ] Select all toggles back to none।
- [ ] Unavailable documents cannot be selected।
- [ ] Selection persists until session stop।
- [ ] `Use for Fill` updates current plan।

### Mapping

- [ ] PAN key normalized to `pan`।
- [ ] Aadhaar key normalized to `aadhaar`।
- [ ] PAN comes from PAN document।
- [ ] Aadhaar comes from Aadhaar document।
- [ ] Values are normalized before fill।
- [ ] Low-confidence fields are not auto-selected।
- [ ] Sensitive fields require explicit confirmation।

### DOM

- [ ] Visible controls only।
- [ ] Hidden/duplicate controls deduplicated।
- [ ] Label, ARIA, name, id and autocomplete inspected।
- [ ] Dynamic controls detected with debounced observer।
- [ ] Controlled inputs verified after fill।
- [ ] Unsupported iframe/shadow cases reported honestly।

### Safety

- [ ] No auto-submit।
- [ ] No consent auto-check।
- [ ] No OTP/CAPTCHA/CVV automation।
- [ ] No password in normal JSON or logs।
- [ ] No silent AI upload।
- [ ] No type-mismatched document upload।
- [ ] Origin change invalidates session।

### Result

- [ ] Every field has verified/failed/skipped status।
- [ ] Completion summary shows counts।
- [ ] User can stop at any time।
- [ ] Manual fallback is clear।
- [ ] Extension works offline after vault unlock for deterministic mapping।

---

## 36. Final Developer Handoff Summary

Build the extension as a **user-controlled Chrome Smart Fill assistant**, not as an unrestricted browser automation tool.

The correct first flow is:

```text
User imports encrypted Secure Vault export
        ↓
User unlocks vault
        ↓
User opens a supported webpage
        ↓
User presses Start Smart Fill
        ↓
Extension discovers visible unique form controls
        ↓
User opens Files if needed
        ↓
User selects multiple documents or Select all
        ↓
Extension resolves fields from canonical local JSON
        ↓
Aadhaar field reads Aadhaar document JSON
PAN field reads PAN document JSON
        ↓
Extension shows review plan
        ↓
User confirms sensitive fields
        ↓
Extension fills only approved fields
        ↓
Each field is read back and verified
        ↓
Extension shows result summary
        ↓
User manually reviews and submits the website
```

### Most important implementation sentence

> **The extension must never guess between Aadhaar and PAN documents: the webpage semantic field, selected document type, canonical JSON key, user confirmation, and post-fill verification must all agree before a sensitive field is filled.**
