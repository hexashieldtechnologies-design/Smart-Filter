import type { CanonicalFieldKey } from './types';

const aliases: Record<CanonicalFieldKey, string[]> = {
  fullName: ['name', 'full name', 'fullname', 'applicant name', 'customer name', 'candidate name', 'legal name', 'given name and surname'],
  firstName: ['first name', 'firstname', 'given name', 'fname'],
  middleName: ['middle name', 'middlename', 'mname'],
  lastName: ['last name', 'lastname', 'surname', 'family name', 'lname'],
  fatherName: ['father name', "father's name", 'fathers name'],
  motherName: ['mother name', "mother's name", 'mothers name'],
  spouseName: ['spouse name', 'husband name', 'wife name'],
  phone: ['phone', 'phone number', 'mobile', 'mobile number', 'contact number', 'telephone', 'tel'],
  alternatePhone: ['alternate phone', 'alternate mobile', 'secondary phone'],
  email: ['email', 'email address', 'e-mail', 'mail id'],
  alternateEmail: ['alternate email', 'secondary email'],
  dateOfBirth: ['dob', 'date of birth', 'birth date', 'birthdate', 'born on'],
  gender: ['gender', 'sex'],
  nationality: ['nationality', 'citizenship'],
  maritalStatus: ['marital status', 'marriage status'],
  aadhaar: ['aadhaar', 'aadhar', 'aadhaar number', 'aadhar number', 'uid', 'uid number', 'uidai', 'uidai number', 'unique identification number'],
  pan: ['pan', 'pan card', 'pan number', 'permanent account number', 'tax identification number'],
  passportNumber: ['passport', 'passport number', 'passport no', 'travel document number'],
  drivingLicenceNumber: ['driving licence', 'driving license', 'driving licence number', 'driving license number', 'dl number'],
  address: ['address', 'full address', 'residential address', 'permanent address', 'current address', 'street address', 'address line 1', 'address line 2'],
  houseFlat: ['house', 'flat', 'house number', 'flat number', 'house flat'],
  buildingStreet: ['building', 'street', 'building street', 'street address'],
  areaLocality: ['area', 'locality', 'area locality', 'neighborhood', 'neighbourhood'],
  city: ['city', 'town'],
  district: ['district'],
  state: ['state', 'province'],
  country: ['country', 'nation'],
  pincode: ['pin', 'pincode', 'pin code', 'postal code', 'zip', 'zip code'],
  linkedinUrl: ['linkedin', 'linkedin url', 'linkedin profile'],
  qualification: ['qualification', 'degree', 'education'],
  institution: ['institution', 'college', 'university', 'school'],
  course: ['course', 'program', 'programme'],
  yearOfPassing: ['year of passing', 'graduation year', 'passing year'],
  occupation: ['occupation', 'job title', 'profession'],
  organization: ['company', 'organization', 'organisation', 'employer'],
  designation: ['designation', 'role', 'position'],
  resume: ['resume', 'cv', 'curriculum vitae'],
  profilePhoto: ['profile photo', 'profile picture', 'photo', 'avatar'],
};

const aliasEntries = Object.entries(aliases) as Array<[CanonicalFieldKey, string[]]>;

export function aliasesFor(key: CanonicalFieldKey): string[] {
  return aliases[key] ?? [];
}

export function findCanonicalField(label: string): CanonicalFieldKey | undefined {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return undefined;

  for (const [key, values] of aliasEntries) {
    if (values.some((value) => normalized === value || normalized.includes(value))) {
      return key;
    }
  }

  return undefined;
}