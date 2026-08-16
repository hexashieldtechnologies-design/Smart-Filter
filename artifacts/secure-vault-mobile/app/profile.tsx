import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { GlassCard, PrimaryButton, SecurityBadge } from '@/components/VaultUI';
import { useColors } from '@/hooks/useColors';
import {
  createEmptyVaultProfile,
  useVault,
  type AddressDetails,
  type VaultProfile,
} from '@/context/VaultContext';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, saveProfile, addAudit } = useVault();
  const [form, setForm] = useState<VaultProfile>(() => profile ?? createEmptyVaultProfile());
  // The password is deliberately kept out of VaultProfile and is only held
  // long enough to hand it to the native encrypted credential store.
  const [loginPassword, setLoginPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const update = <K extends keyof VaultProfile>(key: K, value: VaultProfile[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const updateAddress = (kind: 'permanentAddress' | 'currentAddress', key: keyof AddressDetails, value: string) => {
    setForm((current) => ({
      ...current,
      [kind]: {
        ...current[kind],
        [key]: value,
      },
    }));
  };

  const save = async () => {
    const mobileDigits = digitsOnly(form.mobile);
    const alternateMobileDigits = digitsOnly(form.alternateMobile);
    const pinCode = digitsOnly(form.permanentAddress.pinCode);
    const currentPinCode = digitsOnly(form.currentAddress.pinCode);
    const aadhaarDigits = digitsOnly(form.aadhaarNumber);
    const panNumber = form.panNumber.trim().toUpperCase();
    const currentAddress = form.sameAsPermanent ? { ...form.permanentAddress } : { ...form.currentAddress };

    if (form.fullName.trim().length < 2) {
      Alert.alert('Add your name', 'Enter your full name before saving the profile.');
      return;
    }
    if (mobileDigits && (mobileDigits.length < 10 || mobileDigits.length > 15)) {
      Alert.alert('Check mobile number', 'Enter a valid mobile number with 10 to 15 digits.');
      return;
    }
    if (alternateMobileDigits && (alternateMobileDigits.length < 10 || alternateMobileDigits.length > 15)) {
      Alert.alert('Check alternate mobile', 'Enter a valid alternate mobile number with 10 to 15 digits.');
      return;
    }
    if (form.email.trim() && !emailPattern.test(form.email.trim())) {
      Alert.alert('Check email address', 'Enter a valid email address or leave it blank.');
      return;
    }
    if (form.alternateEmail.trim() && !emailPattern.test(form.alternateEmail.trim())) {
      Alert.alert('Check alternate email', 'Enter a valid alternate email address or leave it blank.');
      return;
    }
    if (form.loginEmail.trim() && !emailPattern.test(form.loginEmail.trim())) {
      Alert.alert('Check login email', 'Enter a valid login email address or leave it blank.');
      return;
    }
    if (pinCode && pinCode.length !== 6) {
      Alert.alert('Check PIN code', 'PIN code must contain 6 digits.');
      return;
    }
    if (currentPinCode && currentPinCode.length !== 6) {
      Alert.alert('Check current PIN code', 'PIN code must contain 6 digits.');
      return;
    }
    if (aadhaarDigits && aadhaarDigits.length !== 12) {
      Alert.alert('Check Aadhaar number', 'Aadhaar number must contain 12 digits.');
      return;
    }
    if (panNumber && !panPattern.test(panNumber)) {
      Alert.alert('Check PAN number', 'Enter PAN in the format ABCDE1234F.');
      return;
    }

    setSaving(true);
    try {
      await saveProfile({
        ...form,
        mobile: form.mobile.trim(),
        alternateMobile: form.alternateMobile.trim(),
        email: form.email.trim().toLowerCase(),
        alternateEmail: form.alternateEmail.trim().toLowerCase(),
        loginEmail: form.loginEmail.trim().toLowerCase(),
        loginDomain: normalizeDomain(form.loginDomain),
        aadhaarNumber: aadhaarDigits,
        panNumber,
        permanentAddress: { ...form.permanentAddress, pinCode },
        currentAddress: { ...currentAddress, pinCode: currentPinCode || pinCode },
      }, loginPassword);
      await addAudit('Profile saved securely', 'Personal, contact and address details were updated locally', 'person-outline');
      Alert.alert('Profile saved locally', 'Your details are encrypted with the secure vault on this device.', [
        { text: 'Done', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Could not save profile', 'Your profile could not be encrypted and saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable testID="button-back-profile" onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>SECURE VAULT</Text>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Complete profile</Text>
        </View>
        <SecurityBadge label="Encrypted" />
      </View>

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 38 }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          Keep your personal, contact, address, and identity details together. Everything is saved locally inside your encrypted vault.
        </Text>

        <ProfileSection icon="person-outline" title="Personal information" detail="Add the names and identity details you use on official forms.">
          <Field label="Full name" value={form.fullName} onChangeText={(value) => update('fullName', value)} placeholder="Your full name" required autoCapitalize="words" />
          <View style={styles.twoColumn}>
            <View style={styles.column}><Field label="First name" value={form.firstName} onChangeText={(value) => update('firstName', value)} placeholder="First name" autoCapitalize="words" /></View>
            <View style={styles.column}><Field label="Middle name" value={form.middleName} onChangeText={(value) => update('middleName', value)} placeholder="Optional" autoCapitalize="words" /></View>
          </View>
          <Field label="Last name" value={form.lastName} onChangeText={(value) => update('lastName', value)} placeholder="Last name" autoCapitalize="words" />
          <Field label="Date of birth" value={form.dateOfBirth} onChangeText={(value) => update('dateOfBirth', value)} placeholder="DD / MM / YYYY" keyboardType="numbers-and-punctuation" />
          <ChoiceRow label="Gender" value={form.gender} options={['Female', 'Male', 'Other', 'Prefer not to say']} onChange={(value) => update('gender', value)} />
          <Field label="Nationality" value={form.nationality} onChangeText={(value) => update('nationality', value)} placeholder="Indian" autoCapitalize="words" />
          <ChoiceRow label="Marital status" value={form.maritalStatus} options={['Single', 'Married', 'Other', 'Prefer not to say']} onChange={(value) => update('maritalStatus', value)} />
          <Field label="Father's name" value={form.fatherName} onChangeText={(value) => update('fatherName', value)} placeholder="Father's full name" autoCapitalize="words" />
          <Field label="Mother's name" value={form.motherName} onChangeText={(value) => update('motherName', value)} placeholder="Mother's full name" autoCapitalize="words" />
          <Field label="Spouse name (optional)" value={form.spouseName} onChangeText={(value) => update('spouseName', value)} placeholder="Spouse's full name" autoCapitalize="words" />
        </ProfileSection>

        <ProfileSection icon="call-outline" title="Contact details" detail="Use the numbers and email addresses you want available for approved forms.">
          <Field label="Mobile number" value={form.mobile} onChangeText={(value) => update('mobile', value)} placeholder="+91 98765 43210" keyboardType="phone-pad" />
          <Field label="Alternate mobile number" value={form.alternateMobile} onChangeText={(value) => update('alternateMobile', value)} placeholder="Optional alternate number" keyboardType="phone-pad" />
          <Field label="Email address" value={form.email} onChangeText={(value) => update('email', value)} placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="Alternate email address" value={form.alternateEmail} onChangeText={(value) => update('alternateEmail', value)} placeholder="Optional alternate email" keyboardType="email-address" autoCapitalize="none" />
           <Field label="LinkedIn profile URL" value={form.linkedinUrl} onChangeText={(value) => update('linkedinUrl', value.trim())} placeholder="https://linkedin.com/in/your-name" keyboardType="url" autoCapitalize="none" />
        </ProfileSection>

        <ProfileSection icon="key-outline" title="Saved sign-in" detail="Save one login email and password for forms you explicitly approve. These values stay encrypted on this device.">
          <Field label="Website / app" value={form.loginDomain} onChangeText={(value) => update('loginDomain', value)} placeholder="example.com" autoCapitalize="none" autoCorrect={false} />
          <Field label="Login email" value={form.loginEmail} onChangeText={(value) => update('loginEmail', value)} placeholder="your-login@gmail.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
          <Field label="Login password" value={loginPassword} onChangeText={setLoginPassword} placeholder="Leave blank to keep the saved password" secureTextEntry autoCapitalize="none" autoCorrect={false} />
        </ProfileSection>

        <ProfileSection icon="location-outline" title="Permanent address" detail="Save the full address including district, state, country, and PIN code.">
          <AddressFields address={form.permanentAddress} onChange={(key, value) => updateAddress('permanentAddress', key, value)} />
        </ProfileSection>

        <ProfileSection icon="navigate-outline" title="Current address" detail="Use the permanent address when both addresses are the same.">
          <Pressable
            testID="toggle-same-address"
            onPress={() => update('sameAsPermanent', !form.sameAsPermanent)}
            style={styles.checkRow}
          >
            <View style={[styles.checkbox, { borderColor: form.sameAsPermanent ? colors.primary : colors.border, backgroundColor: form.sameAsPermanent ? colors.primary : colors.card }]}>
              {form.sameAsPermanent ? <Ionicons name="checkmark" size={15} color={colors.primaryForeground} /> : null}
            </View>
            <Text style={[styles.checkText, { color: colors.foreground }]}>Same as permanent address</Text>
          </Pressable>
          {!form.sameAsPermanent ? <AddressFields address={form.currentAddress} onChange={(key, value) => updateAddress('currentAddress', key, value)} /> : <Text style={[styles.sameAddressNote, { color: colors.mutedForeground }]}>Your current address will be saved as a copy of the permanent address.</Text>}
        </ProfileSection>

        <ProfileSection icon="card-outline" title="Identity details" detail="Sensitive identifiers are encrypted and masked outside this edit screen.">
          <Field label="Aadhaar number" value={form.aadhaarNumber} onChangeText={(value) => update('aadhaarNumber', value.replace(/\D/g, '').slice(0, 12))} placeholder="12-digit Aadhaar number" keyboardType="number-pad" maxLength={12} secureTextEntry />
          <Field label="PAN number" value={form.panNumber} onChangeText={(value) => update('panNumber', value.toUpperCase().slice(0, 10))} placeholder="ABCDE1234F" autoCapitalize="characters" maxLength={10} />
          <Field label="Driving licence number" value={form.drivingLicenceNumber} onChangeText={(value) => update('drivingLicenceNumber', value.toUpperCase())} placeholder="Driving licence number" autoCapitalize="characters" />
          <Field label="Passport number" value={form.passportNumber} onChangeText={(value) => update('passportNumber', value.toUpperCase())} placeholder="Optional passport number" autoCapitalize="characters" />
        </ProfileSection>

        <ProfileSection icon="briefcase-outline" title="Education and work (optional)" detail="Add these only when a form needs them.">
          <Field label="Highest qualification" value={form.qualification} onChangeText={(value) => update('qualification', value)} placeholder="e.g. Bachelor's degree" autoCapitalize="words" />
          <Field label="Institution" value={form.institution} onChangeText={(value) => update('institution', value)} placeholder="School, college, or university" autoCapitalize="words" />
          <Field label="Course" value={form.course} onChangeText={(value) => update('course', value)} placeholder="Course or specialization" autoCapitalize="words" />
          <Field label="Year of passing" value={form.yearOfPassing} onChangeText={(value) => update('yearOfPassing', value.replace(/\D/g, '').slice(0, 4))} placeholder="YYYY" keyboardType="number-pad" maxLength={4} />
          <Field label="Occupation" value={form.occupation} onChangeText={(value) => update('occupation', value)} placeholder="Your occupation" autoCapitalize="words" />
          <Field label="Organization" value={form.organization} onChangeText={(value) => update('organization', value)} placeholder="Company or organization" autoCapitalize="words" />
          <Field label="Designation" value={form.designation} onChangeText={(value) => update('designation', value)} placeholder="Your designation" autoCapitalize="words" />
        </ProfileSection>

        <View style={[styles.saveNote, { backgroundColor: colors.accent }]}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
          <Text style={[styles.saveNoteText, { color: colors.mutedForeground }]}>Save stores this profile in the same encrypted local vault as your documents. It is not sent to the server.</Text>
        </View>
        <PrimaryButton label={saving ? 'Saving securely…' : 'Save profile locally'} onPress={save} disabled={saving} icon="shield-checkmark-outline" />
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function AddressFields({ address, onChange }: { address: AddressDetails; onChange: (key: keyof AddressDetails, value: string) => void }) {
  return (
    <>
      <Field label="House / flat number" value={address.houseFlat} onChangeText={(value) => onChange('houseFlat', value)} placeholder="Flat, house, or plot number" />
      <Field label="Building / street" value={address.buildingStreet} onChangeText={(value) => onChange('buildingStreet', value)} placeholder="Building name and street" />
      <Field label="Area / locality" value={address.areaLocality} onChangeText={(value) => onChange('areaLocality', value)} placeholder="Area or locality" />
      <View style={styles.twoColumn}>
        <View style={styles.column}><Field label="Village / town / city" value={address.city} onChangeText={(value) => onChange('city', value)} placeholder="City" autoCapitalize="words" /></View>
        <View style={styles.column}><Field label="District" value={address.district} onChangeText={(value) => onChange('district', value)} placeholder="District" autoCapitalize="words" /></View>
      </View>
      <View style={styles.twoColumn}>
        <View style={styles.column}><Field label="State" value={address.state} onChangeText={(value) => onChange('state', value)} placeholder="State" autoCapitalize="words" /></View>
        <View style={styles.column}><Field label="PIN code" value={address.pinCode} onChangeText={(value) => onChange('pinCode', value.replace(/\D/g, '').slice(0, 6))} placeholder="6 digits" keyboardType="number-pad" maxLength={6} /></View>
      </View>
      <Field label="Country" value={address.country} onChangeText={(value) => onChange('country', value)} placeholder="India" autoCapitalize="words" />
    </>
  );
}

function ProfileSection({ icon, title, detail, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string; children: React.ReactNode }) {
  const colors = useColors();
  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionIcon, { backgroundColor: colors.accent }]}><Ionicons name={icon} size={19} color={colors.primary} /></View>
        <View style={{ flex: 1 }}><Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.sectionDetail, { color: colors.mutedForeground }]}>{detail}</Text></View>
      </View>
      <View style={styles.sectionFields}>{children}</View>
    </View>
  );
}

function ChoiceRow({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const colors = useColors();
  return (
    <View style={styles.choiceGroup}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <View style={styles.choiceWrap}>
        {options.map((option) => (
          <Pressable key={option} onPress={() => onChange(option)} style={[styles.choice, { borderColor: value === option ? colors.primary : colors.border, backgroundColor: value === option ? colors.accent : colors.card }]}>
            <Text style={[styles.choiceText, { color: value === option ? colors.accentForeground : colors.mutedForeground }]}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Field({ label, value, onChangeText, placeholder, required, ...props }: TextInputProps & { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; required?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}{required ? <Text style={{ color: colors.destructive }}> *</Text> : null}</Text>
      <TextInput
        {...props}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.background }]}
      />
    </View>
  );
}

function digitsOnly(value: string) {
  return value.replace(/\D/g, '');
}

function normalizeDomain(value: string) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return '';
  const withScheme = trimmed.includes('://') ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withScheme).hostname.replace(/^www\./, '');
  } catch {
    return trimmed.replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 62, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconButton: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitleWrap: { flex: 1 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.4, marginBottom: 3 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  intro: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginBottom: 18 },
  section: { borderWidth: 1, borderRadius: 24, padding: 16, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 16 },
  sectionIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  sectionDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 3 },
  sectionFields: { gap: 13 },
  field: { gap: 7 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 15, paddingHorizontal: 14, fontFamily: 'Inter_400Regular', fontSize: 14 },
  twoColumn: { flexDirection: 'row', gap: 10 },
  column: { flex: 1, minWidth: 0 },
  choiceGroup: { gap: 8 },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choice: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 11, paddingVertical: 9 },
  choiceText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  checkbox: { width: 23, height: 23, borderRadius: 7, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  checkText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  sameAddressNote: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  saveNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 17, padding: 14, marginBottom: 14 },
  saveNoteText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
});