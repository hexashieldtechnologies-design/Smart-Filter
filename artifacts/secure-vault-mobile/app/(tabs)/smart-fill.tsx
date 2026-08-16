import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { AppState, Animated, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, View, Modal, type ViewStyle } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard, PrimaryButton, SecurityBadge, VaultGradient } from '@/components/VaultUI';
import { useColors } from '@/hooks/useColors';
import { useVault, type ExtractedDocumentField, type VaultDocument, type VaultProfile, type VaultCredentialAccount } from '@/context/VaultContext';
import { smartFillNative, type SmartFillPermissions } from '@/services/smartFillNative';
import { analyzeScreenshot, type ScreenshotAnalysis } from '@/services/screenshotAnalysis';

type SmartFillPhase =
  | 'start'
  | 'setup'
  | 'active'
  | 'paused'
  | 'analyzing'
  | 'review'
  | 'filling'
  | 'filled'
  | 'error';

type Field = {
  id: string;
  label: string;
  value: string;
  confidence: number;
  selected: boolean;
  sensitive?: boolean;
  manual?: boolean;
  source?: string;
  pasteInstruction?: string;
};

const fieldLabels: Record<string, string> = {
  fullName: 'Full name',
  firstName: 'First name',
  lastName: 'Last name',
  name: 'Full name',
  fatherName: "Father's name",
  motherName: "Mother's name",
  phone: 'Phone number',
  email: 'Email address',
  password: 'Login password',
  dob: 'Date of birth',
  pan: 'PAN',
  aadhaar: 'Aadhaar number',
  passportNumber: 'Passport number',
  gender: 'Gender',
  address: 'Address',
  city: 'City',
  district: 'District',
  state: 'State',
  pincode: 'PIN code',
  linkedinUrl: 'LinkedIn profile URL',
  resume: 'Resume upload',
};

const sensitiveKeys = new Set([
  'dob',
  'pan',
  'aadhaar',
  'passportNumber',
  'address',
  'city',
  'district',
  'state',
  'pincode',
  'fatherName',
  'motherName',
  'password',
]);

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

function normalizeExtractedValue(id: string, value: string) {
  if (id === 'aadhaar') {
    const digits = value.replace(/\D/g, '').slice(0, 12);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  }
  if (id === 'pan') return value.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 10);
  return value.trim().replace(/\s+/g, ' ');
}

function fieldsFromScreenshotAnalysis(
  analysis: ScreenshotAnalysis,
  profile: VaultProfile | null | undefined,
  documents: VaultDocument[],
  credentialAccounts: VaultCredentialAccount[],
) {
  const localFields = fieldsFromLocalSources([], profile, documents, credentialAccounts)
    .filter((field) => !field.manual);
  const localById = new Map(localFields.map((field) => [field.id, field]));
  const localByLabel = new Map(localFields.map((field) => [field.label.toLowerCase(), field]));
  const blockedControl = /captcha|otp|one[- ]time|payment|card number|security|consent|submit|signature/i;
  const mapped = new Map<string, Field>();

  for (const item of analysis.fields) {
    const id = normalizeExtractedKey(item.key || item.label);
    const local = localById.get(id) ?? localByLabel.get(item.label.trim().toLowerCase());
    const isBlocked = blockedControl.test(`${item.label} ${item.controlType} ${item.pasteInstruction}`);
    const value = local?.value || normalizeExtractedValue(id, item.visibleValue);
    const sensitive = Boolean(item.sensitive || sensitiveKeys.has(id));
    const manual = isBlocked || !value;
    if (mapped.has(id)) continue;
    mapped.set(id, {
      id,
      label: fieldLabels[id] ?? item.label,
      value: value || (isBlocked ? 'Complete manually on the website' : 'No approved value available'),
      confidence: item.confidence,
      selected: !manual && !sensitive,
      sensitive,
      manual,
      source: local
        ? `Approved local value · ${item.pasteInstruction}`
        : `Screenshot only · ${item.pasteInstruction}`,
      pasteInstruction: item.pasteInstruction,
    });
  }

  if (mapped.size === 0) {
    return [
      {
        id: 'manualReview',
        label: 'Manual review',
        value: 'No safe form fields were detected',
        confidence: 0,
        selected: false,
        manual: true,
        source: 'Screenshot analysis',
        pasteInstruction: 'Open the page and continue manually.',
      } satisfies Field,
    ];
  }

  return Array.from(mapped.values());
}

function fieldsFromLocalSources(
  extracted: ExtractedDocumentField[],
  profile: VaultProfile | null | undefined,
  documents: VaultDocument[],
  credentialAccounts: VaultCredentialAccount[],
): Field[] {
  const values = new Map<string, Field>();
  const add = (
    id: string,
    value: string | undefined,
    options: Partial<Pick<Field, 'confidence' | 'sensitive' | 'selected' | 'source' | 'manual'>> = {},
    replaceExisting = false,
  ) => {
    const cleanValue = value ? normalizeExtractedValue(id, value) : '';
    if (!cleanValue || (values.has(id) && !replaceExisting)) return;
    const sensitive = options.sensitive ?? sensitiveKeys.has(id);
    values.set(id, {
      id,
      label: fieldLabels[id] ?? id,
      value: cleanValue,
      confidence: options.confidence ?? 100,
      selected: options.selected ?? !sensitive,
      sensitive,
      source: options.source ?? 'Encrypted local profile',
      manual: options.manual,
    });
  };

  const fullNameParts = profile?.fullName.trim().split(/\s+/).filter(Boolean) ?? [];
  add('fullName', profile?.fullName);
  add('firstName', profile?.firstName || fullNameParts[0]);
  add('lastName', profile?.lastName || (fullNameParts.length > 1 ? fullNameParts[fullNameParts.length - 1] : undefined));
  add('phone', profile?.mobile || profile?.alternateMobile);
  add('email', profile?.loginEmail || profile?.email || profile?.alternateEmail);
  if (credentialAccounts.length > 0) {
    add('password', 'Stored securely', {
      selected: false,
      sensitive: true,
      source: 'Secure local credential store',
    });
  }
  add('linkedinUrl', profile?.linkedinUrl);
  add('dob', profile?.dateOfBirth);
  add('gender', profile?.gender);
  add('fatherName', profile?.fatherName);
  add('motherName', profile?.motherName);
  add('aadhaar', profile?.aadhaarNumber);
  add('pan', profile?.panNumber);
  add('passportNumber', profile?.passportNumber);
  add('address', [
    profile?.permanentAddress.houseFlat,
    profile?.permanentAddress.buildingStreet,
    profile?.permanentAddress.areaLocality,
  ].filter(Boolean).join(', '));
  add('city', profile?.permanentAddress.city);
  add('district', profile?.permanentAddress.district);
  add('state', profile?.permanentAddress.state);
  add('pincode', profile?.permanentAddress.pinCode);
  add('nationality', profile?.nationality);
  add('occupation', profile?.occupation);
  add('organization', profile?.organization);
  add('designation', profile?.designation);

  extracted
    .slice()
    .sort((a, b) => b.confidence - a.confidence)
    .forEach((item) => {
      const id = normalizeExtractedKey(item.key);
      add(id, item.value, {
        confidence: item.confidence,
        source: item.source,
      }, true);
    });

  const resume = documents.find((document) => {
    const descriptor = `${document.id} ${document.label}`.toLowerCase();
    return descriptor.includes('resume') || descriptor.includes('cv');
  });
  const resumeIsPdf = resume?.contentType?.toLowerCase() === 'application/pdf';
  if (resume?.localFileUri && resume.status !== 'Not added' && resumeIsPdf) {
    add('resume', 'Saved resume PDF', {
      confidence: 100,
      selected: true,
      sensitive: false,
      source: 'Encrypted local document',
    });
  }

  return [
    ...Array.from(values.values()),
    { id: 'employer', label: 'Current employer', value: 'Not matched safely', confidence: 0, selected: false, manual: true },
    { id: 'consent', label: 'Terms and consent', value: 'Review on website', confidence: 0, selected: false, manual: true },
  ];
}

export default function SmartFillScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { smartFillEnabled, documents, profile, credentialAccounts, authorizeCredentialFill, addAudit } = useVault();
  const { action, source, request } = useLocalSearchParams<{ action?: string; source?: string; request?: string }>();
  const [phase, setPhase] = useState<SmartFillPhase>('start');
  const [permissions, setPermissions] = useState<SmartFillPermissions>({
    overlay: false,
    accessibility: false,
    autofill: false,
    nativeBridge: false,
  });
  const [fields, setFields] = useState<Field[]>([]);
  const [pendingSensitive, setPendingSensitive] = useState<Field | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [floatingExpanded, setFloatingExpanded] = useState(false);
  const [filesPanelVisible, setFilesPanelVisible] = useState(false);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [analysisSummary, setAnalysisSummary] = useState<Pick<ScreenshotAnalysis, 'formTitle' | 'screenSummary' | 'manualActions'> | null>(null);
  const handledRouteAction = useRef<string | null>(null);

  const refreshPermissions = useCallback(async () => {
    const next = await smartFillNative.getPermissions();
    setPermissions(next);
    return next;
  }, []);

  const syncNativeServiceState = useCallback(async () => {
    const active = await smartFillNative.isActive();
    setPhase((current) => {
      if (active && (current === 'start' || current === 'error')) return 'active';
      if (!active && current === 'active') return 'start';
      return current;
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshPermissions();
      void syncNativeServiceState();
    }, [refreshPermissions, syncNativeServiceState]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshPermissions();
        void syncNativeServiceState();
      }
    });

    return () => subscription.remove();
  }, [refreshPermissions, syncNativeServiceState]);

  const isPreview = Platform.OS === 'web';

  useEffect(() => {
    if (isPreview) return;
    void smartFillNative.setVaultFiles(
      documents.map((document) => ({
        id: document.id,
        label: document.label,
        type: document.type,
        status: document.status,
        identifier: document.identifier,
        extractedFieldCount: document.extractedFields?.length ?? 0,
      })),
    );
  }, [documents, isPreview]);

  const setupReady = permissions.overlay && permissions.accessibility && permissions.autofill;
  const selectedCount = fields.filter((field) => field.selected).length;
  const completedSummary = useMemo(
    () => ({
      filled: fields.filter((field) => field.selected && !field.manual).length,
      skipped: fields.filter((field) => !field.selected && !field.manual).length,
      manual: fields.filter((field) => field.manual).length,
    }),
    [fields],
  );

  const activate = async () => {
    setErrorMessage('');
    const currentPermissions = await refreshPermissions();
    if ((!currentPermissions.overlay || !currentPermissions.accessibility || !currentPermissions.autofill) && !isPreview) {
      setPhase('setup');
      setErrorMessage('Enable both Android permissions before starting Smart Fill.');
      return;
    }
    setPhase('analyzing');
    await new Promise<void>((resolve) => setTimeout(resolve, 250));
    const sourceIds = selectedDocumentIds.length
      ? selectedDocumentIds
      : documents.filter((document) => document.status !== 'Not added').map((document) => document.id);
    const extracted = documents
      .filter((document) => sourceIds.includes(document.id))
      .flatMap((document) => document.extractedFields ?? []);
    const nextFields = fieldsFromLocalSources(extracted, profile, documents, credentialAccounts);
    setFields(nextFields);
    const supportedFields = nextFields.filter((field) => !field.manual);
    if (supportedFields.length === 0) {
      setPhase('error');
      setErrorMessage(
        isPreview
          ? 'No saved profile or analyzed document fields are available in this preview.'
          : 'No saved profile or analyzed document values are available. Add them in Profile or Documents first.',
      );
      return;
    }

    // A native Android session is already user-authorized from this screen.
    // Start it immediately so the Accessibility service can fill the next
    // supported page without requiring a second review button tap. Sensitive
    // identity fields remain unselected and therefore require explicit review.
    const needsExplicitSensitiveReview = nextFields.some((field) => field.sensitive && !field.manual && !field.selected);
    if (!isPreview && needsExplicitSensitiveReview) {
      setPhase('review');
      await addAudit('Smart Fill values ready for review', 'Sensitive login and identity values need your confirmation before filling', 'shield-checkmark-outline');
      return;
    }

    if (!isPreview) {
      const approved = nextFields
        .filter((field) => field.selected && !field.manual)
        .map(({ id, value }) => ({ id, value }));
      if (approved.length === 0) {
        setPhase('error');
        setErrorMessage('No safe saved profile values are available. Add your details in Profile first.');
        return;
      }
      const started = await smartFillNative.start(approved, false);
      if (!started) {
        setPhase('error');
        setErrorMessage('The Android Smart Fill service could not be started. Check permissions and try again.');
        return;
      }
      setPhase('active');
      await addAudit('Smart Fill auto-fill ready', `${approved.length} safe saved values will fill when a supported page is detected`, 'sparkles-outline');
      return;
    }

    setPhase('review');
    await addAudit('Local Smart Fill data loaded', `${supportedFields.length} supported values found for your review`, 'scan-outline');
  };

  const startFloatingSession = async () => {
    const passwordApproved = fields.some((field) => field.id === 'password' && field.selected);
    if (passwordApproved) {
      const loginDomain = profile?.loginDomain;
      const loginEmail = profile?.loginEmail;
      const matchingAccounts = credentialAccounts.filter((account) =>
        Boolean(loginDomain) &&
        Boolean(loginEmail) &&
        account.domain === loginDomain &&
        account.username.toLowerCase() === loginEmail?.toLowerCase(),
      );
      const account = matchingAccounts.length === 1 ? matchingAccounts[0] : undefined;
      if (!account) {
        setErrorMessage('Choose one saved account with a matching website and login email before filling the password.');
        return;
      }
      const authorized = await authorizeCredentialFill(account);
      if (!authorized) {
        setErrorMessage('Password filling was cancelled. Your saved password was not released.');
        return;
      }
    }
    const approved = fields
      .filter((field) => field.selected && !field.manual)
      .filter((field) => field.id !== 'password')
      .map(({ id, value }) => ({ id, value }));
    if (approved.length === 0) {
      setErrorMessage('Select at least one safe field before starting Smart Fill.');
      return;
    }
    if (!isPreview) {
      const currentPermissions = await refreshPermissions();
      if (!currentPermissions.overlay || !currentPermissions.accessibility || !currentPermissions.autofill) {
        await smartFillNative.clearCredentialAuthorization();
        setPhase('setup');
        setErrorMessage('Enable the Android overlay, Accessibility, and Autofill permissions before starting Smart Fill.');
        return;
      }
    }
    setErrorMessage('');
    if (isPreview) {
      setPhase('filling');
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      setPhase('filled');
      await addAudit('Smart Fill completed', 'Approved fields were filled in the controlled in-app form', 'checkmark-circle-outline');
      return;
    }
    setPhase('active');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const started = await smartFillNative.start(approved, passwordApproved);
    if (!started && !isPreview) {
      await smartFillNative.clearCredentialAuthorization();
      setPhase('error');
      setErrorMessage('The Android Smart Fill service could not be started. Check permissions and try again.');
      return;
    }
    await addAudit('Smart Fill started', `${approved.length} approved fields ready for the browser`, 'sparkles-outline');
  };

  const analyzeCurrentScreen = async () => {
    setFilesPanelVisible(false);
    setFloatingExpanded(false);
    setPhase('analyzing');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      let imageBase64: string | null = null;
      let mimeType = 'image/jpeg';

      if (!isPreview && source === 'native') {
        const pendingScreenshot = await smartFillNative.consumePendingScreenshot();
        imageBase64 = pendingScreenshot?.base64 ?? null;
        mimeType = pendingScreenshot?.mimeType ?? 'image/png';
        if (!imageBase64) {
          throw new Error('The current page screenshot was not captured. Return to the page and try Analyze Screenshot again.');
        }
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.9,
          base64: true,
        });
        if (result.canceled || !result.assets?.[0]) {
          setPhase('active');
          return;
        }

        const asset = result.assets[0];
        imageBase64 = asset.base64 ?? null;
        mimeType = asset.mimeType ?? 'image/jpeg';
        if (!imageBase64) throw new Error('The selected screenshot could not be read.');
      }

      const analysis = await analyzeScreenshot(
        imageBase64,
        mimeType,
        'Return a safe, user-reviewed plan for where approved vault values can be pasted.',
      );
      setFields(fieldsFromScreenshotAnalysis(analysis, profile, documents, credentialAccounts));
      setAnalysisSummary({
        formTitle: analysis.formTitle,
        screenSummary: analysis.screenSummary,
        manualActions: analysis.manualActions,
      });
      setPhase('review');
      await addAudit(
        'Screenshot analyzed',
        `${analysis.fields.length} visible field${analysis.fields.length === 1 ? '' : 's'} mapped with paste instructions`,
        'scan-outline',
      );
    } catch (error) {
      setPhase('error');
      setErrorMessage(error instanceof Error ? error.message : 'Screenshot analysis failed. Please try another image.');
    }
  };

  useEffect(() => {
    if (!action) return;
    const actionKey = `${action}:${source ?? ''}:${request ?? ''}`;
    if (handledRouteAction.current === actionKey) return;
    handledRouteAction.current = actionKey;
    if (action === 'files') {
      setErrorMessage('');
      // Native floating actions can reopen the already-running activity while
      // React state is still on the launch screen. The native service owns the
      // approved values, but this route still needs its active surface mounted
      // before it can show the local document picker.
      setPhase('active');
      setFilesPanelVisible(true);
      return;
    }
    if (action === 'analyze') void analyzeCurrentScreen();
  }, [action, phase, request, source]);

  const startFillFromPanel = async () => {
    setFilesPanelVisible(false);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!isPreview) {
      await addAudit('Smart Fill fill requested', 'The native service is ready to fill approved fields on the supported page', 'play-circle-outline');
      return;
    }
    setPhase('filling');
    await new Promise<void>((resolve) => setTimeout(resolve, 800));
    setPhase('filled');
    await addAudit('Smart Fill completed', 'Approved fields were filled in the controlled preview', 'checkmark-circle-outline');
  };

  const closeFloating = async () => {
    await smartFillNative.stop();
    setFilesPanelVisible(false);
    setFloatingExpanded(false);
    setFields([]);
    setAnalysisSummary(null);
    setPhase('start');
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await addAudit('Floating Smart Fill closed', 'The floating control was hidden without changing the vault', 'close-circle-outline');
  };

  const start = async () => {
    const currentPermissions = await refreshPermissions();
    if (!smartFillEnabled) {
      setPhase('error');
      setErrorMessage('Smart Fill is disabled in Security. Enable it before starting a session.');
      return;
    }
    if ((!currentPermissions.overlay || !currentPermissions.accessibility || !currentPermissions.autofill) && !isPreview) {
      setPhase('setup');
      return;
    }
    await activate();
  };

  const openPermission = async (kind: 'overlay' | 'accessibility' | 'autofill') => {
    try {
      if (kind === 'overlay') {
        await smartFillNative.openOverlaySettings();
      } else if (kind === 'autofill') {
        await smartFillNative.openAutofillSettings();
      } else {
        await smartFillNative.openAccessibilitySettings();
      }
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to open Android permission settings.');
    }
    await refreshPermissions();
  };

  const togglePaused = async () => {
    if (phase === 'paused') {
      await smartFillNative.resume();
      setPhase('active');
      return;
    }
    await smartFillNative.pause();
    setPhase('paused');
  };

  const stop = async () => {
    await smartFillNative.stop();
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setFields([]);
    setAnalysisSummary(null);
    setFloatingExpanded(false);
    setPhase('start');
    await addAudit('Smart Fill stopped', 'The floating control and temporary session were cleared', 'stop-circle-outline');
  };

  const toggleField = (field: Field) => {
    if (field.manual) return;
    if (field.sensitive && !field.selected) {
      setPendingSensitive(field);
      return;
    }
    setFields((current) => current.map((item) => item.id === field.id ? { ...item, selected: !item.selected } : item));
  };

  const confirmSensitive = () => {
    if (!pendingSensitive) return;
    setFields((current) => current.map((item) => item.id === pendingSensitive.id ? { ...item, selected: true } : item));
    setPendingSensitive(null);
  };

  const applySelectedDocuments = async (selectedDocuments: VaultDocument[], updateNativeSession = false) => {
    const selectedIds = selectedDocuments.map((document) => document.id);
    const extracted = selectedDocuments.flatMap((document) => document.extractedFields ?? []);
    const nextFields = fieldsFromLocalSources(extracted, profile, documents, credentialAccounts);
    setSelectedDocumentIds(selectedIds);
    setFields(nextFields);
    setFilesPanelVisible(false);
    setFloatingExpanded(false);

    if (updateNativeSession && !isPreview) {
      const approved = nextFields
        .filter((field) => field.selected && !field.manual && field.id !== 'password')
        .map(({ id, value }) => ({ id, value }));
      if (approved.length === 0) {
        setErrorMessage('The selected files do not contain a safe approved field for this session.');
        return;
      }
      const started = await smartFillNative.start(approved, false);
      if (!started) {
        setErrorMessage('The selected files could not be applied to Smart Fill. Check permissions and try again.');
        return;
      }
    }

    await addAudit(
      'Documents selected for Smart Fill',
      `${selectedDocuments.length} local document${selectedDocuments.length === 1 ? '' : 's'} selected; structured fields will be read from the saved document JSON`,
      'documents-outline',
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 96,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
      <View style={styles.header}>
        <View style={styles.headingRow}>
          <View style={[styles.headingIcon, { backgroundColor: colors.primary }]}><Ionicons name="sparkles-outline" size={19} color={colors.primaryForeground} /></View>
          <View>
            <Text style={[styles.eyebrow, { color: colors.primary }]}>USER-CONTROLLED ASSISTANT</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Smart Fill</Text>
          </View>
        </View>
        <SecurityBadge
          label={
            phase === 'active' ? 'Active' :
              phase === 'paused' ? 'Paused' :
                phase === 'review' || phase === 'analyzing' ? 'Review first' :
                  'Safe by default'
          }
        />
      </View>

      {phase === 'start' ? (
        <StartState
          enabled={smartFillEnabled}
          onStart={start}
          onSetup={() => { refreshPermissions(); setPhase('setup'); }}
          colors={colors}
        />
      ) : null}
      {phase === 'setup' ? (
        <SetupState
          permissions={permissions}
          ready={setupReady}
          isPreview={isPreview}
          onPermission={openPermission}
          onRefresh={refreshPermissions}
          onStart={activate}
          colors={colors}
        />
      ) : null}
      {phase === 'active' || phase === 'paused' ? (
        <ActiveState
          paused={phase === 'paused'}
          isPreview={isPreview}
          documents={documents}
          filesPanelVisible={filesPanelVisible}
          selectedDocumentIds={selectedDocumentIds}
          onPause={togglePaused}
          onStop={stop}
          onOpenFiles={() => {
            setFilesPanelVisible(true);
          }}
          onCloseFiles={() => {
            setFilesPanelVisible(false);
          }}
          onSelectDocument={(id) => {
            if (documents.find((document) => document.id === id)?.status === 'Not added') return;
            setSelectedDocumentIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
          }}
          onSelectAllDocuments={() => {
            setSelectedDocumentIds((current) => {
              const availableIds = documents.filter((document) => document.status !== 'Not added').map((document) => document.id);
              const allSelected = availableIds.length > 0 && availableIds.every((id) => current.includes(id));
              return allSelected ? [] : availableIds;
            });
          }}
          onUseDocuments={(selectedDocuments) => void applySelectedDocuments(selectedDocuments, true)}
          colors={colors}
        />
      ) : null}
      {phase === 'analyzing' ? <AnalyzingState colors={colors} /> : null}
      {phase === 'review' ? (
        <ReviewState
          fields={fields}
          isPreview={isPreview}
          selectedDocumentCount={selectedDocumentIds.length}
          analysisSummary={analysisSummary}
          onOpenFiles={() => setFilesPanelVisible(true)}
          onToggle={toggleField}
          onFill={startFloatingSession}
          onStop={stop}
          colors={colors}
        />
      ) : null}
      {phase === 'review' ? (
        <FilesPanel
          visible={filesPanelVisible}
          documents={documents}
          selectedDocumentIds={selectedDocumentIds}
          onClose={() => setFilesPanelVisible(false)}
          onSelect={(id) => {
            if (documents.find((document) => document.id === id)?.status === 'Not added') return;
            setSelectedDocumentIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
          }}
          onSelectAll={() => {
            setSelectedDocumentIds((current) => {
              const availableIds = documents.filter((document) => document.status !== 'Not added').map((document) => document.id);
              const allSelected = availableIds.length > 0 && availableIds.every((id) => current.includes(id));
              return allSelected ? [] : availableIds;
            });
          }}
          onUse={(selectedDocuments) => void applySelectedDocuments(selectedDocuments)}
          colors={colors}
        />
      ) : null}
      {phase === 'filling' ? <FillingState colors={colors} /> : null}
      {phase === 'filled' ? (
        <FilledState
          summary={completedSummary}
          onReturn={() => setPhase('review')}
          onStop={stop}
          colors={colors}
        />
      ) : null}
      {phase === 'error' ? (
        <ErrorState
          message={errorMessage}
          onRetry={() => { setErrorMessage(''); setPhase('start'); }}
          colors={colors}
        />
      ) : null}

        <Modal
        visible={Boolean(pendingSensitive)}
        transparent
        animationType="slide"
        onRequestClose={() => setPendingSensitive(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.modalIcon, { backgroundColor: colors.accent }]}>
              <Ionicons name="lock-closed" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Confirm sensitive field</Text>
            <Text style={[styles.modalDetail, { color: colors.mutedForeground }]}>
              You are approving this value for the current form. Secure Vault will not submit the form for you.
            </Text>
            <View style={[styles.modalValue, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.modalLabel, { color: colors.mutedForeground }]}>{pendingSensitive?.label}</Text>
              <Text style={[styles.modalValueText, { color: colors.foreground }]}>{pendingSensitive?.value}</Text>
            </View>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setPendingSensitive(null)} style={[styles.modalButton, { backgroundColor: colors.secondary }]}>
                <Text style={[styles.modalButtonText, { color: colors.secondaryForeground }]}>Skip</Text>
              </Pressable>
              <Pressable onPress={confirmSensitive} style={[styles.modalButton, { backgroundColor: colors.primary }]}>
                <Text style={[styles.modalButtonText, { color: colors.primaryForeground }]}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
        </Modal>
      </ScrollView>
      {isPreview && (phase === 'active' || phase === 'paused') ? (
        <FloatingSmartFill
          expanded={floatingExpanded}
          onToggle={() => setFloatingExpanded((expanded) => !expanded)}
          onFiles={() => {
            setFloatingExpanded(false);
            setFilesPanelVisible(true);
          }}
          onAnalyze={() => void analyzeCurrentScreen()}
          onStartFill={() => void startFillFromPanel()}
          onClose={() => void closeFloating()}
          colors={colors}
        />
      ) : null}
    </View>
  );
}

function StartState({
  enabled,
  onStart,
  onSetup,
  colors,
}: {
  enabled: boolean;
  onStart: () => void;
  onSetup: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <>
      <VaultGradient style={styles.introCard}>
        <View style={[styles.sparkCircle, { backgroundColor: colors.aqua }]}>
          <Ionicons name="sparkles" size={27} color={colors.midnight} />
        </View>
        <Text style={styles.introTitle}>Forms, with your permission.</Text>
         <Text style={styles.introDetail}>
           Smart Fill fills safe saved profile values when a supported form appears. Sensitive and submit controls stay manual.
        </Text>
        <View style={styles.browserPreview}>
          <View style={styles.browserTop}><View style={styles.browserDot} /><Text style={styles.browserUrl}>supported-form.example</Text></View>
          <View style={styles.browserLineWide} />
          <View style={styles.browserLine} />
          <View style={styles.browserLineShort} />
          <View style={[styles.browserFillBadge, { backgroundColor: colors.aqua }]}>
            <Ionicons name="sparkles" size={13} color={colors.midnight} />
            <Text style={[styles.browserFillText, { color: colors.midnight }]}>Ready when you are</Text>
          </View>
        </View>
      </VaultGradient>
      <GlassCard style={styles.rulesCard}>
        <View style={styles.cardHeadingRow}>
          <Text style={[styles.cardHeading, { color: colors.foreground }]}>Always in your control</Text>
          <Ionicons name="shield-checkmark-outline" size={19} color={colors.primary} />
        </View>
        {[
          ['eye-outline', 'Review before filling'],
          ['hand-left-outline', 'Never submits for you'],
          ['stop-circle-outline', 'Pause or stop anytime'],
          ['shield-outline', 'No CAPTCHA or security bypass'],
        ].map(([icon, text]) => (
          <View key={text} style={styles.ruleRow}>
            <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.primary} />
            <Text style={[styles.ruleText, { color: colors.foreground }]}>{text}</Text>
          </View>
        ))}
      </GlassCard>
      <View style={[styles.factRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <View style={styles.fact}><Ionicons name="phone-portrait-outline" size={17} color={colors.primary} /><Text style={[styles.factValue, { color: colors.foreground }]}>On-device</Text><Text style={[styles.factLabel, { color: colors.mutedForeground }]}>processing</Text></View>
        <View style={[styles.factDivider, { backgroundColor: colors.border }]} />
        <View style={styles.fact}><Ionicons name="hand-left-outline" size={17} color={colors.primary} /><Text style={[styles.factValue, { color: colors.foreground }]}>You approve</Text><Text style={[styles.factLabel, { color: colors.mutedForeground }]}>every share</Text></View>
        <View style={[styles.factDivider, { backgroundColor: colors.border }]} />
        <View style={styles.fact}><Ionicons name="stop-circle-outline" size={17} color={colors.primary} /><Text style={[styles.factValue, { color: colors.foreground }]}>Always</Text><Text style={[styles.factLabel, { color: colors.mutedForeground }]}>stoppable</Text></View>
      </View>
      <PrimaryButton
        label={enabled ? 'Start a Smart Fill session' : 'Enable Smart Fill in Security'}
        onPress={enabled ? onStart : () => undefined}
        icon="arrow-forward"
        disabled={!enabled}
      />
      <Pressable onPress={onSetup} style={styles.setupLink}>
        <Ionicons name="settings-outline" size={15} color={colors.primary} />
        <Text style={[styles.setupLinkText, { color: colors.primary }]}>Review Android permissions</Text>
      </Pressable>
      <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
        OCR and field matching run on this device. No document data is sent to the cloud. If a website blocks automation, Secure Vault stops and asks you to continue manually.
      </Text>
    </>
  );
}

function SetupState({
  permissions,
  ready,
  isPreview,
  onPermission,
  onRefresh,
  onStart,
  colors,
}: {
  permissions: SmartFillPermissions;
  ready: boolean;
  isPreview: boolean;
   onPermission: (kind: 'overlay' | 'accessibility' | 'autofill') => void;
  onRefresh: () => void;
  onStart: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <>
      <VaultGradient style={styles.setupHero}>
        <View style={[styles.setupHeroIcon, { backgroundColor: colors.aqua }]}>
          <Ionicons name="options-outline" size={25} color={colors.midnight} />
        </View>
        <Text style={styles.setupTitle}>Smart Fill Setup</Text>
        <Text style={styles.setupDetail}>
          {isPreview
            ? 'This preview uses a controlled in-app form. A native Android build is required for a system overlay in Chrome.'
            : 'Enable the overlay, Accessibility, and Autofill permissions to keep the floating control visible and fill supported fields in other apps.'}
        </Text>
      </VaultGradient>
      {ready && !isPreview ? (
        <View style={[styles.notice, { backgroundColor: colors.accent }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={[styles.noticeText, { color: colors.foreground }]}>
            Floating permission enabled. Smart Fill is ready to start.
          </Text>
        </View>
      ) : null}
      <PermissionRow
        icon="layers-outline"
        title="Display over other apps"
        detail="Keeps the small Smart Fill control visible while you use another app."
        granted={permissions.overlay}
        onPress={() => onPermission('overlay')}
        colors={colors}
      />
      <PermissionRow
        icon="accessibility-outline"
        title="Accessibility access"
         detail="Required to identify compatible visible controls and fill only the fields you approve."
        granted={permissions.accessibility}
        onPress={() => onPermission('accessibility')}
        colors={colors}
      />
      <PermissionRow
        icon="key-outline"
        title="Autofill service"
        detail="Lets Android provide an approved login credential only to the matching website."
        granted={permissions.autofill}
        onPress={() => onPermission('autofill')}
        colors={colors}
      />
      {!permissions.nativeBridge && !isPreview ? (
        <View style={[styles.notice, { backgroundColor: colors.secondary }]}>
          <Ionicons name="information-circle-outline" size={19} color={colors.primary} />
          <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
            This build does not include the Android permission bridge. Install the release APK to use the real overlay permission settings.
          </Text>
        </View>
      ) : null}
      <Pressable onPress={onRefresh} style={styles.refreshButton}>
        <Ionicons name="refresh-outline" size={16} color={colors.primary} />
        <Text style={[styles.refreshText, { color: colors.primary }]}>Refresh permission status</Text>
      </Pressable>
       <PrimaryButton label={ready || isPreview ? 'Start Smart Fill' : 'Complete setup first'} onPress={onStart} icon="sparkles" disabled={!ready && !isPreview} />
      <Pressable onPress={() => router.back()} style={styles.backLink}>
        <Ionicons name="arrow-back" size={15} color={colors.mutedForeground} />
        <Text style={[styles.backLinkText, { color: colors.mutedForeground }]}>Back to Smart Fill</Text>
      </Pressable>
    </>
  );
}

function PermissionRow({
  icon,
  title,
  detail,
  granted,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  granted: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <GlassCard style={styles.permissionCard}>
      <View style={[styles.permissionIcon, { backgroundColor: granted ? colors.accent : colors.secondary }]}>
        <Ionicons name={icon} size={21} color={granted ? colors.success : colors.mutedForeground} />
      </View>
      <View style={styles.permissionBody}>
        <View style={styles.permissionTitleRow}>
          <Text style={[styles.permissionTitle, { color: colors.foreground }]}>{title}</Text>
          <Ionicons name={granted ? 'checkmark-circle' : 'close-circle'} size={18} color={granted ? colors.success : colors.warning} />
        </View>
        <Text style={[styles.permissionDetail, { color: colors.mutedForeground }]}>{detail}</Text>
        {!granted ? (
          <Pressable onPress={onPress} style={styles.permissionAction}>
            <Text style={[styles.permissionActionText, { color: colors.primary }]}>Enable</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
    </GlassCard>
  );
}

function ActiveState({
  paused,
  isPreview,
  documents,
  filesPanelVisible,
  selectedDocumentIds,
  onPause,
  onStop,
  onOpenFiles,
  onCloseFiles,
  onSelectDocument,
  onSelectAllDocuments,
  onUseDocuments,
  colors,
}: {
  paused: boolean;
  isPreview: boolean;
  documents: VaultDocument[];
  filesPanelVisible: boolean;
  selectedDocumentIds: string[];
  onPause: () => void;
  onStop: () => void;
  onOpenFiles: () => void;
  onCloseFiles: () => void;
  onSelectDocument: (id: string) => void;
  onSelectAllDocuments: () => void;
  onUseDocuments: (documents: VaultDocument[]) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <>
      <View style={[styles.sessionBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.live}>
          <View style={[styles.liveDot, { backgroundColor: paused ? colors.warning : colors.success }]} />
          <View>
           <Text style={[styles.sessionTitle, { color: colors.foreground }]}>Smart Fill {paused ? 'paused' : 'active'}</Text>
           <Text style={[styles.sessionDetail, { color: colors.mutedForeground }]}>Auto-fills when a supported form appears</Text>
          </View>
        </View>
        <View style={styles.sessionActions}>
          <Pressable onPress={onPause} hitSlop={8} testID="smart-fill-pause">
            <Ionicons name={paused ? 'play' : 'pause'} size={20} color={colors.foreground} />
          </Pressable>
          <Pressable onPress={onStop} hitSlop={8} testID="smart-fill-stop">
            <Ionicons name="stop" size={20} color={colors.destructive} />
          </Pressable>
        </View>
      </View>
      <View style={styles.previewStage}>
        <VaultGradient style={styles.browserCard}>
          <View style={styles.browserHeader}>
            <View style={styles.browserHeaderLeft}><Ionicons name="logo-chrome" size={18} color={colors.aqua} /><Text style={styles.browserHeaderText}>Chrome · supported form</Text></View>
            <View style={styles.livePill}><View style={[styles.liveDot, { backgroundColor: colors.success }]} /><Text style={styles.livePillText}>Ready</Text></View>
          </View>
          <Text style={styles.browserCardTitle}>A form is waiting for your review</Text>
          <Text style={styles.browserCardDetail}>
             {isPreview ? 'This controlled preview demonstrates the user-confirmed flow without accessing another app.' : 'Open any supported form. Smart Fill scans page changes and fills safe saved values automatically.'}
          </Text>
          <View style={styles.formMock}>
            <Text style={styles.formMockLabel}>Full name</Text>
            <View style={styles.formMockInput}><Text style={styles.formMockValue}>Anam Jasiya</Text></View>
            <Text style={styles.formMockLabel}>Email address</Text>
            <View style={styles.formMockInput}><Text style={styles.formMockPlaceholder}>Waiting for Smart Fill</Text></View>
          </View>
        </VaultGradient>
      </View>
      <View style={styles.safeNote}>
        <Ionicons name="hand-left-outline" size={17} color={colors.primary} />
         <Text style={[styles.safeNoteText, { color: colors.mutedForeground }]}>Matching saved profile fields fill automatically. The website is never submitted for you.</Text>
      </View>
      <FilesPanel
        visible={filesPanelVisible}
        documents={documents}
        selectedDocumentIds={selectedDocumentIds}
        onClose={onCloseFiles}
        onSelect={onSelectDocument}
        onSelectAll={onSelectAllDocuments}
        onUse={onUseDocuments}
        colors={colors}
      />
    </>
  );
}

function FloatingSmartFill({
  expanded,
  onToggle,
  onFiles,
  onAnalyze,
  onStartFill,
  onClose,
  colors,
}: {
  expanded: boolean;
  onToggle: () => void;
  onFiles: () => void;
  onAnalyze: () => void;
  onStartFill: () => void;
  onClose: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const lastOffset = useRef({ x: 0, y: 0 });
  useEffect(() => {
    AsyncStorage.getItem('secure-vault-smart-fill-floating-position')
      .then((stored) => {
        if (!stored) return;
        const parsed = JSON.parse(stored) as { x?: number; y?: number };
        const restored = {
          x: Math.max(-190, Math.min(12, parsed.x ?? 0)),
          y: Math.max(-190, Math.min(22, parsed.y ?? 0)),
        };
        lastOffset.current = restored;
        pan.setValue(restored);
      })
      .catch(() => undefined);
  }, [pan]);
  const panResponder = useMemo(
    () => PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => {
        pan.setOffset(lastOffset.current);
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue({ x: gestureState.dx, y: gestureState.dy });
      },
      onPanResponderRelease: (_, gestureState) => {
        const next = {
          x: Math.max(-190, Math.min(12, lastOffset.current.x + gestureState.dx)),
          y: Math.max(-190, Math.min(22, lastOffset.current.y + gestureState.dy)),
        };
        lastOffset.current = next;
        void AsyncStorage.setItem('secure-vault-smart-fill-floating-position', JSON.stringify(next));
        pan.flattenOffset();
        Animated.spring(pan, {
          toValue: next,
          damping: 17,
          stiffness: 190,
          mass: 0.7,
          useNativeDriver: true,
        }).start();
      },
    }),
    [pan],
  );

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[styles.floatingControlWrap, { right: 14, bottom: 14 }, pan.getTranslateTransform()]}
    >
      {expanded ? (
        <View style={[styles.floatingPanel, { backgroundColor: `${colors.midnight}F2`, borderColor: `${colors.aqua}55` }]}>
          <View style={styles.floatingPanelHeader}>
            <View style={[styles.floatingPanelDot, { backgroundColor: colors.aqua }]} />
            <Text style={[styles.floatingPanelEyebrow, { color: colors.aqua }]}>SMART FILL</Text>
            <Text style={[styles.floatingPanelHint, { color: `${colors.card}9A` }]}>Choose an action</Text>
          </View>
          <FloatingAction icon="folder-open-outline" label="Files" onPress={onFiles} colors={colors} positionStyle={styles.floatingActionTop} />
          <FloatingAction icon="scan-outline" label="See This Screen" onPress={onAnalyze} colors={colors} positionStyle={styles.floatingActionLeft} />
          <FloatingAction icon="play-outline" label="Start Fill Up" onPress={onStartFill} colors={colors} positionStyle={styles.floatingActionRight} />
          <FloatingAction icon="close-outline" label="Close" onPress={onClose} colors={colors} positionStyle={styles.floatingActionBottom} />
        </View>
      ) : null}
      <Pressable
        testID="smart-fill-floating-control"
        accessibilityLabel={expanded ? 'Close Smart Fill actions' : 'Open Smart Fill actions'}
        onPress={onToggle}
        style={({ pressed }) => [
          styles.floatingControl,
          {
            backgroundColor: colors.aqua,
            borderColor: `${colors.card}B8`,
            transform: [{ scale: pressed ? 0.92 : 1 }],
          },
        ]}
      >
        <View style={[styles.floatingControlInner, { backgroundColor: `${colors.midnight}18` }]}>
          <Ionicons name={expanded ? 'close' : 'sparkles'} size={23} color={colors.midnight} />
        </View>
        <View style={[styles.floatingLiveDot, { backgroundColor: colors.success, borderColor: colors.aqua }]} />
      </Pressable>
    </Animated.View>
  );
}

function FloatingAction({
  icon,
  label,
  onPress,
  colors,
  positionStyle,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
  positionStyle?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      testID={`smart-fill-action-${label.toLowerCase().replace(/\s+/g, '-')}`}
      onPress={onPress}
      style={({ pressed }) => [styles.floatingAction, positionStyle, { opacity: pressed ? 0.72 : 1 }]}
    >
      <View style={[styles.floatingActionIcon, { backgroundColor: colors.aqua }]}>
        <Ionicons name={icon} size={21} color={colors.midnight} />
      </View>
      <Text style={[styles.floatingActionLabel, { color: colors.card }]}>{label}</Text>
    </Pressable>
  );
}

type FileFilter = 'All' | 'Identity' | 'Financial' | 'Education' | 'Employment' | 'Personal' | 'Other';
const fileFilters: FileFilter[] = ['All', 'Identity', 'Financial', 'Education', 'Employment', 'Personal', 'Other'];

function documentCategory(document: VaultDocument): FileFilter {
  const descriptor = `${document.type} ${document.label}`.toLowerCase();
  if (descriptor.includes('tax') || descriptor.includes('pan') || descriptor.includes('financial')) return 'Financial';
  if (descriptor.includes('resume') || descriptor.includes('career') || descriptor.includes('employment')) return 'Employment';
  if (descriptor.includes('education') || descriptor.includes('certificate')) return 'Education';
  if (descriptor.includes('passport') || descriptor.includes('personal') || descriptor.includes('photo')) return 'Personal';
  if (descriptor.includes('identity') || descriptor.includes('aadhaar') || descriptor.includes('licence') || descriptor.includes('license')) return 'Identity';
  return 'Other';
}

function FilesPanel({
  visible,
  documents,
  selectedDocumentIds,
  onClose,
  onSelect,
  onSelectAll,
  onUse,
  colors,
}: {
  visible: boolean;
  documents: VaultDocument[];
  selectedDocumentIds: string[];
  onClose: () => void;
  onSelect: (id: string) => void;
  onSelectAll: () => void;
  onUse: (documents: VaultDocument[]) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [filter, setFilter] = useState<FileFilter>('All');
  const filteredDocuments = documents.filter((document) => filter === 'All' || documentCategory(document) === filter);
  const availableDocuments = documents.filter((document) => document.status !== 'Not added');
  const selectedDocuments = documents.filter((document) => selectedDocumentIds.includes(document.id));
  const allAvailableSelected = availableDocuments.length > 0 && availableDocuments.every((document) => selectedDocumentIds.includes(document.id));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.fileBackdrop, { backgroundColor: `${colors.midnight}A6` }]}>
        <View style={[styles.fileSheet, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <View style={styles.fileSheetHeader}>
            <View style={styles.fileSheetTitleRow}>
              <View style={[styles.fileSheetIcon, { backgroundColor: colors.accent }]}>
                <Ionicons name="folder-open-outline" size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.fileSheetEyebrow, { color: colors.primary }]}>LOCAL DOCUMENTS</Text>
                <Text style={[styles.fileSheetTitle, { color: colors.foreground }]}>Files</Text>
              </View>
            </View>
            <Pressable accessibilityLabel="Close files panel" testID="smart-fill-files-close" onPress={onClose} hitSlop={10}>
              <Ionicons name="close-circle-outline" size={25} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.fileFilters}>
            {fileFilters.map((item) => (
              <Pressable
                key={item}
                onPress={() => setFilter(item)}
                style={[styles.fileFilter, { backgroundColor: filter === item ? colors.primary : colors.card, borderColor: filter === item ? colors.primary : colors.border }]}
              >
                <Text style={[styles.fileFilterText, { color: filter === item ? colors.primaryForeground : colors.mutedForeground }]}>{item}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={styles.fileSelectionToolbar}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.fileSelectionLabel, { color: colors.mutedForeground }]}>DOCUMENT SOURCES</Text>
              <Text style={[styles.fileSelectionTitle, { color: colors.foreground }]}>
                {selectedDocuments.length === 0 ? 'Choose files once for this form' : `${selectedDocuments.length} file${selectedDocuments.length === 1 ? '' : 's'} selected`}
              </Text>
            </View>
            <Pressable
              testID="smart-fill-select-all"
              accessibilityLabel={allAvailableSelected ? 'All available files selected' : 'Select all available files'}
              onPress={onSelectAll}
              style={[styles.fileSelectAllButton, { backgroundColor: allAvailableSelected ? colors.accent : colors.primary }]}
            >
              <Ionicons name={allAvailableSelected ? 'checkmark-done' : 'checkbox-outline'} size={16} color={allAvailableSelected ? colors.primary : colors.primaryForeground} />
              <Text style={[styles.fileSelectAllText, { color: allAvailableSelected ? colors.primary : colors.primaryForeground }]}>{allAvailableSelected ? 'All selected' : 'Select all'}</Text>
            </Pressable>
          </View>
          <ScrollView
            style={styles.fileList}
            contentContainerStyle={styles.fileListContent}
            showsVerticalScrollIndicator
            nestedScrollEnabled
            scrollEnabled={filteredDocuments.length > 0}
            keyboardShouldPersistTaps="handled"
          >
            {filteredDocuments.length === 0 ? (
              <View style={styles.fileEmpty}>
                <Ionicons name="document-outline" size={28} color={colors.mutedForeground} />
                <Text style={[styles.fileEmptyTitle, { color: colors.foreground }]}>No documents in this group</Text>
                <Text style={[styles.fileEmptyDetail, { color: colors.mutedForeground }]}>Add a document to make it available for Smart Fill.</Text>
              </View>
            ) : filteredDocuments.map((document) => {
              const selected = selectedDocumentIds.includes(document.id);
              const available = document.status !== 'Not added';
              return (
                <Pressable
                  key={document.id}
                  accessibilityLabel={`Select ${document.label}`}
                  testID={`smart-fill-file-${document.id}`}
                  onPress={() => onSelect(document.id)}
                  style={({ pressed }) => [styles.fileRow, { backgroundColor: selected ? colors.accent : colors.card, borderColor: selected ? colors.primary : colors.border, opacity: pressed ? 0.8 : 1 }]}
                >
                  <View style={[styles.fileRowIcon, { backgroundColor: available ? colors.accent : colors.secondary }]}>
                    <Ionicons name={(document.icon || 'document-outline') as keyof typeof Ionicons.glyphMap} size={19} color={available ? colors.primary : colors.mutedForeground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fileRowTitle, { color: colors.foreground }]}>{document.label}</Text>
                    <Text style={[styles.fileRowDetail, { color: colors.mutedForeground }]}>
                      {available ? `${document.extractedFields?.length ?? 0} structured field${document.extractedFields?.length === 1 ? '' : 's'} in local JSON` : 'Not added yet'}
                    </Text>
                  </View>
                  <Ionicons name={selected ? 'checkmark-circle' : available ? 'checkmark-circle-outline' : 'ellipse-outline'} size={21} color={selected ? colors.primary : available ? colors.success : colors.mutedForeground} />
                </Pressable>
              );
            })}
          </ScrollView>
          {selectedDocuments.length > 0 ? (
            <View style={[styles.fileSelection, { backgroundColor: colors.card, borderColor: colors.primary }]}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.fileSelectionLabel, { color: colors.mutedForeground }]}>READY FOR THIS FORM</Text>
                <Text style={[styles.fileSelectionTitle, { color: colors.foreground }]}>One pass across selected JSON</Text>
              </View>
              <Pressable
                testID="smart-fill-use-document"
                onPress={() => onUse(selectedDocuments.filter((document) => document.status !== 'Not added'))}
                style={[styles.fileUseButton, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.fileUseButtonText, { color: colors.primaryForeground }]}>Use for Fill</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function AnalyzingState({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.analyzingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.analyzingIcon, { backgroundColor: colors.accent }]}>
        <Ionicons name="scan-outline" size={29} color={colors.primary} />
      </View>
      <Text style={[styles.analyzingTitle, { color: colors.foreground }]}>Analyzing form…</Text>
      <Text style={[styles.analyzingDetail, { color: colors.mutedForeground }]}>Detecting fields, matching approved profile data, and checking field types.</Text>
      <View style={styles.analyzingSteps}>
        {['Detecting compatible fields', 'Matching semantic signals', 'Checking sensitive values'].map((step, index) => (
          <View key={step} style={styles.analyzingStep}>
            <View style={[styles.stepNumber, { backgroundColor: colors.primary }]}><Text style={[styles.stepNumberText, { color: colors.primaryForeground }]}>{index + 1}</Text></View>
            <Text style={[styles.stepText, { color: colors.foreground }]}>{step}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function ReviewState({
  fields,
  isPreview,
  selectedDocumentCount,
  analysisSummary,
  onOpenFiles,
  onToggle,
  onFill,
  onStop,
  colors,
}: {
  fields: Field[];
  isPreview: boolean;
  selectedDocumentCount: number;
  analysisSummary: Pick<ScreenshotAnalysis, 'formTitle' | 'screenSummary' | 'manualActions'> | null;
  onOpenFiles: () => void;
  onToggle: (field: Field) => void;
  onFill: () => void;
  onStop: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const selectedCount = fields.filter((field) => field.selected).length;
  return (
    <>
      <View style={[styles.reviewTop, { backgroundColor: colors.accent }]}>
        <View style={[styles.reviewIcon, { backgroundColor: colors.primary }]}><Ionicons name="checkmark-done" size={23} color={colors.primaryForeground} /></View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.reviewTopTitle, { color: colors.foreground }]}>Review before filling</Text>
          <Text style={[styles.reviewTopDetail, { color: colors.mutedForeground }]}>Choose exactly what to share with this form.</Text>
        </View>
        <Text style={[styles.count, { color: colors.primary }]}>{selectedCount}/{fields.length}</Text>
      </View>
      <View style={styles.reviewNotice}>
        <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
        <Text style={[styles.reviewNoticeText, { color: colors.mutedForeground }]}>High confidence matches are preselected. Sensitive values always need your confirmation.</Text>
      </View>
      {analysisSummary ? (
        <View style={[styles.analysisSummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.analysisSummaryHeading}>
            <Ionicons name="scan-outline" size={17} color={colors.primary} />
            <Text style={[styles.analysisSummaryTitle, { color: colors.foreground }]}>{analysisSummary.formTitle}</Text>
          </View>
          <Text style={[styles.analysisSummaryText, { color: colors.mutedForeground }]}>{analysisSummary.screenSummary}</Text>
          {analysisSummary.manualActions.length > 0 ? (
            <Text style={[styles.analysisManualText, { color: colors.warning }]}>
              Manual only: {analysisSummary.manualActions.join(' · ')}
            </Text>
          ) : null}
        </View>
      ) : null}
      <Pressable
        testID="smart-fill-review-files"
        accessibilityLabel="Choose Smart Fill source files"
        onPress={onOpenFiles}
        style={({ pressed }) => [styles.reviewFilesButton, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.82 : 1 }]}
      >
        <View style={[styles.reviewFilesIcon, { backgroundColor: colors.accent }]}>
          <Ionicons name="folder-open-outline" size={19} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.reviewFilesTitle, { color: colors.foreground }]}>Source files</Text>
          <Text style={[styles.reviewFilesDetail, { color: colors.mutedForeground }]}>
            {selectedDocumentCount > 0 ? `${selectedDocumentCount} document${selectedDocumentCount === 1 ? '' : 's'} selected` : 'All available local documents'}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} />
      </Pressable>
      {fields.map((field) => (
        <Pressable
          key={field.id}
          onPress={() => onToggle(field)}
          disabled={field.manual}
          style={({ pressed }) => [
            styles.fieldCard,
            { backgroundColor: colors.card, borderColor: field.sensitive ? colors.gold : colors.border, opacity: pressed ? 0.84 : field.manual ? 0.74 : 1 },
          ]}
        >
          <View style={[styles.check, { backgroundColor: field.selected ? colors.primary : colors.secondary, borderColor: field.selected ? colors.primary : colors.border }]}>
            {field.selected ? <Ionicons name="checkmark" size={15} color={colors.primaryForeground} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.fieldLabelRow}>
              <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{field.label}</Text>
              {field.sensitive ? <Ionicons name="warning-outline" size={15} color={colors.warning} /> : null}
              {field.manual ? <Text style={[styles.manualPill, { color: colors.warning, backgroundColor: `${colors.gold}35` }]}>MANUAL</Text> : null}
            </View>
            <Text style={[styles.fieldValue, { color: colors.foreground }]}>
              {field.id === 'password' ? '••••••••' : field.value}
            </Text>
            <Text style={[styles.confidence, { color: field.manual ? colors.warning : field.confidence >= 95 ? colors.success : colors.warning }]}>
              {field.manual ? 'Not safe to auto-fill' : `${field.confidence}% match${field.sensitive ? ' · confirm to share' : ''}`}
            </Text>
            {field.source ? <Text style={[styles.fieldSource, { color: colors.mutedForeground }]}>{field.source}</Text> : null}
            {field.pasteInstruction ? <Text style={[styles.fieldInstruction, { color: colors.primary }]}>Paste here: {field.pasteInstruction}</Text> : null}
          </View>
          <Ionicons name={field.manual ? 'hand-left-outline' : 'chevron-forward'} size={18} color={colors.mutedForeground} />
        </Pressable>
      ))}
      <PrimaryButton label={isPreview ? 'Fill approved fields' : 'Start floating Smart Fill'} onPress={onFill} icon="sparkles" disabled={selectedCount === 0} />
      <Pressable onPress={onStop} style={styles.cancelLink}>
        <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel session</Text>
      </Pressable>
      <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>The website will not be submitted. Review the completed fields there before you continue.</Text>
    </>
  );
}

function FillingState({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.analyzingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.analyzingIcon, { backgroundColor: colors.accent }]}>
        <Ionicons name="sparkles" size={29} color={colors.primary} />
      </View>
      <Text style={[styles.analyzingTitle, { color: colors.foreground }]}>Filling approved fields…</Text>
      <Text style={[styles.analyzingDetail, { color: colors.mutedForeground }]}>Verifying each value as it is entered. Security controls and consent fields remain untouched.</Text>
    </View>
  );
}

function FilledState({
  summary,
  onReturn,
  onStop,
  colors,
}: {
  summary: { filled: number; skipped: number; manual: number };
  onReturn: () => void;
  onStop: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <>
      <View style={[styles.successPanel, { backgroundColor: colors.accent }]}>
        <View style={[styles.successIcon, { backgroundColor: colors.primary }]}><Ionicons name="checkmark" size={34} color={colors.primaryForeground} /></View>
        <Text style={[styles.successTitle, { color: colors.foreground }]}>Smart Fill complete</Text>
        <Text style={[styles.successDetail, { color: colors.mutedForeground }]}>Approved values were entered. Your form is waiting for your review.</Text>
        <View style={styles.summaryRow}>
          <SummaryStat value={summary.filled} label="filled" colors={colors} />
          <SummaryStat value={summary.skipped} label="skipped" colors={colors} />
          <SummaryStat value={summary.manual} label="manual" colors={colors} />
        </View>
      </View>
      <GlassCard>
        <View style={styles.noticeRow}>
          <Ionicons name="information-circle-outline" size={21} color={colors.primary} />
          <Text style={[styles.noticeText, { color: colors.foreground }]}>Please review the information on the website before submitting.</Text>
        </View>
        <PrimaryButton label="Return to form" onPress={onReturn} icon="arrow-forward" tone="light" />
      </GlassCard>
      <Pressable onPress={onStop} style={styles.cancelLink}>
        <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Stop Smart Fill</Text>
      </Pressable>
    </>
  );
}

function SummaryStat({ value, label, colors }: { value: number; label: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.summaryStat}>
      <Text style={[styles.summaryValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

function ErrorState({ message, onRetry, colors }: { message: string; onRetry: () => void; colors: ReturnType<typeof useColors> }) {
  return (
    <GlassCard style={styles.errorCard}>
      <View style={[styles.errorIcon, { backgroundColor: `${colors.destructive}20` }]}><Ionicons name="alert-circle-outline" size={27} color={colors.destructive} /></View>
      <Text style={[styles.errorTitle, { color: colors.foreground }]}>Smart Fill needs attention</Text>
      <Text style={[styles.errorDetail, { color: colors.mutedForeground }]}>{message}</Text>
      <PrimaryButton label="Try again" onPress={onRetry} icon="refresh" tone="light" />
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headingIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.5 },
  introCard: { padding: 20, minHeight: 342, marginBottom: 16 },
  sparkCircle: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 25 },
  introTitle: { color: '#f3f8f5', fontFamily: 'Inter_700Bold', fontSize: 27, lineHeight: 32, maxWidth: 270 },
  introDetail: { color: '#b8cdca', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginTop: 11 },
  browserPreview: { marginTop: 18, backgroundColor: '#173649', borderRadius: 16, padding: 13, minHeight: 94 },
  browserTop: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 11 },
  browserDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#7de2d1' },
  browserUrl: { color: '#a9c2c0', fontFamily: 'Inter_500Medium', fontSize: 10 },
  browserLineWide: { height: 7, width: '70%', borderRadius: 5, backgroundColor: '#2b5861', marginBottom: 7 },
  browserLine: { height: 7, width: '52%', borderRadius: 5, backgroundColor: '#2b5861', marginBottom: 7 },
  browserLineShort: { height: 7, width: '34%', borderRadius: 5, backgroundColor: '#2b5861' },
  browserFillBadge: { position: 'absolute', right: 13, bottom: 13, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 7, flexDirection: 'row', gap: 5, alignItems: 'center' },
  browserFillText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  rulesCard: { marginBottom: 18 },
  factRow: { minHeight: 82, borderWidth: 1, borderRadius: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 7, marginBottom: 17 },
  fact: { flex: 1, alignItems: 'center', gap: 3 },
  factValue: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  factLabel: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  factDivider: { width: 1, height: 42 },
  cardHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardHeading: { fontFamily: 'Inter_700Bold', fontSize: 15, marginBottom: 15 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 13 },
  ruleText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  disclaimer: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, textAlign: 'center', paddingHorizontal: 12, marginTop: 10 },
  setupLink: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 15 },
  setupLinkText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  setupHero: { padding: 20, minHeight: 208, marginBottom: 14 },
  setupHeroIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 19 },
  setupTitle: { color: '#f3f8f5', fontFamily: 'Inter_700Bold', fontSize: 26 },
  setupDetail: { color: '#b8cdca', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginTop: 7 },
  permissionCard: { flexDirection: 'row', gap: 13, marginBottom: 10, padding: 15 },
  permissionIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  permissionBody: { flex: 1 },
  permissionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  permissionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, flex: 1 },
  permissionDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, marginTop: 4 },
  permissionAction: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 9 },
  permissionActionText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  notice: { flexDirection: 'row', gap: 9, padding: 13, borderRadius: 16, marginVertical: 6 },
  noticeText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
  refreshButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 14 },
  refreshText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  backLink: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 14 },
  backLinkText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  sessionBar: { minHeight: 66, borderRadius: 19, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, marginBottom: 16 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveDot: { width: 9, height: 9, borderRadius: 5 },
  sessionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  sessionDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  sessionActions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  browserCard: { padding: 18, minHeight: 340, marginBottom: 16 },
  browserHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  browserHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  browserHeaderText: { color: '#b8cdca', fontFamily: 'Inter_500Medium', fontSize: 11 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#21485a', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 5 },
  livePillText: { color: '#b8f0dc', fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  browserCardTitle: { color: '#f3f8f5', fontFamily: 'Inter_700Bold', fontSize: 24, lineHeight: 29, marginTop: 25, maxWidth: 260 },
  browserCardDetail: { color: '#b8cdca', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 8 },
  formMock: { backgroundColor: '#f5f7f5', borderRadius: 17, padding: 14, marginTop: 18, minHeight: 144, position: 'relative' },
  formMockLabel: { color: '#667a7e', fontFamily: 'Inter_600SemiBold', fontSize: 9, marginBottom: 5 },
  formMockInput: { height: 29, borderRadius: 8, backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#dbe6e2', justifyContent: 'center', paddingHorizontal: 9, marginBottom: 10 },
  formMockValue: { color: '#13202b', fontFamily: 'Inter_500Medium', fontSize: 11 },
  formMockPlaceholder: { color: '#9db2b3', fontFamily: 'Inter_400Regular', fontSize: 10 },
  floatingPreview: { position: 'absolute', right: 12, bottom: 12, backgroundColor: '#7de2d1', borderRadius: 18, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 5 },
  floatingPreviewText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  floatingInstruction: { flexDirection: 'row', alignItems: 'center', gap: 11, borderRadius: 19, borderWidth: 1, padding: 13, marginTop: 2 },
  floatingInstructionIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  floatingInstructionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  floatingInstructionText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, marginTop: 3 },
  safeNote: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, marginTop: 11 },
  safeNoteText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
  previewStage: { position: 'relative', marginBottom: 16 },
  showFloatingButton: { alignSelf: 'flex-end', marginTop: -58, marginRight: 18, minHeight: 40, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7, zIndex: 5 },
  nativeOverlayStatus: { alignSelf: 'flex-end', marginTop: -58, marginRight: 18, minHeight: 40, borderRadius: 14, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7, zIndex: 5 },
  showFloatingText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  floatingControlWrap: { position: 'absolute', alignItems: 'flex-end', zIndex: 30 },
  floatingControl: { width: 58, height: 58, borderRadius: 29, borderWidth: 2, alignItems: 'center', justifyContent: 'center', shadowColor: '#000000', shadowOpacity: 0.28, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  floatingControlInner: { width: 43, height: 43, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  floatingLiveDot: { position: 'absolute', top: 1, right: 1, width: 11, height: 11, borderRadius: 6, borderWidth: 2 },
  floatingPanel: { width: 246, height: 248, borderRadius: 26, borderWidth: 1, padding: 4, marginBottom: 10, position: 'relative', shadowColor: '#000000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 12 },
  floatingPanelHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 3, paddingBottom: 4 },
  floatingPanelDot: { width: 6, height: 6, borderRadius: 3 },
  floatingPanelEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.4 },
  floatingPanelHint: { fontFamily: 'Inter_400Regular', fontSize: 9, marginLeft: 'auto' },
  floatingAction: { position: 'absolute', width: 82, height: 78, borderRadius: 18, alignItems: 'center', justifyContent: 'flex-start', gap: 4, padding: 0 },
  floatingActionTop: { left: 82, top: 7 },
  floatingActionLeft: { left: 8, top: 84 },
  floatingActionRight: { right: 8, top: 84 },
  floatingActionBottom: { left: 82, top: 163 },
  floatingActionIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', shadowColor: '#000000', shadowOpacity: 0.25, shadowRadius: 7, shadowOffset: { width: 0, height: 3 }, elevation: 7 },
  floatingActionLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9, lineHeight: 11, textAlign: 'center', maxWidth: 82 },
  fileBackdrop: { flex: 1, justifyContent: 'flex-end', padding: 12 },
  fileSheet: { maxHeight: '82%', borderRadius: 26, borderWidth: 1, padding: 16, shadowColor: '#000000', shadowOpacity: 0.24, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
  fileSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  fileSheetTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fileSheetIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  fileSheetEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.3 },
  fileSheetTitle: { fontFamily: 'Inter_700Bold', fontSize: 24, marginTop: 2 },
  fileFilters: { gap: 7, paddingBottom: 12 },
  fileFilter: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 11, paddingVertical: 7 },
  fileFilterText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  fileList: { maxHeight: 300 },
  fileListContent: { gap: 8, paddingBottom: 4 },
  fileRow: { minHeight: 62, borderRadius: 16, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fileRowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  fileRowTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  fileRowDetail: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  fileEmpty: { alignItems: 'center', gap: 7, paddingVertical: 28, paddingHorizontal: 20 },
  fileEmptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  fileEmptyDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, textAlign: 'center' },
  fileSelection: { borderWidth: 1, borderRadius: 16, padding: 10, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  fileSelectionLabel: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1.1 },
  fileSelectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginTop: 3 },
  fileUseButton: { minHeight: 38, borderRadius: 12, paddingHorizontal: 11, alignItems: 'center', justifyContent: 'center' },
  fileUseButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  fileSelectionToolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, marginBottom: 8 },
  fileSelectAllButton: { minHeight: 40, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11 },
  fileSelectAllText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  reviewFilesButton: { minHeight: 64, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, marginBottom: 12 },
  reviewFilesIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  reviewFilesTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  reviewFilesDetail: { fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  analyzingCard: { minHeight: 390, borderRadius: 25, borderWidth: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  analyzingIcon: { width: 68, height: 68, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  analyzingTitle: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  analyzingDetail: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8, maxWidth: 280 },
  analyzingSteps: { alignSelf: 'stretch', gap: 13, marginTop: 26 },
  analyzingStep: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNumber: { width: 22, height: 22, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  stepText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  reviewTop: { borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 11 },
  reviewIcon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  reviewTopTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  reviewTopDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 3 },
  count: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  reviewNotice: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, marginBottom: 13, alignItems: 'flex-start' },
  reviewNoticeText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
  analysisSummary: { borderRadius: 18, borderWidth: 1, padding: 13, marginBottom: 12 },
  analysisSummaryHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  analysisSummaryTitle: { fontFamily: 'Inter_700Bold', fontSize: 13, flex: 1 },
  analysisSummaryText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, marginTop: 7 },
  analysisManualText: { fontFamily: 'Inter_600SemiBold', fontSize: 10, lineHeight: 15, marginTop: 8 },
  fieldCard: { minHeight: 88, borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 10 },
  check: { width: 23, height: 23, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  manualPill: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 0.5, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 5 },
  fieldValue: { fontFamily: 'Inter_500Medium', fontSize: 14, marginTop: 5 },
  confidence: { fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 4 },
  fieldSource: { fontFamily: 'Inter_400Regular', fontSize: 9, marginTop: 3 },
  fieldInstruction: { fontFamily: 'Inter_600SemiBold', fontSize: 9, lineHeight: 14, marginTop: 4 },
  cancelLink: { alignItems: 'center', paddingVertical: 15 },
  cancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  successPanel: { minHeight: 305, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, marginBottom: 17 },
  successIcon: { width: 66, height: 66, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  successTitle: { fontFamily: 'Inter_700Bold', fontSize: 23 },
  successDetail: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  summaryRow: { flexDirection: 'row', gap: 28, marginTop: 23 },
  summaryStat: { alignItems: 'center' },
  summaryValue: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  summaryLabel: { fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 2 },
  noticeRow: { flexDirection: 'row', gap: 10, marginBottom: 19 },
  errorCard: { alignItems: 'center', padding: 25, marginTop: 8 },
  errorIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  errorTitle: { fontFamily: 'Inter_700Bold', fontSize: 19, textAlign: 'center' },
  errorDetail: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8, marginBottom: 20 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(7, 19, 28, 0.58)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, padding: 22, paddingBottom: 30 },
  modalIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  modalTitle: { fontFamily: 'Inter_700Bold', fontSize: 21 },
  modalDetail: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginTop: 7 },
  modalValue: { borderRadius: 15, padding: 13, marginTop: 17 },
  modalLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  modalValueText: { fontFamily: 'Inter_600SemiBold', fontSize: 15, marginTop: 5 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 17 },
  modalButton: { flex: 1, minHeight: 49, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  modalButtonText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});