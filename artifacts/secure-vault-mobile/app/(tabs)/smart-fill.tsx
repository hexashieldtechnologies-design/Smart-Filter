import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard, PrimaryButton, SecurityBadge, VaultGradient } from '@/components/VaultUI';
import { useColors } from '@/hooks/useColors';
import { useVault } from '@/context/VaultContext';

type Field = { id: string; label: string; value: string; confidence: string; sensitive?: boolean; selected: boolean };
const initialFields: Field[] = [
  { id: 'name', label: 'Full name', value: 'Anam Jasiya', confidence: '98% match', selected: true },
  { id: 'phone', label: 'Phone number', value: '+91 XXXXXXX210', confidence: '96% match', selected: true },
  { id: 'email', label: 'Email address', value: 'anam@example.com', confidence: '99% match', selected: true },
  { id: 'pan', label: 'PAN', value: 'ABCDE•••••', confidence: '91% match', sensitive: true, selected: false },
];

export default function SmartFillScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { smartFillEnabled, addAudit } = useVault();
  const [phase, setPhase] = useState<'start' | 'review' | 'filled'>('start');
  const [paused, setPaused] = useState(false);
  const [fields, setFields] = useState<Field[]>(initialFields);

  const start = async () => { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setPhase('review'); };
  const fill = async () => { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); setPhase('filled'); await addAudit('Smart Fill session completed', `${fields.filter((item) => item.selected).length} approved fields filled`, 'sparkles-outline'); };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 96, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View><Text style={[styles.eyebrow, { color: colors.primary }]}>USER-CONTROLLED ASSISTANT</Text><Text style={[styles.title, { color: colors.foreground }]}>Smart Fill</Text></View><SecurityBadge label={phase === 'review' ? paused ? 'Paused' : 'Running' : 'Safe by default'} /></View>
      {phase === 'start' ? <StartState enabled={smartFillEnabled} onStart={start} colors={colors} /> : null}
      {phase === 'review' ? <ReviewState fields={fields} paused={paused} setPaused={setPaused} setFields={setFields} onFill={fill} onStop={() => setPhase('start')} colors={colors} /> : null}
      {phase === 'filled' ? <FilledState onReturn={() => setPhase('review')} colors={colors} /> : null}
    </ScrollView>
  );
}

function StartState({ enabled, onStart, colors }: { enabled: boolean; onStart: () => void; colors: ReturnType<typeof useColors> }) {
  return <><VaultGradient style={styles.introCard}><View style={[styles.sparkCircle, { backgroundColor: colors.aqua }]}><Ionicons name="sparkles" size={27} color={colors.midnight} /></View><Text style={styles.introTitle}>Forms, with your permission.</Text><Text style={styles.introDetail}>Smart Fill suggests approved values for supported forms. You review every field before anything is entered.</Text><Pressable style={styles.fakeSite}><Ionicons name="globe-outline" size={17} color={colors.aqua} /><Text style={styles.fakeSiteText}>Ready for a supported website</Text><Ionicons name="chevron-forward" size={18} color={colors.aqua} /></Pressable></VaultGradient><GlassCard style={styles.rulesCard}><Text style={[styles.cardHeading, { color: colors.foreground }]}>Always in your control</Text>{[['eye-outline', 'Review before filling'], ['hand-left-outline', 'Never submits for you'], ['stop-circle-outline', 'Pause or stop anytime'], ['shield-outline', 'No CAPTCHA or security bypass']].map(([icon, text]) => <View key={text} style={styles.ruleRow}><Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.primary} /><Text style={[styles.ruleText, { color: colors.foreground }]}>{text}</Text></View>)}</GlassCard><PrimaryButton label={enabled ? 'Start a Smart Fill session' : 'Enable Smart Fill in Security'} onPress={enabled ? onStart : () => undefined} icon="arrow-forward" disabled={!enabled} /><Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>If a website blocks automation, Secure Vault stops and asks you to continue manually.</Text></>;
}

function ReviewState({ fields, paused, setPaused, setFields, onFill, onStop, colors }: { fields: Field[]; paused: boolean; setPaused: (value: boolean) => void; setFields: React.Dispatch<React.SetStateAction<Field[]>>; onFill: () => void; onStop: () => void; colors: ReturnType<typeof useColors> }) {
  return <><View style={styles.sessionBar}><View style={styles.live}><View style={[styles.liveDot, { backgroundColor: paused ? colors.warning : colors.success }]} /><View><Text style={[styles.sessionTitle, { color: colors.foreground }]}>Smart Fill {paused ? 'paused' : 'running'}</Text><Text style={[styles.sessionDetail, { color: colors.mutedForeground }]}>example-form.com</Text></View></View><View style={styles.sessionActions}><Pressable onPress={() => setPaused(!paused)} hitSlop={8}><Ionicons name={paused ? 'play' : 'pause'} size={20} color={colors.foreground} /></Pressable><Pressable onPress={onStop} hitSlop={8}><Ionicons name="stop" size={20} color={colors.destructive} /></Pressable></View></View><View style={styles.reviewHeading}><View><Text style={[styles.titleSmall, { color: colors.foreground }]}>Review before filling</Text><Text style={[styles.muted, { color: colors.mutedForeground }]}>Select only what you want to share.</Text></View><Text style={[styles.count, { color: colors.primary }]}>{fields.filter((item) => item.selected).length}/{fields.length}</Text></View>{fields.map((field) => <Pressable key={field.id} onPress={() => setFields((current) => current.map((item) => item.id === field.id ? { ...item, selected: !item.selected } : item))} style={[styles.fieldCard, { backgroundColor: colors.card, borderColor: field.sensitive ? colors.gold : colors.border }]}><View style={[styles.check, { backgroundColor: field.selected ? colors.primary : colors.secondary, borderColor: field.selected ? colors.primary : colors.border }]}>{field.selected ? <Ionicons name="checkmark" size={15} color={colors.primaryForeground} /> : null}</View><View style={{ flex: 1 }}><View style={styles.fieldLabelRow}><Text style={[styles.fieldLabel, { color: colors.foreground }]}>{field.label}</Text>{field.sensitive ? <Ionicons name="warning-outline" size={15} color={colors.warning} /> : null}</View><Text style={[styles.fieldValue, { color: colors.foreground }]}>{field.value}</Text><Text style={[styles.confidence, { color: field.sensitive ? colors.warning : colors.success }]}>{field.confidence}{field.sensitive ? ' · explicit confirmation required' : ''}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} /></Pressable>)}<PrimaryButton label="Fill selected fields" onPress={onFill} icon="sparkles" disabled={paused || fields.every((item) => !item.selected)} /><Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>The website will not be submitted. Review the completed fields there before you continue.</Text></>;
}

function FilledState({ onReturn, colors }: { onReturn: () => void; colors: ReturnType<typeof useColors> }) {
  return <><View style={[styles.successPanel, { backgroundColor: colors.accent }]}><View style={[styles.successIcon, { backgroundColor: colors.primary }]}><Ionicons name="checkmark" size={34} color={colors.primaryForeground} /></View><Text style={[styles.successTitle, { color: colors.foreground }]}>Fields filled safely</Text><Text style={[styles.successDetail, { color: colors.mutedForeground }]}>3 approved fields were entered. Your form is waiting for your review.</Text></View><GlassCard><View style={styles.noticeRow}><Ionicons name="information-circle-outline" size={21} color={colors.primary} /><Text style={[styles.noticeText, { color: colors.foreground }]}>Please review the information on the website before submitting.</Text></View><PrimaryButton label="Return to form" onPress={onReturn} icon="arrow-forward" tone="light" /></GlassCard></>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.2, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.5 },
  introCard: { padding: 20, minHeight: 286, marginBottom: 16 },
  sparkCircle: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  introTitle: { color: '#f3f8f5', fontFamily: 'Inter_700Bold', fontSize: 27, lineHeight: 32, maxWidth: 270 },
  introDetail: { color: '#b8cdca', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginTop: 11 },
  fakeSite: { minHeight: 47, borderRadius: 16, backgroundColor: '#21485a', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 8, marginTop: 18 },
  fakeSiteText: { color: '#e0f4ee', fontFamily: 'Inter_600SemiBold', fontSize: 12, flex: 1 },
  rulesCard: { marginBottom: 18 },
  cardHeading: { fontFamily: 'Inter_700Bold', fontSize: 15, marginBottom: 15 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 13 },
  ruleText: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  disclaimer: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, textAlign: 'center', paddingHorizontal: 12, marginTop: -4 },
  sessionBar: { minHeight: 66, borderRadius: 19, borderWidth: 1, borderColor: '#dbe6e2', backgroundColor: '#ffffff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, marginBottom: 25 },
  live: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  liveDot: { width: 9, height: 9, borderRadius: 5 },
  sessionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  sessionDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  sessionActions: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  reviewHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 12 },
  titleSmall: { fontFamily: 'Inter_700Bold', fontSize: 19 },
  muted: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  count: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  fieldCard: { minHeight: 88, borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, marginBottom: 10 },
  check: { width: 23, height: 23, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  fieldValue: { fontFamily: 'Inter_500Medium', fontSize: 14, marginTop: 5 },
  confidence: { fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 4 },
  successPanel: { minHeight: 260, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30, marginBottom: 17 },
  successIcon: { width: 66, height: 66, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  successTitle: { fontFamily: 'Inter_700Bold', fontSize: 23 },
  successDetail: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  noticeRow: { flexDirection: 'row', gap: 10, marginBottom: 19 },
  noticeText: { fontFamily: 'Inter_500Medium', fontSize: 13, lineHeight: 19, flex: 1 },
});