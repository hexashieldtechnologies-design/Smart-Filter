import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, Modal } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard, PrimaryButton, SecurityBadge, VaultGradient } from '@/components/VaultUI';
import { useColors } from '@/hooks/useColors';
import { useVault } from '@/context/VaultContext';
import { smartFillNative, type SmartFillPermissions } from '@/services/smartFillNative';

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
};

const initialFields: Field[] = [
  { id: 'name', label: 'Full name', value: 'Anam Jasiya', confidence: 98, selected: true },
  { id: 'phone', label: 'Phone number', value: '+91 XXXXXXX210', confidence: 96, selected: true, sensitive: true },
  { id: 'email', label: 'Email address', value: 'anam@example.com', confidence: 99, selected: true, sensitive: true },
  { id: 'dob', label: 'Date of birth', value: 'Please confirm', confidence: 88, selected: false, sensitive: true },
  { id: 'pan', label: 'PAN', value: 'ABCDE•••••', confidence: 91, selected: false, sensitive: true },
  { id: 'employer', label: 'Current employer', value: 'Not matched safely', confidence: 72, selected: false, manual: true },
  { id: 'consent', label: 'Terms and consent', value: 'Review on website', confidence: 0, selected: false, manual: true },
];

export default function SmartFillScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { smartFillEnabled, addAudit } = useVault();
  const [phase, setPhase] = useState<SmartFillPhase>('start');
  const [permissions, setPermissions] = useState<SmartFillPermissions>({
    overlay: false,
    accessibility: false,
    nativeBridge: false,
  });
  const [fields, setFields] = useState<Field[]>(initialFields);
  const [pendingSensitive, setPendingSensitive] = useState<Field | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const refreshPermissions = useCallback(async () => {
    const next = await smartFillNative.getPermissions();
    setPermissions(next);
    return next;
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshPermissions();
    }, [refreshPermissions]),
  );

  const setupReady = permissions.overlay && permissions.accessibility;
  const isPreview = Platform.OS === 'web';
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
    setPhase('active');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const started = await smartFillNative.start();
    if (!started && !isPreview) {
      setPhase('error');
      setErrorMessage('The Android Smart Fill service could not be started. Check permissions and try again.');
      return;
    }
    await addAudit('Smart Fill started', 'Floating control is ready for supported forms', 'sparkles-outline');
  };

  const start = async () => {
    const currentPermissions = await refreshPermissions();
    if (!smartFillEnabled) {
      setPhase('error');
      setErrorMessage('Smart Fill is disabled in Security. Enable it before starting a session.');
      return;
    }
    if ((!currentPermissions.overlay || !currentPermissions.accessibility) && !isPreview) {
      setPhase('setup');
      return;
    }
    await activate();
  };

  const openPermission = async (kind: 'overlay' | 'accessibility') => {
    if (kind === 'overlay') {
      await smartFillNative.openOverlaySettings();
    } else {
      await smartFillNative.openAccessibilitySettings();
    }
    await refreshPermissions();
  };

  const analyze = async () => {
    setPhase('analyzing');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await new Promise<void>((resolve) => setTimeout(resolve, 700));
    setPhase('review');
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
    setFields(initialFields);
    setPhase('start');
    await addAudit('Smart Fill stopped', 'The floating control and temporary session were cleared', 'stop-circle-outline');
  };

  const fill = async () => {
    setPhase('filling');
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await new Promise<void>((resolve) => setTimeout(resolve, 650));
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPhase('filled');
    await addAudit('Smart Fill session completed', `${completedSummary.filled} approved fields filled`, 'sparkles-outline');
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

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: insets.bottom + 96,
        paddingHorizontal: 20,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>USER-CONTROLLED ASSISTANT</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Smart Fill</Text>
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
          onAnalyze={analyze}
          onPause={togglePaused}
          onStop={stop}
          colors={colors}
        />
      ) : null}
      {phase === 'analyzing' ? <AnalyzingState colors={colors} /> : null}
      {phase === 'review' ? (
        <ReviewState
          fields={fields}
          onToggle={toggleField}
          onFill={fill}
          onStop={stop}
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
          Smart Fill suggests approved values for supported forms. You review every field before anything is entered.
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
        If a website blocks automation, Secure Vault stops and asks you to continue manually.
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
  onPermission: (kind: 'overlay' | 'accessibility') => void;
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
            : 'Smart Fill only runs after you explicitly enable the Android access it needs.'}
        </Text>
      </VaultGradient>
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
        detail="Lets Smart Fill interact with compatible visible controls when explicitly requested."
        granted={permissions.accessibility}
        onPress={() => onPermission('accessibility')}
        colors={colors}
      />
      {!permissions.nativeBridge && !isPreview ? (
        <View style={[styles.notice, { backgroundColor: colors.secondary }]}>
          <Ionicons name="information-circle-outline" size={19} color={colors.primary} />
          <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
            Native overlay support is not available in this build. The settings buttons open your app settings so a native Android build can provide the bridge.
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
  onAnalyze,
  onPause,
  onStop,
  colors,
}: {
  paused: boolean;
  isPreview: boolean;
  onAnalyze: () => void;
  onPause: () => void;
  onStop: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <>
      <View style={[styles.sessionBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.live}>
          <View style={[styles.liveDot, { backgroundColor: paused ? colors.warning : colors.success }]} />
          <View>
            <Text style={[styles.sessionTitle, { color: colors.foreground }]}>Smart Fill {paused ? 'paused' : 'active'}</Text>
            <Text style={[styles.sessionDetail, { color: colors.mutedForeground }]}>Ready for a supported form</Text>
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
      <VaultGradient style={styles.browserCard}>
        <View style={styles.browserHeader}>
          <View style={styles.browserHeaderLeft}><Ionicons name="logo-chrome" size={18} color={colors.aqua} /><Text style={styles.browserHeaderText}>Chrome · supported form</Text></View>
          <View style={styles.livePill}><View style={[styles.liveDot, { backgroundColor: colors.success }]} /><Text style={styles.livePillText}>Ready</Text></View>
        </View>
        <Text style={styles.browserCardTitle}>A form is waiting for your review</Text>
        <Text style={styles.browserCardDetail}>
          {isPreview ? 'This controlled preview demonstrates the user-confirmed flow without accessing another app.' : 'Open Chrome manually, then use the floating control when a supported form is visible.'}
        </Text>
        <View style={styles.formMock}>
          <Text style={styles.formMockLabel}>Full name</Text>
          <View style={styles.formMockInput}><Text style={styles.formMockValue}>Anam Jasiya</Text></View>
          <Text style={styles.formMockLabel}>Email address</Text>
          <View style={styles.formMockInput}><Text style={styles.formMockPlaceholder}>Waiting for Smart Fill</Text></View>
          <View style={styles.floatingPreview}>
            <Ionicons name="sparkles" size={17} color={colors.midnight} />
            <Text style={[styles.floatingPreviewText, { color: colors.midnight }]}>Smart Fill</Text>
          </View>
        </View>
      </VaultGradient>
      <PrimaryButton label="Fill Form" onPress={onAnalyze} icon="sparkles" disabled={paused} />
      <View style={styles.safeNote}>
        <Ionicons name="hand-left-outline" size={17} color={colors.primary} />
        <Text style={[styles.safeNoteText, { color: colors.mutedForeground }]}>Smart Fill analyzes only after you press Fill Form. It never submits.</Text>
      </View>
    </>
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
  onToggle,
  onFill,
  onStop,
  colors,
}: {
  fields: Field[];
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
            <Text style={[styles.fieldValue, { color: colors.foreground }]}>{field.value}</Text>
            <Text style={[styles.confidence, { color: field.manual ? colors.warning : field.confidence >= 95 ? colors.success : colors.warning }]}>
              {field.manual ? 'Not safe to auto-fill' : `${field.confidence}% match${field.sensitive ? ' · confirm to share' : ''}`}
            </Text>
          </View>
          <Ionicons name={field.manual ? 'hand-left-outline' : 'chevron-forward'} size={18} color={colors.mutedForeground} />
        </Pressable>
      ))}
      <PrimaryButton label="Fill selected fields" onPress={onFill} icon="sparkles" disabled={selectedCount === 0} />
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
  safeNote: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, marginTop: 11 },
  safeNoteText: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17 },
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
  fieldCard: { minHeight: 88, borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 10 },
  check: { width: 23, height: 23, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  manualPill: { fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 0.5, paddingHorizontal: 5, paddingVertical: 3, borderRadius: 5 },
  fieldValue: { fontFamily: 'Inter_500Medium', fontSize: 14, marginTop: 5 },
  confidence: { fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 4 },
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