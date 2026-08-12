import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard, PrimaryButton, StatusPill } from '@/components/VaultUI';
import { useColors } from '@/hooks/useColors';
import { useVault } from '@/context/VaultContext';

const steps = ['Account', 'Profile', 'Documents', 'Verify', 'Complete'];

export default function SignupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addDocument, completeOnboarding } = useVault();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [uploaded, setUploaded] = useState(false);

  const next = async () => {
    if (step === 0 && (!email.includes('@') || password.length < 8)) {
      Alert.alert('Check your details', 'Enter a valid email and an 8-character password to continue.');
      return;
    }
    if (step === 1 && name.trim().length < 2) {
      Alert.alert('Add your name', 'Your name helps Smart Fill match the right fields.');
      return;
    }
    await Haptics.selectionAsync();
    if (step < 4) setStep(step + 1);
    else {
      await completeOnboarding();
      router.replace('/(tabs)');
    }
  };

  const uploadIdentity = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!result.canceled) {
      setUploaded(true);
      await addDocument({ id: 'aadhaar', type: 'Identity', label: 'Aadhaar Card', status: 'Processing', identifier: 'Review pending', updated: 'Just now', icon: 'card-outline', color: 'aqua', imageUri: result.assets[0]?.uri });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => step === 0 ? router.back() : setStep(step - 1)} style={styles.iconButton}><Ionicons name="arrow-back" size={22} color={colors.foreground} /></Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Create your vault</Text>
        <Text style={[styles.counter, { color: colors.mutedForeground }]}>{step + 1}/5</Text>
      </View>
      <View style={styles.progressRow}>
        {steps.map((item, index) => <View key={item} style={styles.progressItem}><View style={[styles.progressBar, { backgroundColor: index <= step ? colors.primary : colors.secondary }]} /><Text style={[styles.progressLabel, { color: index === step ? colors.foreground : colors.mutedForeground }]}>{item}</Text></View>)}
      </View>
      <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} bottomOffset={24} keyboardShouldPersistTaps="handled">
        {step === 0 ? <StepIntro title="Start with a secure account" detail="Your vault is private from day one. We never store your password in plain text." icon="key-outline">
          <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
          <Field label="Create password" value={password} onChangeText={setPassword} placeholder="8+ characters" secureTextEntry />
          <Text style={[styles.helper, { color: colors.mutedForeground }]}><Ionicons name="lock-closed-outline" size={13} color={colors.primary} /> Use a unique password you do not reuse elsewhere.</Text>
        </StepIntro> : null}
        {step === 1 ? <StepIntro title="A little about you" detail="Only the details needed to make your vault useful and your Smart Fill matches accurate." icon="person-outline">
          <Field label="Full name" value={name} onChangeText={setName} placeholder="Anam Jasiya" />
          <Field label="Phone number" value={phone} onChangeText={setPhone} placeholder="+91 98765 43210" keyboardType="phone-pad" />
          <Field label="City" value="" onChangeText={() => undefined} placeholder="Mumbai" />
        </StepIntro> : null}
        {step === 2 ? <StepIntro title="Add your first document" detail="Upload a clear image. Secure Vault will process it and ask you to review every extracted field." icon="document-text-outline">
          <Pressable onPress={uploadIdentity} style={({ pressed }) => [styles.uploadBox, { borderColor: colors.primary, backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}>
            <View style={[styles.uploadIcon, { backgroundColor: colors.primary }]}><Ionicons name={uploaded ? 'checkmark' : 'cloud-upload-outline'} size={24} color={colors.primaryForeground} /></View>
            <View style={{ flex: 1 }}><Text style={[styles.uploadTitle, { color: colors.foreground }]}>{uploaded ? 'Aadhaar added' : 'Upload Aadhaar Card'}</Text><Text style={[styles.uploadDetail, { color: colors.mutedForeground }]}>{uploaded ? 'Processing securely…' : 'Choose from photos or files'}</Text></View>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </Pressable>
          <DocumentTip icon="camera-outline" text="Camera capture is requested only when you choose to scan." />
          <DocumentTip icon="eye-off-outline" text="Your full number stays masked in the normal app." />
        </StepIntro> : null}
        {step === 3 ? <StepIntro title="Verify your contact details" detail="We use one-time codes to make sure you control this account. Codes are never stored permanently." icon="checkmark-circle-outline">
          <GlassCard><VerificationRow label="Phone number" value={phone || '+91 XXXXXXX210'} verified /><VerificationRow label="Email address" value={email || 'you@example.com'} verified /></GlassCard>
          <Text style={[styles.helper, { color: colors.mutedForeground }]}>Both checks are ready for the demo flow. In production, verification is completed server-side.</Text>
        </StepIntro> : null}
        {step === 4 ? <StepIntro title="Your vault is ready" detail="You are in control. Review before filling, unlock before revealing, and submit forms yourself." icon="sparkles-outline">
          {['Account created', 'Profile completed', 'Contact verified', 'Vault protected'].map((item) => <View key={item} style={styles.doneRow}><Ionicons name="checkmark-circle" size={22} color={colors.success} /><Text style={[styles.doneText, { color: colors.foreground }]}>{item}</Text></View>)}
        </StepIntro> : null}
        <PrimaryButton label={step === 4 ? 'Enter my vault' : step === 2 && !uploaded ? 'Skip for now' : 'Continue'} onPress={next} icon="arrow-forward" />
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function StepIntro({ title, detail, icon, children }: { title: string; detail: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode }) {
  const colors = useColors();
  return <View style={{ gap: 20 }}><View style={styles.intro}><View style={[styles.stepIcon, { backgroundColor: colors.accent }]}><Ionicons name={icon} size={26} color={colors.primary} /></View><Text style={[styles.title, { color: colors.foreground }]}>{title}</Text><Text style={[styles.detail, { color: colors.mutedForeground }]}>{detail}</Text></View><View style={{ gap: 13 }}>{children}</View></View>;
}

function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; secureTextEntry?: boolean; keyboardType?: 'email-address' | 'phone-pad' }) {
  const colors = useColors();
  return <View style={{ gap: 7 }}><Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.mutedForeground} secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize="none" style={[styles.input, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]} /></View>;
}

function DocumentTip({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const colors = useColors();
  return <View style={styles.tip}><Ionicons name={icon} size={17} color={colors.primary} /><Text style={[styles.tipText, { color: colors.mutedForeground }]}>{text}</Text></View>;
}

function VerificationRow({ label, value, verified }: { label: string; value: string; verified: boolean }) {
  const colors = useColors();
  return <View style={styles.verifyRow}><View><Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.verifyValue, { color: colors.foreground }]}>{value}</Text></View><StatusPill status={verified ? 'Verified' : 'Processing'} /></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { minHeight: 58, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  counter: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  progressRow: { flexDirection: 'row', gap: 5, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 22 },
  progressItem: { flex: 1, gap: 6 },
  progressBar: { height: 4, borderRadius: 4 },
  progressLabel: { fontFamily: 'Inter_500Medium', fontSize: 9 },
  content: { paddingHorizontal: 20, gap: 28 },
  intro: { gap: 10 },
  stepIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 29, lineHeight: 34, letterSpacing: -0.4 },
  detail: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, maxWidth: 340 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  input: { minHeight: 54, borderWidth: 1, borderRadius: 16, paddingHorizontal: 15, fontFamily: 'Inter_400Regular', fontSize: 15 },
  helper: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: -2 },
  uploadBox: { minHeight: 86, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12 },
  uploadIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  uploadDetail: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  tipText: { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1, lineHeight: 17 },
  verifyRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#dbe6e2' },
  verifyValue: { fontFamily: 'Inter_600SemiBold', fontSize: 14, marginTop: 5 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  doneText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
});