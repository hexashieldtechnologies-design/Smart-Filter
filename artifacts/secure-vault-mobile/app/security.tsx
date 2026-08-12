import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard, PrimaryButton, ScoreRing, SecurityBadge } from '@/components/VaultUI';
import { useColors } from '@/hooks/useColors';
import { useVault } from '@/context/VaultContext';

export default function SecurityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { biometricEnabled, smartFillEnabled, toggleBiometric, toggleSmartFill, resetVault } = useVault();
  const row = (icon: keyof typeof Ionicons.glyphMap, title: string, detail: string, value: boolean, onToggle: () => void) => <View style={[styles.settingRow, { borderBottomColor: colors.border }]}><View style={[styles.settingIcon, { backgroundColor: colors.accent }]}><Ionicons name={icon} size={18} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.settingTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.settingDetail, { color: colors.mutedForeground }]}>{detail}</Text></View><Switch value={value} onValueChange={onToggle} trackColor={{ false: colors.secondary, true: colors.primary }} thumbColor={colors.card} /></View>;
  return <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}><View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color={colors.foreground} /></Pressable><Text style={[styles.headerTitle, { color: colors.foreground }]}>Security Center</Text><View style={{ width: 36 }} /></View><View style={styles.scoreHeader}><View style={{ flex: 1 }}><SecurityBadge label="Strong protection" /><Text style={[styles.title, { color: colors.foreground }]}>Your vault is in good shape.</Text><Text style={[styles.detail, { color: colors.mutedForeground }]}>Keep these protections on to make sensitive actions intentional.</Text></View><ScoreRing score={92} /></View><GlassCard style={{ paddingVertical: 4, marginBottom: 18 }}>{row('finger-print-outline', 'Biometric unlock', 'Require unlock before revealing details', biometricEnabled, toggleBiometric)}{row('sparkles-outline', 'Smart Fill permissions', 'Allow approved fields to be suggested', smartFillEnabled, toggleSmartFill)}{row('lock-closed-outline', 'Encrypted storage', 'Documents protected at rest', true, () => undefined)}</GlassCard><Text style={[styles.label, { color: colors.mutedForeground }]}>ACCOUNT CONTROLS</Text><Pressable onPress={() => router.push('/privacy')} style={[styles.actionRow, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="finger-print-outline" size={20} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[styles.actionTitle, { color: colors.foreground }]}>Privacy Center</Text><Text style={[styles.actionDetail, { color: colors.mutedForeground }]}>Data export, deletion, and permissions</Text></View><Ionicons name="chevron-forward" size={19} color={colors.mutedForeground} /></Pressable><Pressable onPress={() => router.push('/(tabs)/activity')} style={[styles.actionRow, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="time-outline" size={20} color={colors.primary} /><View style={{ flex: 1 }}><Text style={[styles.actionTitle, { color: colors.foreground }]}>Security activity</Text><Text style={[styles.actionDetail, { color: colors.mutedForeground }]}>Review important actions in your vault</Text></View><Ionicons name="chevron-forward" size={19} color={colors.mutedForeground} /></Pressable><PrimaryButton label="Log out of this device" onPress={() => Alert.alert('Log out?', 'Your vault will stay protected and can be reopened from the sign-in screen.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Log out', style: 'destructive', onPress: () => resetVault() }])} tone="light" icon="log-out-outline" /></ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52, marginBottom: 22 },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  scoreHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 23 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 24, lineHeight: 29, marginTop: 14, maxWidth: 220 },
  detail: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 8, maxWidth: 230 },
  settingRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1 },
  settingIcon: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  settingTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  settingDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  label: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5, marginBottom: 12 },
  actionRow: { minHeight: 70, borderRadius: 19, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, marginBottom: 10 },
  actionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  actionDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
});