import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { secureVaultNative, type SavedLoginCredential } from '@/services/secureVaultNative';
import { smartFillNative } from '@/services/smartFillNative';

export type DocumentStatus = 'Verified' | 'Not added' | 'Processing';

export type ExtractedDocumentField = {
  key: string;
  value: string;
  confidence: number;
  source: string;
};

export type AddressDetails = {
  houseFlat: string;
  buildingStreet: string;
  areaLocality: string;
  city: string;
  district: string;
  state: string;
  country: string;
  pinCode: string;
};

export type VaultProfile = {
  fullName: string;
  firstName: string;
  middleName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  nationality: string;
  maritalStatus: string;
  fatherName: string;
  motherName: string;
  spouseName: string;
  mobile: string;
  alternateMobile: string;
  email: string;
  alternateEmail: string;
  loginEmail: string;
  loginDomain: string;
  linkedinUrl: string;
  permanentAddress: AddressDetails;
  currentAddress: AddressDetails;
  sameAsPermanent: boolean;
  aadhaarNumber: string;
  panNumber: string;
  drivingLicenceNumber: string;
  passportNumber: string;
  qualification: string;
  institution: string;
  course: string;
  yearOfPassing: string;
  occupation: string;
  organization: string;
  designation: string;
  updatedAt: string;
};

export function createEmptyVaultProfile(): VaultProfile {
  const emptyAddress = (): AddressDetails => ({
    houseFlat: '',
    buildingStreet: '',
    areaLocality: '',
    city: '',
    district: '',
    state: '',
    country: 'India',
    pinCode: '',
  });

  return {
    fullName: '',
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    nationality: 'Indian',
    maritalStatus: '',
    fatherName: '',
    motherName: '',
    spouseName: '',
    mobile: '',
    alternateMobile: '',
    email: '',
    alternateEmail: '',
    loginEmail: '',
    loginDomain: '',
    linkedinUrl: '',
    permanentAddress: emptyAddress(),
    currentAddress: emptyAddress(),
    sameAsPermanent: true,
    aadhaarNumber: '',
    panNumber: '',
    drivingLicenceNumber: '',
    passportNumber: '',
    qualification: '',
    institution: '',
    course: '',
    yearOfPassing: '',
    occupation: '',
    organization: '',
    designation: '',
    updatedAt: '',
  };
}

export type VaultDocument = {
  id: string;
  type: string;
  label: string;
  status: DocumentStatus;
  identifier: string;
  updated: string;
  icon: string;
  color: 'aqua' | 'gold' | 'navy' | 'coral';
  imageUri?: string;
  imageData?: string;
  localFileUri?: string;
  contentType?: string;
  extractedFields?: ExtractedDocumentField[];
  analysisStatus?: 'not-analyzed' | 'analyzing' | 'analyzed' | 'failed';
  analyzedAt?: string;
};

export type AuditItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  icon: string;
};

export type VaultCredentialAccount = SavedLoginCredential;

type VaultContextValue = {
  ready: boolean;
  hasOnboarded: boolean;
  documents: VaultDocument[];
  profile?: VaultProfile | null;
  auditItems: AuditItem[];
  biometricEnabled: boolean;
  smartFillEnabled: boolean;
  completeOnboarding: () => Promise<void>;
  credentialAccounts: VaultCredentialAccount[];
  saveProfile: (profile: VaultProfile, loginPassword?: string) => Promise<void>;
  getLoginCredentials: () => Promise<VaultCredentialAccount[]>;
  authorizeCredentialFill: (account: VaultCredentialAccount) => Promise<boolean>;
  addDocument: (document: VaultDocument) => Promise<void>;
  updateDocumentAnalysis: (id: string, fields: ExtractedDocumentField[], status?: VaultDocument['analysisStatus']) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  toggleBiometric: () => Promise<void>;
  toggleSmartFill: () => Promise<void>;
  addAudit: (title: string, detail: string, icon: string) => Promise<void>;
  resetVault: () => Promise<void>;
};

type PersistedVaultState = {
  hasOnboarded: boolean;
  documents: VaultDocument[];
  profile?: VaultProfile | null;
  auditItems: AuditItem[];
  biometricEnabled: boolean;
  smartFillEnabled: boolean;
  credentialAccounts?: VaultCredentialAccount[];
};

type LegacyVaultProfile = Partial<VaultProfile> & {
  loginPassword?: string;
};

const starterDocuments: VaultDocument[] = [
  {
    id: 'aadhaar',
    type: 'Identity',
    label: 'Aadhaar Card',
    status: 'Not added',
    identifier: 'Ready when you are',
    updated: '12 Aug 2026',
    icon: 'card-outline',
    color: 'aqua',
  },
  {
    id: 'pan',
    type: 'Tax identity',
    label: 'PAN Card',
    status: 'Not added',
    identifier: 'Ready when you are',
    updated: '12 Aug 2026',
    icon: 'layers-outline',
    color: 'gold',
  },
  {
    id: 'resume',
    type: 'Career document',
    label: 'Resume',
    status: 'Not added',
    identifier: 'Ready when you are',
    updated: '—',
    icon: 'document-text-outline',
    color: 'coral',
  },
  {
    id: 'passport',
    type: 'Travel identity',
    label: 'Passport',
    status: 'Not added',
    identifier: 'Ready when you are',
    updated: '—',
    icon: 'book-outline',
    color: 'navy',
  },
  {
    id: 'license',
    type: 'Mobility',
    label: 'Driving Licence',
    status: 'Not added',
    identifier: 'Ready when you are',
    updated: '—',
    icon: 'car-outline',
    color: 'coral',
  },
];

const starterAudit: AuditItem[] = [
  { id: '1', title: 'Smart Fill session completed', detail: '3 approved fields filled', time: 'Today, 4:12 PM', icon: 'sparkles-outline' },
  { id: '2', title: 'PAN verification completed', detail: 'Document status updated', time: 'Today, 4:07 PM', icon: 'checkmark-circle-outline' },
  { id: '3', title: 'Document uploaded', detail: 'Aadhaar Card added securely', time: 'Today, 4:05 PM', icon: 'cloud-upload-outline' },
];

const VaultContext = createContext<VaultContextValue | null>(null);
const STORAGE_KEY = 'secure-vault-local-state';

function toPersistedDocuments(documents: VaultDocument[]) {
  return documents.map(({ imageData: _imageData, imageUri: _imageUri, ...document }) => ({
    ...document,
    extractedFields: normalizeExtractedFields(document.extractedFields),
  }));
}

function normalizeExtractedKey(key: string) {
  const compact = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  const aliases: Record<string, string> = {
    name: 'fullName',
    fullname: 'fullName',
    firstname: 'firstName',
    lastname: 'lastName',
    fathername: 'fatherName',
    mothername: 'motherName',
    phone: 'phone',
    mobile: 'phone',
    email: 'email',
    dob: 'dob',
    dateofbirth: 'dob',
    aadhaar: 'aadhaar',
    aadhar: 'aadhaar',
    aadhaarnumber: 'aadhaar',
    aadharnumber: 'aadhaar',
    uid: 'aadhaar',
    uidnumber: 'aadhaar',
    pan: 'pan',
    pannumber: 'pan',
    passport: 'passportNumber',
    passportnumber: 'passportNumber',
    pincode: 'pincode',
    zipcode: 'pincode',
  };
  return aliases[compact] ?? key.trim();
}

function normalizeExtractedValue(key: string, value: string) {
  if (key === 'aadhaar') {
    const digits = value.replace(/\D/g, '').slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  }
  if (key === 'pan') return value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 10);
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeExtractedFields(fields?: ExtractedDocumentField[]) {
  if (!fields?.length) return fields;
  const normalized = new Map<string, ExtractedDocumentField>();
  for (const field of fields) {
    const key = normalizeExtractedKey(field.key);
    const value = normalizeExtractedValue(key, field.value);
    if (!value) continue;
    const next = { ...field, key, value };
    const previous = normalized.get(key);
    if (!previous || next.confidence > previous.confidence) normalized.set(key, next);
  }
  return Array.from(normalized.values());
}

function normalizeExtractedDateForProfile(value: string) {
  const match = value.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})\b/);
  if (!match) return '';
  const day = Number(match[1]);
  const month = Number(match[2]);
  const rawYear = Number(match[3]);
  const year = rawYear < 100 ? (rawYear >= 50 ? 1900 + rawYear : 2000 + rawYear) : rawYear;
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    year < 1900 ||
    date.getTime() > Date.now()
  ) {
    return '';
  }
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function mergeExtractedFieldsIntoProfile(
  existingProfile: VaultProfile | null | undefined,
  fields: ExtractedDocumentField[],
) {
  const trustedFields = fields.filter((field) => {
    const value = field.value.trim();
    return field.confidence >= 80 && value.length >= 2 && !/^(x{2,}|[*•]{2,})$/i.test(value);
  });
  if (trustedFields.length === 0) return existingProfile ?? null;

  const nextProfile = normalizeProfile(existingProfile) ?? createEmptyVaultProfile();
  let changed = false;
  const setIfEmpty = (current: string, value: string | undefined, setter: (next: string) => void) => {
    const cleanValue = value?.trim().replace(/\s+/g, ' ') ?? '';
    if (!current.trim() && cleanValue) {
      setter(cleanValue);
      changed = true;
    }
  };

  const byKey = new Map(trustedFields.map((field) => [normalizeExtractedKey(field.key), field.value]));
  const fullName = byKey.get('fullName');
  setIfEmpty(nextProfile.fullName, fullName, (value) => { nextProfile.fullName = value; });
  setIfEmpty(nextProfile.firstName, byKey.get('firstName'), (value) => { nextProfile.firstName = value; });
  setIfEmpty(nextProfile.lastName, byKey.get('lastName'), (value) => { nextProfile.lastName = value; });
  if (!nextProfile.firstName && fullName) {
    nextProfile.firstName = fullName.split(/\s+/)[0] ?? '';
    changed = true;
  }
  if (!nextProfile.lastName && fullName) {
    const parts = fullName.split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
      nextProfile.lastName = parts[parts.length - 1];
      changed = true;
    }
  }

  const dateOfBirth = normalizeExtractedDateForProfile(byKey.get('dob') ?? '');
  setIfEmpty(nextProfile.dateOfBirth, dateOfBirth, (value) => { nextProfile.dateOfBirth = value; });
  setIfEmpty(nextProfile.gender, byKey.get('gender'), (value) => { nextProfile.gender = value; });
  setIfEmpty(nextProfile.mobile, byKey.get('phone'), (value) => { nextProfile.mobile = value; });
  setIfEmpty(nextProfile.email, byKey.get('email'), (value) => { nextProfile.email = value; });
  setIfEmpty(nextProfile.aadhaarNumber, byKey.get('aadhaar'), (value) => { nextProfile.aadhaarNumber = value; });
  setIfEmpty(nextProfile.panNumber, byKey.get('pan'), (value) => { nextProfile.panNumber = value; });
  setIfEmpty(nextProfile.passportNumber, byKey.get('passportNumber'), (value) => { nextProfile.passportNumber = value; });

  const address = nextProfile.permanentAddress;
  const addressValue = byKey.get('address');
  setIfEmpty(address.houseFlat, addressValue, (value) => { address.houseFlat = value; });
  setIfEmpty(address.city, byKey.get('city'), (value) => { address.city = value; });
  setIfEmpty(address.district, byKey.get('district'), (value) => { address.district = value; });
  setIfEmpty(address.state, byKey.get('state'), (value) => { address.state = value; });
  setIfEmpty(address.pinCode, byKey.get('pincode'), (value) => { address.pinCode = value; });
  if (changed) {
    nextProfile.currentAddress = { ...nextProfile.permanentAddress };
    nextProfile.sameAsPermanent = true;
    nextProfile.updatedAt = new Date().toISOString();
    return nextProfile;
  }
  return existingProfile ?? null;
}

function normalizeProfile(profile?: LegacyVaultProfile | null): VaultProfile | null {
  if (!profile) return null;
  const empty = createEmptyVaultProfile();
  const normalized = {
    ...empty,
    ...profile,
    permanentAddress: { ...empty.permanentAddress, ...profile.permanentAddress },
    currentAddress: { ...empty.currentAddress, ...profile.currentAddress },
  };
  return {
    ...normalized,
    // Existing vaults predate saved login credentials. Reuse the already
    // verified profile email as the initial login email without overwriting a
    // separately saved credential.
    loginEmail: profile.loginEmail ?? normalized.email,
    loginDomain: profile.loginDomain ?? '',
  };
}

const localDocumentsDirectory = `${FileSystem.documentDirectory ?? ''}vault-documents/`;

function fileExtension(contentType?: string) {
  const type = contentType?.toLowerCase();
  if (type === 'application/pdf') return 'pdf';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  return 'jpg';
}

async function saveDocumentFileLocally(document: VaultDocument) {
  if (document.localFileUri) return document.localFileUri;
  if (!document.imageUri && !document.imageData) return undefined;

  if (secureVaultNative.available && document.imageUri && !document.imageUri.startsWith('data:')) {
    const encryptedUri = await secureVaultNative.encryptFile(document.imageUri);
    if (encryptedUri) return encryptedUri;
    throw new Error('The selected document could not be encrypted into the private vault.');
  }

  await FileSystem.makeDirectoryAsync(localDocumentsDirectory, { intermediates: true });
  const safeId = document.id.replace(/[^a-z0-9_-]/gi, '-');
  const targetUri = `${localDocumentsDirectory}${safeId}-${Date.now()}.${fileExtension(document.contentType)}`;

  try {
    if (document.imageUri && !document.imageUri.startsWith('data:')) {
      await FileSystem.copyAsync({ from: document.imageUri, to: targetUri });
      return targetUri;
    }
  } catch {
    // Some Android pickers return a content URI. The base64 fallback below
    // still gives the vault a private on-device copy.
  }

  if (document.imageData) {
    await FileSystem.writeAsStringAsync(targetUri, document.imageData, {
      encoding: 'base64',
    });
    return targetUri;
  }

  throw new Error('The selected document could not be copied into the private vault storage.');
}

async function deleteDocumentFileLocally(document?: VaultDocument) {
  const uri = document?.localFileUri;
  if (!uri) return;
  if (secureVaultNative.available && uri.endsWith('.enc')) {
    await secureVaultNative.deleteFile(uri);
    return;
  }
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

async function readPersistedVaultState(stored: string | null): Promise<Partial<PersistedVaultState>> {
  if (!stored) return {};
  if (secureVaultNative.available) {
    try {
      const decrypted = await secureVaultNative.decryptText(stored);
      if (decrypted) {
        try {
          return JSON.parse(decrypted) as Partial<PersistedVaultState>;
        } catch {
          return {};
        }
      }
    } catch {
      // A legacy plaintext record may be migrated once below. Any other
      // unreadable value is treated as unavailable rather than being exposed.
    }

    if (!stored.trimStart().startsWith('{')) return {};
  }
  try {
    return JSON.parse(stored) as Partial<PersistedVaultState>;
  } catch {
    return {};
  }
}

async function writePersistedVaultState(state: Partial<PersistedVaultState>) {
  const payload = JSON.stringify(state);
  if (secureVaultNative.available) {
    const encrypted = await secureVaultNative.encryptText(payload);
    if (!encrypted) throw new Error('The secure vault could not encrypt its local state.');
    await AsyncStorage.setItem(STORAGE_KEY, encrypted);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, payload);
}

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [documents, setDocuments] = useState<VaultDocument[]>(starterDocuments);
  const [profile, setProfile] = useState<VaultProfile | null>(null);
  const [auditItems, setAuditItems] = useState<AuditItem[]>(starterAudit);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [smartFillEnabled, setSmartFillEnabled] = useState(true);
  const [credentialAccounts, setCredentialAccounts] = useState<VaultCredentialAccount[]>([]);
  const documentsRef = useRef<VaultDocument[]>(starterDocuments);
  const persistedStateRef = useRef<Partial<PersistedVaultState>>({});
  const persistQueueRef = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(async (stored) => {
      const parsed = await readPersistedVaultState(stored);
      setHasOnboarded(Boolean(parsed.hasOnboarded));
      const legacyProfile = parsed.profile as LegacyVaultProfile | undefined;
      const normalizedProfile = normalizeProfile(legacyProfile);
      if (normalizedProfile) {
        setProfile(normalizedProfile);
        const legacyPassword = legacyProfile?.loginPassword;
        if (
          legacyPassword &&
          normalizedProfile.loginEmail &&
          normalizedProfile.loginDomain &&
          secureVaultNative.credentialStorageAvailable
        ) {
          await secureVaultNative.saveLoginCredential(
            normalizedProfile.loginDomain,
            normalizedProfile.loginEmail,
            legacyPassword,
          );
        }
        // Remove a legacy password from the persisted profile after its
        // one-time migration to the separate Android Keystore-backed record.
        parsed.profile = normalizedProfile;
      }
      const storedCredentials = await secureVaultNative.readLoginCredentialMetadata();
      setCredentialAccounts(storedCredentials);
      parsed.credentialAccounts = storedCredentials;
      if (parsed.documents) {
        const loadedDocuments = await Promise.all(parsed.documents.map(async (document) => {
          let localFileUri = document.localFileUri ?? document.imageUri;
          if (
            secureVaultNative.available &&
            localFileUri &&
            !localFileUri.endsWith('.enc') &&
            !localFileUri.startsWith('data:')
          ) {
            try {
              const encryptedUri = await secureVaultNative.encryptFile(localFileUri);
              if (encryptedUri) {
                await FileSystem.deleteAsync(localFileUri, { idempotent: true });
                localFileUri = encryptedUri;
              }
            } catch {
              // Keep the metadata available for recovery; new writes fail closed.
            }
          }
          const hasStoredFile = Boolean(localFileUri);
          return {
            ...document,
            localFileUri,
            imageUri: localFileUri,
            extractedFields: normalizeExtractedFields(document.extractedFields),
            status: hasStoredFile ? 'Verified' as const : 'Not added' as const,
            identifier: hasStoredFile ? document.identifier : 'Ready when you are',
          };
        }));
        documentsRef.current = loadedDocuments;
        setDocuments(loadedDocuments);
        parsed.documents = toPersistedDocuments(loadedDocuments);
      }
      if (parsed.auditItems) setAuditItems(parsed.auditItems);
      if (typeof parsed.biometricEnabled === 'boolean') setBiometricEnabled(parsed.biometricEnabled);
      if (typeof parsed.smartFillEnabled === 'boolean') setSmartFillEnabled(parsed.smartFillEnabled);
      persistedStateRef.current = parsed;
      await writePersistedVaultState(persistedStateRef.current);
    }).catch(() => {
      // The UI can still render starter state while local storage recovers.
    }).finally(() => setReady(true));
  }, []);

  const persist = async (next: Partial<PersistedVaultState>) => {
    const merged = { ...persistedStateRef.current, ...next };
    persistedStateRef.current = merged;
    const write = persistQueueRef.current.then(() => writePersistedVaultState(merged));
    persistQueueRef.current = write.catch(() => undefined);
    await write;
  };

  const completeOnboarding = async () => {
    setHasOnboarded(true);
    await persist({ hasOnboarded: true });
  };

  const saveProfile = async (nextProfile: VaultProfile, loginPassword?: string) => {
    const normalizedDomain = nextProfile.loginDomain.trim().toLowerCase();
    const normalizedUsername = nextProfile.loginEmail.trim().toLowerCase();
    if (loginPassword) {
      if (!secureVaultNative.credentialStorageAvailable) {
        throw new Error('Secure credential storage is unavailable in this build.');
      }
      if (!normalizedDomain || !normalizedUsername) {
        throw new Error('A website and login email are required to save a credential.');
      }
      const saved = await secureVaultNative.saveLoginCredential(normalizedDomain, normalizedUsername, loginPassword);
      if (!saved) throw new Error('The login credential could not be saved securely.');
    }
    const nextCredentials = await secureVaultNative.readLoginCredentialMetadata();
    const savedProfile = {
      ...nextProfile,
      loginDomain: normalizedDomain,
      loginEmail: normalizedUsername,
      updatedAt: new Date().toISOString(),
    };
    setProfile(savedProfile);
    setCredentialAccounts(nextCredentials);
    await persist({ profile: savedProfile, credentialAccounts: nextCredentials });
  };

  const getLoginCredentials = async () => {
    const next = await secureVaultNative.readLoginCredentialMetadata();
    setCredentialAccounts(next);
    return next;
  };

  const authorizeCredentialFill = async (account: VaultCredentialAccount) => {
    return secureVaultNative.authorizeCredentialFill(account.domain, account.username);
  };

  const addDocument = async (document: VaultDocument) => {
    const previousDocument = documents.find((item) => item.id === document.id);
    const localFileUri = await saveDocumentFileLocally(document);
    if (previousDocument?.localFileUri && previousDocument.localFileUri !== localFileUri) {
      await deleteDocumentFileLocally(previousDocument);
    }
    const isImageDocument = document.contentType?.toLowerCase().startsWith('image/') ?? false;
    let extractedFields = document.extractedFields;
    let analysisStatus = document.analysisStatus;
    let analyzedAt = document.analyzedAt;
    if (localFileUri && isImageDocument && !extractedFields?.length && smartFillNative.hasNativeBridge) {
      try {
        const extracted = await smartFillNative.analyzeDocument(localFileUri, document.label);
        extractedFields = normalizeExtractedFields(extracted);
        analysisStatus = extracted.length > 0 ? 'analyzed' : 'failed';
        analyzedAt = new Date().toISOString();
      } catch {
        extractedFields = [];
        analysisStatus = 'failed';
        analyzedAt = new Date().toISOString();
      }
    }
    const savedDocument: VaultDocument = {
      ...document,
      status: localFileUri && (!isImageDocument || analysisStatus === 'analyzed') ? 'Verified' : 'Processing',
      identifier: localFileUri && (!isImageDocument || analysisStatus === 'analyzed') ? document.identifier : 'Review pending',
      imageUri: localFileUri ?? document.imageUri,
      localFileUri,
      imageData: undefined,
         extractedFields: normalizeExtractedFields(extractedFields),
      analysisStatus,
      analyzedAt,
    };
    const next = documents.map((item) => item.id === savedDocument.id ? savedDocument : item);
    if (!documents.some((item) => item.id === savedDocument.id)) next.push(savedDocument);
    const extractedProfile = mergeExtractedFieldsIntoProfile(profile, savedDocument.extractedFields ?? []);
    documentsRef.current = next;
    setDocuments(next);
    if (extractedProfile && extractedProfile !== profile) setProfile(extractedProfile);
    await persist({
      documents: toPersistedDocuments(next),
      ...(extractedProfile && extractedProfile !== profile ? { profile: extractedProfile } : {}),
    });

  };

  const updateDocumentAnalysis = async (
    id: string,
    extractedFields: ExtractedDocumentField[],
    status: VaultDocument['analysisStatus'] = 'analyzed',
  ) => {
    const normalizedFields = normalizeExtractedFields(extractedFields) ?? [];
    const next = documentsRef.current.map((item) => item.id === id
      ? {
        ...item,
        extractedFields: normalizedFields,
        analysisStatus: status,
        analyzedAt: new Date().toISOString(),
        ...(status === 'analyzed' ? {
          status: 'Verified' as const,
          identifier: item.identifier === 'Review pending' ? 'JSON ready' : item.identifier,
        } : {}),
      }
      : item);
    documentsRef.current = next;
    setDocuments(next);
    const extractedProfile = mergeExtractedFieldsIntoProfile(profile, normalizedFields);
    if (extractedProfile && extractedProfile !== profile) setProfile(extractedProfile);
    await persist({
      documents: toPersistedDocuments(next),
      ...(extractedProfile && extractedProfile !== profile ? { profile: extractedProfile } : {}),
    });
  };

  const deleteDocument = async (id: string) => {
    const document = documents.find((item) => item.id === id);
    await deleteDocumentFileLocally(document);
    const next = documents.map((item) => item.id === id ? {
      ...item,
      status: 'Not added' as const,
      identifier: 'Ready when you are',
      imageUri: undefined,
      localFileUri: undefined,
      imageData: undefined,
      extractedFields: undefined,
      analysisStatus: 'not-analyzed' as const,
      analyzedAt: undefined,
    } : item);
    documentsRef.current = next;
    setDocuments(next);
    await persist({ documents: toPersistedDocuments(next) });
    await addAudit('Document removed', 'The document was deleted from your vault', 'trash-outline');
  };

  const toggleBiometric = async () => {
    const next = !biometricEnabled;
    setBiometricEnabled(next);
    await persist({ biometricEnabled: next });
  };

  const toggleSmartFill = async () => {
    const next = !smartFillEnabled;
    setSmartFillEnabled(next);
    await persist({ smartFillEnabled: next });
    if (!next) {
      await smartFillNative.stop();
    }
  };

  const addAudit = async (title: string, detail: string, icon: string) => {
    const next = [{ id: Date.now().toString(), title, detail, time: 'Just now', icon }, ...auditItems].slice(0, 8);
    setAuditItems(next);
    await persist({ auditItems: next });
  };

  const resetVault = async () => {
    await Promise.all(documents.map((document) => deleteDocumentFileLocally(document)));
    setHasOnboarded(false);
    setProfile(null);
    documentsRef.current = starterDocuments;
    setDocuments(starterDocuments);
    setAuditItems(starterAudit);
    setBiometricEnabled(true);
    setSmartFillEnabled(true);
    setCredentialAccounts([]);
    await AsyncStorage.removeItem(STORAGE_KEY);
    await secureVaultNative.clearLoginCredentials();
  };

  const value = useMemo(() => ({
    ready,
    hasOnboarded,
    documents,
    profile,
    auditItems,
    biometricEnabled,
    smartFillEnabled,
    credentialAccounts,
    completeOnboarding,
    saveProfile,
    getLoginCredentials,
    authorizeCredentialFill,
    addDocument,
    updateDocumentAnalysis,
    deleteDocument,
    toggleBiometric,
    toggleSmartFill,
    addAudit,
    resetVault,
  }), [ready, hasOnboarded, documents, profile, auditItems, biometricEnabled, smartFillEnabled, credentialAccounts]);

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault() {
  const value = useContext(VaultContext);
  if (!value) throw new Error('useVault must be used inside VaultProvider');
  return value;
}