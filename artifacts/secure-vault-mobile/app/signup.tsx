import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, FlatList, ImageBackground, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard, PrimaryButton, StatusPill } from '@/components/VaultUI';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useColors } from '@/hooks/useColors';
import { useVault } from '@/context/VaultContext';

const backgroundImage = require('../assets/images/get-started-bg.png');
const profileSetupBackground = require('../assets/images/profile-setup-bg.png');
const countryGlobeArt = require('../assets/images/country-globe-art.png');
const steps = ['Account', 'Profile', 'Documents', 'Verify', 'Ready'];
const countries = [
  { name: 'India', dialCode: '+91', iso: 'IN' },
  { name: 'United States', dialCode: '+1', iso: 'US' },
  { name: 'United Arab Emirates', dialCode: '+971', iso: 'AE' },
  { name: 'United Kingdom', dialCode: '+44', iso: 'GB' },
  { name: 'Singapore', dialCode: '+65', iso: 'SG' },
  { name: 'Canada', dialCode: '+1', iso: 'CA' },
  { name: 'Australia', dialCode: '+61', iso: 'AU' },
  { name: 'Germany', dialCode: '+49', iso: 'DE' },
  { name: 'France', dialCode: '+33', iso: 'FR' },
  { name: 'Italy', dialCode: '+39', iso: 'IT' },
  { name: 'Japan', dialCode: '+81', iso: 'JP' },
  { name: 'Bangladesh', dialCode: '+880', iso: 'BD' },
  { name: 'Nepal', dialCode: '+977', iso: 'NP' },
  { name: 'Saudi Arabia', dialCode: '+966', iso: 'SA' },
  { name: 'South Africa', dialCode: '+27', iso: 'ZA' },
  { name: 'Malaysia', dialCode: '+60', iso: 'MY' },
  { name: 'New Zealand', dialCode: '+64', iso: 'NZ' },
] as const;
type Country = (typeof countries)[number];
const locations = [
  'Mumbai, Maharashtra',
  'Delhi, Delhi',
  'Bengaluru, Karnataka',
  'Hyderabad, Telangana',
  'Chennai, Tamil Nadu',
  'Pune, Maharashtra',
  'Kolkata, West Bengal',
  'Ahmedabad, Gujarat',
  'Jaipur, Rajasthan',
  'New York, United States',
  'London, United Kingdom',
  'Dubai, United Arab Emirates',
  'Singapore',
  'Toronto, Canada',
  'Sydney, Australia',
];

export default function SignupScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { addDocument, completeOnboarding } = useVault();
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [password, setPassword] = useState('');
  const [uploaded, setUploaded] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]);
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationSearch, setLocationSearch] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [phoneError, setPhoneError] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailVerified, setEmailVerified] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);
  const [resendSeconds, setResendSeconds] = useState(0);
  const otpEntrance = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (step !== 3) return;
    otpEntrance.setValue(0);
    Animated.spring(otpEntrance, {
      toValue: 1,
      friction: 8,
      tension: 52,
      useNativeDriver: true,
    }).start();
    setResendSeconds(30);
    const timer = setInterval(() => {
      setResendSeconds((current) => current > 0 ? current - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [otpEntrance, step]);

  const sendDemoCodes = () => {
    setEmailSent(true);
    setPhoneSent(true);
    setResendSeconds(30);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const verifyDemoCode = (channel: 'email' | 'phone') => {
    const value = channel === 'email' ? emailOtp : phoneOtp;
    if (!/^\d{4}$/.test(value)) {
      Alert.alert('Enter a 4-digit code', 'For this testing preview, enter any four digits to verify.');
      return;
    }
    if (channel === 'email') setEmailVerified(true);
    else setPhoneVerified(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const next = async () => {
    if (step === 0 && (!email.includes('@') || password.length < 8)) {
      Alert.alert('Check your details', 'Enter a valid email and an 8-character password to continue.');
      return;
    }
    if (step === 1 && name.trim().length < 2) {
      Alert.alert('Add your name', 'Your name helps Smart Fill match the right fields.');
      return;
    }
    if (step === 1) {
      const digits = phone.replace(/\D/g, '');
      const validLength = selectedCountry.iso === 'IN' ? digits.length === 10 : digits.length >= 7 && digits.length <= 15;
      if (!validLength) {
        setPhoneError(selectedCountry.iso === 'IN' ? 'Enter a 10-digit mobile number for India.' : 'Mobile numbers must contain 7 to 15 digits.');
        return;
      }
      setPhoneError('');
    }
    if (step === 2) {
      sendDemoCodes();
    }
    if (step === 3 && (!emailVerified || !phoneVerified)) {
      Alert.alert('Verify both contacts', 'Confirm the email and mobile OTP before continuing.');
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    try {
      await addDocument({
        id: 'aadhaar',
        type: 'Identity',
        label: 'Aadhaar Card',
        status: 'Processing',
        identifier: 'Review pending',
        updated: 'Just now',
        icon: 'card-outline',
        color: 'aqua',
        imageUri: asset.uri,
        contentType: asset.mimeType ?? 'image/jpeg',
      });
      setUploaded(true);
    } catch {
      Alert.alert('Upload failed', 'The Aadhaar file could not be copied into private device storage. Please try again.');
    }
  };

  const filteredCountries = countries.filter((country) => {
    const query = countrySearch.trim().toLowerCase();
    return !query || country.name.toLowerCase().includes(query) || country.dialCode.includes(query) || country.iso.toLowerCase().includes(query);
  });

  const useCurrentLocation = async () => {
    setLocationLoading(true);
    setLocationError('');
    try {
      if (Platform.OS === 'web') {
        if (!navigator.geolocation) throw new Error('Location is not available in this browser.');
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: false, timeout: 10000 });
        });
        const latitude = position.coords.latitude.toFixed(3);
        const longitude = position.coords.longitude.toFixed(3);
        setCity(`Current location · ${latitude}, ${longitude}`);
      } else {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          setLocationError(permission.canAskAgain ? 'Allow location access to use your current position.' : 'Location access is blocked. Choose a city manually or enable it in Settings.');
          return;
        }
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const places = await Location.reverseGeocodeAsync(position.coords);
        const place = places[0];
        const cityName = place?.city || place?.district || place?.subregion || place?.region;
        setCity(cityName ? `${cityName}${place?.region ? `, ${place.region}` : ''}` : 'Current location');
      }
      setLocationModalVisible(false);
      setLocationSearch('');
    } catch {
      setLocationError('We could not read your location. Search for your city instead.');
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <ImageBackground source={step === 1 ? profileSetupBackground : backgroundImage} resizeMode="cover" imageStyle={styles.backgroundImage} style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.imageShade, { backgroundColor: `${colors.midnight}A8`, pointerEvents: 'none' }]} />
      <LinearGradient colors={step === 0 ? [`${colors.midnight}F0`, `${colors.midnight}E8`, `${colors.midnight}D8`] : [`${colors.midnight}C8`, `${colors.background}F4`, colors.background]} locations={[0, 0.46, 0.82]} style={[styles.backgroundGradient, { pointerEvents: 'none' }]} />
      <View style={[styles.shell, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Go back" testID="button-back" onPress={() => step === 0 ? router.back() : setStep(step - 1)} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={22} color={step === 0 ? colors.card : colors.foreground} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerEyebrow, { color: step === 0 ? colors.aqua : colors.primary }]}>PRIVATE BY DESIGN</Text>
            <Text style={[styles.headerTitle, { color: step === 0 ? colors.card : colors.foreground }]}>Create your vault</Text>
          </View>
          <Text style={[styles.counter, { color: step === 0 ? `${colors.card}B8` : colors.mutedForeground }]}>{step + 1}/5</Text>
        </View>
        <View style={styles.progressRow}>
          {steps.map((item, index) => (
            <View key={item} style={styles.progressItem}>
              <View style={[styles.progressBar, { backgroundColor: index <= step ? colors.primary : `${colors.card}35` }]} />
              <Text style={[styles.progressLabel, { color: index === step ? (step === 0 ? colors.card : colors.foreground) : (step === 0 ? `${colors.card}A8` : colors.mutedForeground) }]}>{item}</Text>
            </View>
          ))}
        </View>
        <KeyboardAwareScrollViewCompat contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} bottomOffset={24} keyboardShouldPersistTaps="handled">
          {step === 0 ? <StepIntro title="Start with a secure account" detail="Your vault stays private from day one. Your password is never saved in plain text." icon="key-outline" dark>
            <Field label="Email address" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" icon="mail-outline" focused={focusedField === 'email'} onFocus={() => setFocusedField('email')} onBlur={() => setFocusedField(null)} dark />
            <Field label="Create password" value={password} onChangeText={setPassword} placeholder="At least 8 characters" secureTextEntry={!showPassword} icon="lock-closed-outline" focused={focusedField === 'password'} onFocus={() => setFocusedField('password')} onBlur={() => setFocusedField(null)} autoCapitalize="none" dark right={<Pressable accessibilityLabel={showPassword ? 'Hide password' : 'Show password'} onPress={() => setShowPassword(!showPassword)} hitSlop={8}><Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={19} color={colors.aqua} /></Pressable>} />
            <Text style={[styles.helper, { color: `${colors.card}B8` }]}><Ionicons name="shield-checkmark-outline" size={13} color={colors.aqua} /> Choose a unique password you do not use anywhere else.</Text>
          </StepIntro> : null}
          {step === 1 ? <StepIntro title="Tell us about you" detail="We only ask for what your vault and Smart Fill need to work accurately." icon="person-outline">
            <Field label="Full name" value={name} onChangeText={setName} placeholder="Anam Jasiya" icon="person-outline" focused={focusedField === 'name'} onFocus={() => setFocusedField('name')} onBlur={() => setFocusedField(null)} autoCapitalize="words" />
            <PhoneField country={selectedCountry} phone={phone} error={phoneError} onOpenCountryPicker={() => setCountryModalVisible(true)} onChangePhone={(value) => { setPhone(value.replace(/\D/g, '').slice(0, 15)); setPhoneError(''); }} focused={focusedField === 'phone'} onFocus={() => setFocusedField('phone')} onBlur={() => setFocusedField(null)} />
            <LocationField value={city} onOpen={() => setLocationModalVisible(true)} />
          </StepIntro> : null}
          {step === 2 ? <StepIntro title="Add your first document" detail="Choose a clear image. Secure Vault will process it on your device and show every extracted detail for review." icon="document-text-outline">
            <Pressable accessibilityLabel="Add Aadhaar card" onPress={uploadIdentity} style={({ pressed }) => [styles.uploadBox, { borderColor: colors.primary, backgroundColor: colors.accent, opacity: pressed ? 0.8 : 1 }]}>
              <View style={[styles.uploadIcon, { backgroundColor: colors.primary }]}><Ionicons name={uploaded ? 'checkmark' : 'cloud-upload-outline'} size={24} color={colors.primaryForeground} /></View>
              <View style={{ flex: 1 }}><Text style={[styles.uploadTitle, { color: colors.foreground }]}>{uploaded ? 'Aadhaar card added' : 'Upload Aadhaar card'}</Text><Text style={[styles.uploadDetail, { color: colors.mutedForeground }]}>{uploaded ? 'Stored securely in private storage' : 'Choose from photos or files'}</Text></View>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </Pressable>
            <DocumentTip icon="camera-outline" text="Your camera opens only when you choose to scan." />
            <DocumentTip icon="eye-off-outline" text="Your full number stays masked in the normal app view." />
          </StepIntro> : null}
          {step === 3 ? <StepIntro title="Verify your contact details" detail="We sent one-time codes to both destinations. Confirm each one before your vault is created." icon="checkmark-circle-outline">
            <Animated.View style={{ gap: 13, opacity: otpEntrance, transform: [{ translateY: otpEntrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }] }}>
              <OtpCard
                channel="email"
                destination={email || 'you@example.com'}
                value={emailOtp}
                sent={emailSent}
                verified={emailVerified}
                seconds={resendSeconds}
                onChange={(value) => setEmailOtp(value.replace(/\D/g, '').slice(0, 4))}
                onVerify={() => verifyDemoCode('email')}
                onResend={sendDemoCodes}
              />
              <OtpCard
                channel="phone"
                destination={phone ? `${selectedCountry.dialCode} ${phone}` : `${selectedCountry.dialCode} XXXXXXX210`}
                value={phoneOtp}
                sent={phoneSent}
                verified={phoneVerified}
                seconds={resendSeconds}
                onChange={(value) => setPhoneOtp(value.replace(/\D/g, '').slice(0, 4))}
                onVerify={() => verifyDemoCode('phone')}
                onResend={sendDemoCodes}
              />
            </Animated.View>
            <View style={[styles.demoNotice, { backgroundColor: colors.accent, borderColor: `${colors.primary}35` }]}>
              <Ionicons name="flask-outline" size={16} color={colors.primary} />
              <Text style={[styles.demoNoticeText, { color: colors.accentForeground }]}>Testing mode: enter any 4-digit code. Live SMS and email delivery will be connected later.</Text>
            </View>
          </StepIntro> : null}
          {step === 4 ? <StepIntro title="Your vault is ready" detail="You stay in control. Review before filling, unlock before revealing, and submit forms yourself." icon="sparkles-outline">
            {['Account created', 'Profile completed', 'Contact verified', 'Vault protected'].map((item) => <View key={item} style={styles.doneRow}><Ionicons name="checkmark-circle" size={22} color={colors.success} /><Text style={[styles.doneText, { color: colors.foreground }]}>{item}</Text></View>)}
          </StepIntro> : null}
           <PrimaryButton label={step === 4 ? 'Enter my vault' : step === 2 && !uploaded ? 'Skip for now' : step === 3 && (!emailVerified || !phoneVerified) ? 'Verify both to continue' : 'Continue'} onPress={next} icon="arrow-forward" disabled={step === 3 && (!emailVerified || !phoneVerified)} />
        </KeyboardAwareScrollViewCompat>
      </View>
      <CountryPickerModal visible={countryModalVisible} search={countrySearch} countries={filteredCountries} selectedCountry={selectedCountry} onSearch={setCountrySearch} onClose={() => { setCountryModalVisible(false); setCountrySearch(''); }} onSelect={(country) => { setSelectedCountry(country); setCountryModalVisible(false); setCountrySearch(''); }} />
      <LocationPickerModal visible={locationModalVisible} search={locationSearch} selectedLocation={city} locationLoading={locationLoading} locationError={locationError} onSearch={(value) => { setLocationSearch(value); setLocationError(''); }} onUseCurrentLocation={useCurrentLocation} onClose={() => { setLocationModalVisible(false); setLocationSearch(''); setLocationError(''); }} onSelect={(location) => { setCity(location); setLocationModalVisible(false); setLocationSearch(''); setLocationError(''); }} />
    </ImageBackground>
  );
}

function StepIntro({ title, detail, icon, children, dark = false }: { title: string; detail: string; icon: keyof typeof Ionicons.glyphMap; children: React.ReactNode; dark?: boolean }) {
  const colors = useColors();
  return <View style={{ gap: 20 }}><View style={styles.intro}><View style={[styles.stepIcon, { backgroundColor: dark ? `${colors.aqua}24` : colors.accent, borderColor: dark ? `${colors.aqua}5C` : `${colors.primary}2E` }]}><Ionicons name={icon} size={26} color={dark ? colors.aqua : colors.primary} /></View><Text style={[styles.title, { color: dark ? colors.card : colors.foreground }]}>{title}</Text><Text style={[styles.detail, { color: dark ? `${colors.card}C7` : colors.mutedForeground }]}>{detail}</Text></View><View style={{ gap: 13 }}>{children}</View></View>;
}

function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, icon, focused, onFocus, onBlur, right, dark = false, autoCapitalize = 'none' }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; secureTextEntry?: boolean; keyboardType?: 'email-address' | 'phone-pad'; icon: keyof typeof Ionicons.glyphMap; focused: boolean; onFocus: () => void; onBlur: () => void; right?: React.ReactNode; dark?: boolean; autoCapitalize?: 'none' | 'words' | 'sentences' }) {
  const colors = useColors();
  const fieldColor = dark ? colors.card : colors.foreground;
  const placeholderColor = dark ? `${colors.card}75` : colors.mutedForeground;
  return <View style={{ gap: 7 }}><Text style={[styles.fieldLabel, { color: fieldColor }]}>{label}</Text><View style={[styles.inputShell, { borderColor: focused ? (dark ? colors.aqua : colors.primary) : (dark ? `${colors.card}42` : colors.border), backgroundColor: dark ? `${colors.midnight}90` : colors.card }]}><Ionicons name={icon} size={18} color={focused ? (dark ? colors.aqua : colors.primary) : colors.mutedForeground} /><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={placeholderColor} secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize={autoCapitalize} onFocus={onFocus} onBlur={onBlur} style={[styles.input, { color: fieldColor }]} />{right}</View></View>;
}

function PhoneField({ country, phone, error, onOpenCountryPicker, onChangePhone, focused, onFocus, onBlur }: { country: Country; phone: string; error: string; onOpenCountryPicker: () => void; onChangePhone: (value: string) => void; focused: boolean; onFocus: () => void; onBlur: () => void }) {
  const colors = useColors();
  return <View style={{ gap: 7 }}>
    <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Mobile number</Text>
    <View style={[styles.phoneShell, { borderColor: focused ? colors.primary : error ? colors.destructive : colors.border, backgroundColor: colors.card }]}>
      <Pressable accessibilityLabel="Choose country code" testID="button-country-code" onPress={onOpenCountryPicker} style={styles.countryButton}>
        <CountryFlag iso={country.iso} />
        <View><Text style={[styles.countryCode, { color: colors.foreground }]}>{country.dialCode}</Text><Text style={[styles.countryName, { color: colors.mutedForeground }]}>{country.iso}</Text></View>
        <Ionicons name="chevron-down" size={15} color={colors.mutedForeground} />
      </Pressable>
      <View style={[styles.phoneDivider, { backgroundColor: colors.border }]} />
      <TextInput value={phone} onChangeText={onChangePhone} placeholder="98765 43210" placeholderTextColor={colors.mutedForeground} keyboardType="phone-pad" onFocus={onFocus} onBlur={onBlur} style={[styles.phoneInput, { color: colors.foreground }]} />
    </View>
    {error ? <Text style={[styles.errorText, { color: colors.destructive }]}><Ionicons name="alert-circle-outline" size={13} color={colors.destructive} /> {error}</Text> : <Text style={[styles.phoneHint, { color: colors.mutedForeground }]}>{country.name} · {country.dialCode} · mobile number only</Text>}
  </View>;
}

function DocumentTip({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const colors = useColors();
  return <View style={styles.tip}><Ionicons name={icon} size={17} color={colors.primary} /><Text style={[styles.tipText, { color: colors.mutedForeground }]}>{text}</Text></View>;
}

function OtpCard({
  channel,
  destination,
  value,
  sent,
  verified,
  seconds,
  onChange,
  onVerify,
  onResend,
}: {
  channel: 'email' | 'phone';
  destination: string;
  value: string;
  sent: boolean;
  verified: boolean;
  seconds: number;
  onChange: (value: string) => void;
  onVerify: () => void;
  onResend: () => void;
}) {
  const colors = useColors();
  const isEmail = channel === 'email';
  return (
    <View style={[styles.otpCard, { backgroundColor: colors.card, borderColor: verified ? `${colors.success}80` : colors.border }]}>
      <View style={styles.otpCardHeader}>
        <View style={[styles.otpIcon, { backgroundColor: verified ? `${colors.success}18` : colors.accent }]}>
          <Ionicons name={verified ? 'checkmark-circle' : isEmail ? 'mail-outline' : 'phone-portrait-outline'} size={20} color={verified ? colors.success : colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.otpLabel, { color: colors.foreground }]}>{isEmail ? 'Email address' : 'Mobile number'}</Text>
          <Text style={[styles.otpDestination, { color: colors.mutedForeground }]} numberOfLines={1}>{destination}</Text>
        </View>
        <View style={[styles.otpStatus, { backgroundColor: verified ? `${colors.success}18` : colors.secondary }]}>
          <Ionicons name={verified ? 'checkmark' : sent ? 'paper-plane-outline' : 'time-outline'} size={12} color={verified ? colors.success : colors.mutedForeground} />
          <Text style={[styles.otpStatusText, { color: verified ? colors.success : colors.mutedForeground }]}>{verified ? 'Verified' : sent ? 'Sent' : 'Pending'}</Text>
        </View>
      </View>
      {!verified ? (
        <>
          <View style={[styles.otpInputShell, { borderColor: value.length === 6 ? colors.primary : colors.border, backgroundColor: colors.background }]}>
            <Ionicons name="keypad-outline" size={18} color={colors.mutedForeground} />
            <TextInput
              accessibilityLabel={`Enter ${isEmail ? 'email' : 'mobile'} verification code`}
              testID={`input-${channel}-otp`}
              value={value}
              onChangeText={onChange}
              placeholder="Enter 4-digit code"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="number-pad"
              maxLength={4}
              textContentType="oneTimeCode"
              style={[styles.otpInput, { color: colors.foreground }]}
            />
            <Text style={[styles.otpCount, { color: colors.mutedForeground }]}>{value.length}/4</Text>
          </View>
          <View style={styles.otpActions}>
            <Pressable
              testID={`button-verify-${channel}-otp`}
              accessibilityLabel={`Verify ${isEmail ? 'email' : 'mobile'} code`}
              onPress={onVerify}
              disabled={value.length !== 4}
              style={({ pressed }) => [styles.verifyCodeButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : value.length === 4 ? 1 : 0.55 }]}
            >
              <Text style={[styles.verifyCodeText, { color: colors.primaryForeground }]}>Verify code</Text>
              <Ionicons name="arrow-forward" size={15} color={colors.primaryForeground} />
            </Pressable>
            <Pressable accessibilityLabel={`Resend ${isEmail ? 'email' : 'mobile'} code`} onPress={onResend} disabled={seconds > 0} hitSlop={8}>
              <Text style={[styles.resendText, { color: seconds > 0 ? colors.mutedForeground : colors.primary }]}>{seconds > 0 ? `Resend in ${seconds}s` : 'Resend code'}</Text>
            </Pressable>
          </View>
        </>
      ) : (
        <View style={[styles.verifiedMessage, { backgroundColor: `${colors.success}12` }]}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
          <Text style={[styles.verifiedMessageText, { color: colors.success }]}>Contact confirmed for this preview</Text>
        </View>
      )}
    </View>
  );
}

function LocationField({ value, onOpen }: { value: string; onOpen: () => void }) {
  const colors = useColors();
  return <View style={{ gap: 7 }}>
    <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Location</Text>
    <Pressable accessibilityLabel="Choose location" testID="button-location" onPress={onOpen} style={[styles.inputShell, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Ionicons name="location-outline" size={18} color={colors.primary} />
      <Text style={[styles.locationValue, { color: value ? colors.foreground : colors.mutedForeground }]}>{value || 'Choose your city'}</Text>
      <Ionicons name="chevron-down" size={17} color={colors.mutedForeground} />
    </Pressable>
    <Text style={[styles.phoneHint, { color: colors.mutedForeground }]}>Used to keep your profile and forms accurate.</Text>
  </View>;
}

function CountryFlag({ iso, large = false }: { iso: string; large?: boolean }) {
  const size = large ? 42 : 32;
  const flagStyle = { width: size, height: size * 0.68, borderRadius: large ? 10 : 8 };
  const stripe = { width: size, height: size * 0.68 / 3 };
  const navy = '#183b4d';
  const red = '#d64b55';
  const white = '#f8fbf8';
  const green = '#1c9b76';
  const gold = '#e6b96f';
  if (iso === 'IN') return <View style={[styles.flag, flagStyle, { overflow: 'hidden' }]}><View style={[stripe, { backgroundColor: '#f29d4b' }]} /><View style={[stripe, { backgroundColor: white, alignItems: 'center', justifyContent: 'center' }]}><View style={styles.flagWheel} /></View><View style={[stripe, { backgroundColor: green }]} /></View>;
  if (iso === 'US') return <View style={[styles.flag, flagStyle, { overflow: 'hidden', backgroundColor: white }]}><View style={[styles.usCanton, { width: size * 0.42, height: size * 0.38, backgroundColor: navy }]} /><View style={styles.usStripes}>{[0, 1, 2, 3, 4].map((item) => <View key={item} style={{ height: size * 0.68 / 9, backgroundColor: red }} />)}</View></View>;
  if (iso === 'AE') return <View style={[styles.flag, flagStyle, { overflow: 'hidden', flexDirection: 'row' }]}><View style={{ width: size * 0.25, backgroundColor: red }} /><View style={{ flex: 1 }}><View style={[stripe, { backgroundColor: green }]} /><View style={[stripe, { backgroundColor: white }]} /><View style={[stripe, { backgroundColor: '#111c24' }]} /></View></View>;
  if (iso === 'GB') return <View style={[styles.flag, flagStyle, { backgroundColor: navy, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }]}><View style={[styles.ukCross, { width: size, height: 4, backgroundColor: white }]} /><View style={[styles.ukCross, { width: 4, height: size * 0.68, backgroundColor: white }]} /><View style={[styles.ukCross, { width: size, height: 2, backgroundColor: red, transform: [{ rotate: '28deg' }] }]} /><View style={[styles.ukCross, { width: size, height: 2, backgroundColor: red, transform: [{ rotate: '-28deg' }] }]} /><View style={{ position: 'absolute', width: 4, height: size * 0.68, backgroundColor: red }} /></View>;
  if (iso === 'SG') return <View style={[styles.flag, flagStyle, { overflow: 'hidden' }]}><View style={[stripe, { height: size * 0.68 / 2, backgroundColor: red }]} /><View style={[stripe, { height: size * 0.68 / 2, backgroundColor: white }]} /></View>;
  if (iso === 'CA') return <View style={[styles.flag, flagStyle, { overflow: 'hidden', flexDirection: 'row', backgroundColor: white }]}><View style={{ width: size * 0.25, backgroundColor: red }} /><View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="leaf" size={large ? 22 : 16} color={red} /></View><View style={{ width: size * 0.25, backgroundColor: red }} /></View>;
  if (iso === 'AU' || iso === 'NZ') return <View style={[styles.flag, flagStyle, { backgroundColor: '#174b75', alignItems: 'center', justifyContent: 'center' }]}><Ionicons name="star" size={large ? 18 : 13} color={white} /><View style={styles.flagDot} /></View>;
  if (iso === 'DE') return <View style={[styles.flag, flagStyle, { overflow: 'hidden' }]}><View style={[stripe, { backgroundColor: '#20262c' }]} /><View style={[stripe, { backgroundColor: red }]} /><View style={[stripe, { backgroundColor: gold }]} /></View>;
  return <View style={[styles.flag, flagStyle, { backgroundColor: colorsForIso(iso) }]}><Ionicons name="globe-outline" size={large ? 22 : 16} color={white} /></View>;
}

function colorsForIso(iso: string) {
  return iso === 'FR' || iso === 'IT' ? '#2c718e' : iso === 'JP' ? '#d64b55' : iso === 'SA' ? '#2d9a72' : '#526f8b';
}

function CountryPickerModal({ visible, search, countries: filteredCountries, selectedCountry, onSearch, onClose, onSelect }: { visible: boolean; search: string; countries: readonly Country[]; selectedCountry: Country; onSearch: (value: string) => void; onClose: () => void; onSelect: (country: Country) => void }) {
  const colors = useColors();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={[styles.modalBackdrop, { backgroundColor: `${colors.midnight}9C` }]}>
      <View style={[styles.countrySheet, { backgroundColor: colors.background }]}>
        <View style={styles.sheetGrabber}><View style={[styles.grabber, { backgroundColor: colors.border }]} /></View>
        <ImageBackground source={countryGlobeArt} resizeMode="cover" imageStyle={styles.countryArtImage} style={styles.countryArt}>
          <LinearGradient colors={[`${colors.midnight}16`, `${colors.midnight}D9`]} style={StyleSheet.absoluteFill} />
          <View style={styles.countryArtCopy}><Text style={[styles.sheetEyebrow, { color: colors.aqua }]}>GLOBAL IDENTITY</Text><Text style={[styles.sheetTitle, { color: colors.card }]}>Choose your country</Text><Text style={[styles.countryArtDetail, { color: `${colors.card}C7` }]}>Use the country code that matches your mobile number.</Text></View>
        </ImageBackground>
        <View style={styles.sheetHeader}><Text style={[styles.sheetLabel, { color: colors.mutedForeground }]}>COUNTRY CODE</Text><Pressable accessibilityLabel="Close country selector" onPress={onClose} hitSlop={10}><Ionicons name="close" size={23} color={colors.foreground} /></Pressable></View>
        <View style={[styles.searchShell, { borderColor: colors.border, backgroundColor: colors.card }]}><Ionicons name="search-outline" size={18} color={colors.mutedForeground} /><TextInput value={search} onChangeText={onSearch} placeholder="Search country or code" placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} autoFocus /></View>
        <FlatList data={filteredCountries} keyExtractor={(item) => `${item.iso}-${item.dialCode}`} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.countryList} renderItem={({ item }) => {
          const selected = item.iso === selectedCountry.iso && item.dialCode === selectedCountry.dialCode;
          return <Pressable accessibilityLabel={`${item.name}, ${item.dialCode}`} onPress={() => onSelect(item)} style={[styles.countryRow, { borderBottomColor: colors.border }]}>
             <CountryFlag iso={item.iso} large />
            <View style={{ flex: 1 }}><Text style={[styles.countryRowName, { color: colors.foreground }]}>{item.name}</Text><Text style={[styles.countryRowCode, { color: colors.mutedForeground }]}>{item.iso} · {item.dialCode}</Text></View>
            {selected ? <Ionicons name="checkmark-circle" size={21} color={colors.primary} /> : null}
          </Pressable>;
        }} />
      </View>
    </View>
  </Modal>;
}

function LocationPickerModal({ visible, search, selectedLocation, locationLoading, locationError, onSearch, onUseCurrentLocation, onClose, onSelect }: { visible: boolean; search: string; selectedLocation: string; locationLoading: boolean; locationError: string; onSearch: (value: string) => void; onUseCurrentLocation: () => void; onClose: () => void; onSelect: (location: string) => void }) {
  const colors = useColors();
  const filteredLocations = locations.filter((location) => location.toLowerCase().includes(search.trim().toLowerCase()));
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={[styles.modalBackdrop, { backgroundColor: `${colors.midnight}9C` }]}>
      <View style={[styles.locationSheet, { backgroundColor: colors.background }]}>
        <View style={styles.sheetGrabber}><View style={[styles.grabber, { backgroundColor: colors.border }]} /></View>
        <View style={styles.sheetHeader}><View><Text style={[styles.sheetEyebrow, { color: colors.primary }]}>PROFILE LOCATION</Text><Text style={[styles.sheetTitle, { color: colors.foreground }]}>Choose your city</Text></View><Pressable accessibilityLabel="Close location selector" onPress={onClose} hitSlop={10}><Ionicons name="close" size={23} color={colors.foreground} /></Pressable></View>
         <Pressable testID="button-use-current-location" onPress={onUseCurrentLocation} disabled={locationLoading} style={({ pressed }) => [styles.currentLocationButton, { borderColor: colors.primary, backgroundColor: colors.accent, opacity: pressed || locationLoading ? 0.7 : 1 }]}>
           {locationLoading ? <ActivityIndicator size="small" color={colors.primary} /> : <Ionicons name="navigate" size={18} color={colors.primary} />}
           <View style={{ flex: 1 }}><Text style={[styles.currentLocationTitle, { color: colors.foreground }]}>{locationLoading ? 'Finding your location…' : 'Use my current location'}</Text><Text style={[styles.currentLocationDetail, { color: colors.mutedForeground }]}>You can also choose a city manually below.</Text></View>
           <Ionicons name="chevron-forward" size={17} color={colors.primary} />
         </Pressable>
         {locationError ? <Text style={[styles.locationError, { color: colors.destructive }]}>{locationError}</Text> : null}
        <View style={[styles.searchShell, { borderColor: colors.border, backgroundColor: colors.card }]}><Ionicons name="search-outline" size={18} color={colors.mutedForeground} /><TextInput value={search} onChangeText={onSearch} placeholder="Search city or state" placeholderTextColor={colors.mutedForeground} style={[styles.searchInput, { color: colors.foreground }]} autoFocus /></View>
        <FlatList data={filteredLocations} keyExtractor={(item) => item} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.countryList} ListEmptyComponent={<Text style={[styles.emptySearch, { color: colors.mutedForeground }]}>No matching city found. Try another search.</Text>} renderItem={({ item }) => {
          const selected = item === selectedLocation;
          return <Pressable accessibilityLabel={`Choose ${item}`} onPress={() => onSelect(item)} style={[styles.countryRow, { borderBottomColor: colors.border }]}>
            <View style={[styles.countryRowIcon, { backgroundColor: selected ? colors.accent : colors.secondary }]}><Ionicons name={selected ? 'checkmark' : 'location-outline'} size={18} color={selected ? colors.primary : colors.mutedForeground} /></View>
            <Text style={[styles.countryRowName, { color: colors.foreground, flex: 1 }]}>{item}</Text>
            {selected ? <Ionicons name="checkmark-circle" size={21} color={colors.primary} /> : null}
          </Pressable>;
        }} />
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundImage: { opacity: 0.34 },
  imageShade: { ...StyleSheet.absoluteFillObject },
  backgroundGradient: { ...StyleSheet.absoluteFillObject },
  shell: { flex: 1 },
  header: { minHeight: 58, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center', gap: 2 },
  headerEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1.3 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  counter: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  progressRow: { flexDirection: 'row', gap: 5, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 22 },
  progressItem: { flex: 1, gap: 6 },
  progressBar: { height: 4, borderRadius: 4 },
  progressLabel: { fontFamily: 'Inter_500Medium', fontSize: 9 },
  content: { paddingHorizontal: 20, gap: 28 },
  intro: { gap: 10 },
  stepIcon: { width: 58, height: 58, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 29, lineHeight: 34, letterSpacing: -0.4 },
  detail: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, maxWidth: 340 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  inputShell: { minHeight: 56, borderWidth: 1, borderRadius: 17, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { flex: 1, minHeight: 54, paddingHorizontal: 0, fontFamily: 'Inter_400Regular', fontSize: 15 },
  helper: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: -2 },
  phoneShell: { minHeight: 60, borderWidth: 1, borderRadius: 17, paddingLeft: 8, paddingRight: 14, flexDirection: 'row', alignItems: 'center' },
  countryButton: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 7, paddingRight: 9 },
  countryIcon: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  flag: { alignItems: 'center', justifyContent: 'center' },
  flagWheel: { width: 7, height: 7, borderRadius: 4, borderWidth: 1, borderColor: '#2f5f9d' },
  usCanton: { position: 'absolute', left: 0, top: 0, zIndex: 2 },
  usStripes: { position: 'absolute', left: 0, right: 0, bottom: 0, gap: 1 },
  ukCross: { position: 'absolute' },
  flagDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: '#d64b55', right: 5, bottom: 5 },
  countryCode: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  countryName: { fontFamily: 'Inter_500Medium', fontSize: 9, marginTop: 1 },
  phoneDivider: { width: 1, height: 31, marginRight: 12 },
  phoneInput: { flex: 1, minHeight: 54, fontFamily: 'Inter_500Medium', fontSize: 16, letterSpacing: 0.4 },
  phoneHint: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: -2 },
  locationValue: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15 },
  errorText: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: -2 },
  uploadBox: { minHeight: 86, borderRadius: 20, borderWidth: 1, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', padding: 15, gap: 12 },
  uploadIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  uploadTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  uploadDetail: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 3 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  tipText: { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1, lineHeight: 17 },
  otpCard: { borderWidth: 1, borderRadius: 20, padding: 14, gap: 12 },
  otpCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  otpIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  otpLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  otpDestination: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3, maxWidth: 180 },
  otpStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 5 },
  otpStatusText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  otpInputShell: { minHeight: 51, borderWidth: 1, borderRadius: 15, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9 },
  otpInput: { flex: 1, minHeight: 48, fontFamily: 'Inter_600SemiBold', fontSize: 18, letterSpacing: 3 },
  otpCount: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  otpActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  verifyCodeButton: { minHeight: 38, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  verifyCodeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  resendText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  verifiedMessage: { minHeight: 38, borderRadius: 12, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7 },
  verifiedMessageText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  demoNotice: { borderWidth: 1, borderRadius: 15, padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  demoNoticeText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  doneText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  countrySheet: { height: '82%', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10 },
  locationSheet: { height: '66%', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 10 },
  sheetGrabber: { alignItems: 'center', paddingBottom: 13 },
  grabber: { width: 42, height: 4, borderRadius: 4 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  sheetEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2 },
  sheetLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.3 },
  sheetTitle: { fontFamily: 'Inter_700Bold', fontSize: 25, marginTop: 3 },
  countryArt: { height: 190, borderRadius: 22, overflow: 'hidden', marginBottom: 16, justifyContent: 'flex-end' },
  countryArtImage: { opacity: 0.92 },
  countryArtCopy: { padding: 16 },
  countryArtDetail: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, marginTop: 5, maxWidth: 280 },
  searchShell: { minHeight: 50, borderWidth: 1, borderRadius: 15, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  searchInput: { flex: 1, minHeight: 48, fontFamily: 'Inter_400Regular', fontSize: 14 },
  countryList: { paddingTop: 10, paddingBottom: 30 },
  emptySearch: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', paddingVertical: 28 },
  countryRow: { minHeight: 68, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  countryRowIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  countryRowName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  countryRowCode: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  currentLocationButton: { minHeight: 64, borderWidth: 1, borderRadius: 17, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 9 },
  currentLocationTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  currentLocationDetail: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  locationError: { fontFamily: 'Inter_500Medium', fontSize: 11, lineHeight: 16, marginBottom: 8 },
});