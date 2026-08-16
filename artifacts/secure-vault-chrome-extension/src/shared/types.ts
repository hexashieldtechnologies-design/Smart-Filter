export type CanonicalFieldKey =
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

export type DocumentStatus =
  | 'verified_local'
  | 'processing'
  | 'not_added'
  | 'analysis_failed'
  | 'needs_review';

export type DocumentCategory =
  | 'identity'
  | 'financial'
  | 'education'
  | 'employment'
  | 'personal'
  | 'other';

export type ExtractedDocumentField = {
  key: string;
  value: string;
  confidence: number;
  source: string;
  confirmed?: boolean;
};

export type VaultDocument = {
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
  category?: DocumentCategory;
}

export type VaultProfile = {
  fullName?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  mobile?: string;
  alternateMobile?: string;
  email?: string;
  alternateEmail?: string;
  dateOfBirth?: string;
  gender?: string;
  nationality?: string;
  maritalStatus?: string;
  linkedinUrl?: string;
  permanentAddress?: AddressProfile;
  currentAddress?: AddressProfile;
  sameAsPermanent?: boolean;
  aadhaarNumber?: string;
  panNumber?: string;
  drivingLicenceNumber?: string;
  passportNumber?: string;
  qualification?: string;
  institution?: string;
  course?: string;
  yearOfPassing?: string;
  occupation?: string;
  organization?: string;
  designation?: string;
};

export type AddressProfile = {
  houseFlat?: string;
  buildingStreet?: string;
  areaLocality?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  pinCode?: string;
};

export type UnlockedVault = {
  schemaVersion: number;
  kind: 'secure-vault-export';
  exportedAt: string;
  profile: VaultProfile;
  documents: VaultDocument[];
  preferences: {
    smartFillEnabled: boolean;
  };
};

export type EncryptedVaultEnvelope = {
  format: 'secure-vault-encrypted';
  formatVersion: 1;
  kdf: {
    name: 'PBKDF2';
    hash: 'SHA-256';
    iterations: 600000;
    salt: string;
  };
  cipher: {
    name: 'AES-GCM';
    iv: string;
    tagLength: 128;
  };
  payload: string;
};

export type DomFieldSignals = {
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
  controlKind: 'text' | 'select' | 'textarea' | 'contenteditable' | 'file';
};

export type FieldSource =
  | { kind: 'profile'; key: CanonicalFieldKey }
  | { kind: 'document'; documentId: string; key: CanonicalFieldKey }
  | { kind: 'upload'; documentId: string }
  | { kind: 'none' };

export type FieldMatch = {
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
  source: FieldSource;
  value?: string;
  valueAvailable: boolean;
  confidence: number;
  sensitive: boolean;
  selected: boolean;
  sensitiveConfirmationPending?: boolean;
  status:
    | 'matched'
    | 'needs_review'
    | 'unavailable'
    | 'unsupported'
    | 'blocked';
  reason?: string;
};

export type UploadAction = {
  fieldId: string;
  documentId: string;
  expectedDocumentType: string;
  status: 'ready' | 'needs_file' | 'type_mismatch' | 'unsupported';
};

export type BlockedAction = {
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

export type FillPlan = {
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

export type SmartFillPhase =
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

export type SmartFillSession = {
  id: string;
  tabId: number;
  origin: string;
  startedAt: string;
  expiresAt: string;
  phase: SmartFillPhase;
  selectedDocumentIds: string[];
};

export type FillResult = {
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

export type AuditEvent = {
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