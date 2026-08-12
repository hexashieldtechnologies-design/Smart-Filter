import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard, PrimaryButton } from '@/components/VaultUI';
import { useColors } from '@/hooks/useColors';

export default function PrivacyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const privacyAction = (title: string, detail: string, icon: keyof typeof Ionicons.glyphMap, destructive = false) => <Pressable onPress={() => Alert.alert(title, detail)} style={[styles.action, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.icon, { backgroundColor: destructive ? `${colors.destructive}18` : colors.accent }]}><Ionicons name={icon} size={19} color={destructive ? colors.destructive : colors.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.actionTitle, { color: colors.foreground }]}>{title}</Text><Text style={[styles.actionDetail, { color: colors.mutedForeground }]}>{detail}</Text></View><Ionicons name="chevron-forward" size={18} color={colors.mutedForeground} /></Pressable>;
  return <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}><View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color={colors.foreground} /></Pressable><Text style={[styles.headerTitle, { color: colors.foreground }]}>Privacy Center</Text><View style={{ width: 36 }} /></View><GlassCard dark style={styles.hero}><Ionicons name="finger-print-outline" size={30} color={colors.aqua} /><Text style={styles.heroTitle}>You choose what leaves the vault.</Text><Text style={styles.heroDetail}>Secure Vault only suggests information you have approved. You can view, export, or delete your data whenever you want.</Text></GlassCard><Text style={[styles.label, { color: colors.mutedForeground }]}>YOUR CONTROLS</Text>{privacyAction('View stored data', 'See which details are available to Smart Fill', 'eye-outline')}{privacyAction('Export personal data', 'Download a copy of your approved profile', 'download-outline')}{privacyAction('Manage sessions', 'Revoke access on other devices', 'phone-portrait-outline')}{privacyAction('Delete documents', 'Remove identity files from your vault', 'trash-outline', true)}<PrimaryButton label="Understand how privacy works" onPress={() => Alert.alert('Privacy by design', 'Sensitive values are masked in the normal UI, excluded from analytics, and never included in the security activity feed.')} icon="information-circle-outline" tone="light" /></ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  hero: { backgroundColor: '#183b4d', borderColor: '#2b6570', minHeight: 220, marginBottom: 27 },
  heroTitle: { color: '#f3f8f5', fontFamily: 'Inter_700Bold', fontSize: 24, lineHeight: 29, marginTop: 23, maxWidth: 290 },
  heroDetail: { color: '#b8cdca', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginTop: 10 },
  label: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5, marginBottom: 12 },
  action: { minHeight: 72, borderRadius: 19, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 14, marginBottom: 10 },
  icon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  actionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  actionDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
});