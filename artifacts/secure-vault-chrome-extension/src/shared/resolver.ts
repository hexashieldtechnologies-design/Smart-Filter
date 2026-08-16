import { normalizeForField } from './normalize';
import type {
  CanonicalFieldKey,
  FieldSource,
  VaultDocument,
  VaultProfile,
} from './types';

const profileKeyMap: Partial<Record<CanonicalFieldKey, keyof VaultProfile>> = {
  fullName: 'fullName',
  firstName: 'firstName',
  middleName: 'middleName',
  lastName: 'lastName',
  fatherName: 'fatherName',
  motherName: 'motherName',
  spouseName: 'spouseName',
  phone: 'mobile',
  alternatePhone: 'alternateMobile',
  email: 'email',
  alternateEmail: 'alternateEmail',
  dateOfBirth: 'dateOfBirth',
  gender: 'gender',
  nationality: 'nationality',
  maritalStatus: 'maritalStatus',
  drivingLicenceNumber: 'drivingLicenceNumber',
  passportNumber: 'passportNumber',
  linkedinUrl: 'linkedinUrl',
  qualification: 'qualification',
  institution: 'institution',
  course: 'course',
  yearOfPassing: 'yearOfPassing',
  occupation: 'occupation',
  organization: 'organization',
  designation: 'designation',
};

const sensitiveKeys = new Set<CanonicalFieldKey>([
  'aadhaar',
  'pan',
  'dateOfBirth',
  'address',
  'houseFlat',
  'buildingStreet',
  'areaLocality',
  'city',
  'district',
  'state',
  'pincode',
]);

export function isSensitiveField(key: CanonicalFieldKey): boolean {
  return sensitiveKeys.has(key);
}

export function documentTypeForField(key: CanonicalFieldKey): string | undefined {
  if (key === 'aadhaar') return 'aadhaar';
  if (key === 'pan') return 'pan';
  if (key === 'passportNumber') return 'passport';
  if (key === 'drivingLicenceNumber') return 'driving_licence';
  if (key === 'resume' || key === 'qualification' || key === 'institution' || key === 'course' || key === 'yearOfPassing') return 'resume';
  return undefined;
}

function profileValue(profile: VaultProfile, key: CanonicalFieldKey): string | undefined {
  if (key === 'address') {
    const address = profile.currentAddress ?? profile.permanentAddress;
    return address
      ? [address.houseFlat, address.buildingStreet, address.areaLocality, address.city, address.state, address.pinCode]
          .filter(Boolean)
          .join(', ')
      : undefined;
  }

  if (key === 'houseFlat' || key === 'buildingStreet' || key === 'areaLocality' || key === 'city' || key === 'district' || key === 'state' || key === 'country' || key === 'pincode') {
    const address = profile.currentAddress ?? profile.permanentAddress;
    if (!address) return undefined;
    const addressKey = key === 'pincode' ? 'pinCode' : key;
    return address[addressKey as keyof typeof address] as string | undefined;
  }

  if (key === 'aadhaar') return profile.aadhaarNumber;
  if (key === 'pan') return profile.panNumber;

  const mapped = profileKeyMap[key];
  const value = mapped ? profile[mapped] : undefined;
  return typeof value === 'string' ? value : undefined;
}

function documentValue(
  document: VaultDocument,
  key: CanonicalFieldKey,
): string | undefined {
  if (document.status !== 'verified_local') return undefined;
  const exact = document.extractedFields.find(
    (field) => field.key.toLowerCase() === key.toLowerCase() && field.confirmed !== false,
  );
  return exact?.value;
}

export function resolveLocalSource(input: {
  key: CanonicalFieldKey;
  profile: VaultProfile;
  documents: VaultDocument[];
  allowProfileSensitiveFallback?: boolean;
}): { source: FieldSource; value?: string } {
  const requiredDocumentType = documentTypeForField(input.key);
  const selectedDocument = requiredDocumentType
    ? input.documents.find((document) => document.type.toLowerCase() === requiredDocumentType)
    : undefined;

  if (requiredDocumentType) {
    const value = selectedDocument ? documentValue(selectedDocument, input.key) : undefined;
    if (value) {
      return {
        source: { kind: 'document', documentId: selectedDocument!.id, key: input.key },
        value: normalizeForField(input.key, value),
      };
    }

    if (!isSensitiveField(input.key) || input.allowProfileSensitiveFallback) {
      const fallback = profileValue(input.profile, input.key);
      if (fallback) {
        return {
          source: { kind: 'profile', key: input.key },
          value: normalizeForField(input.key, fallback),
        };
      }
    }

    return { source: { kind: 'none' } };
  }

  const value = profileValue(input.profile, input.key);
  if (value) {
    return {
      source: { kind: 'profile', key: input.key },
      value: normalizeForField(input.key, value),
    };
  }

  for (const document of input.documents) {
    const documentField = documentValue(document, input.key);
    if (documentField) {
      return {
        source: { kind: 'document', documentId: document.id, key: input.key },
        value: normalizeForField(input.key, documentField),
      };
    }
  }

  return { source: { kind: 'none' } };
}