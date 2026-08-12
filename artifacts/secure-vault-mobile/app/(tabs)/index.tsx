import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DocumentCard, GlassCard, SectionTitle, SecurityBadge, VaultGradient } from '@/components/VaultUI';
import { useColors } from '@/hooks/useColors';
import { useVault } from '@/context/VaultContext';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { documents, auditItems } = useVault();
  const verifiedCount = documents.filter((item) => item.status === 'Verified').length;
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 96, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View><Text style={[styles.eyebrow, { color: colors.primary }]}>WEDNESDAY, 12 AUG</Text><Text style={[styles.greeting, { color: colors.foreground }]}>Good evening, Anam</Text></View>
        <View style={styles.headerActions}><Pressable onPress={() => router.push('/security')} style={[styles.circleButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} /></Pressable><View style={[styles.avatar, { backgroundColor: colors.navy }]}><Text style={[styles.avatarText, { color: colors.aqua }]}>A</Text></View></View>
      </View>
      <VaultGradient style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroTop}><SecurityBadge label="Vault protected" /><Ionicons name="ellipsis-horizontal" size={22} color={colors.aqua} /></View>
        <Text style={styles.heroTitle}>Everything important,{"\n"}in one calm place.</Text>
        <Text style={styles.heroDetail}>Your personal identity vault is active and watching over {verifiedCount} verified documents.</Text>
        <Pressable onPress={() => router.push('/security')} style={styles.heroLink}><Text style={[styles.heroLinkText, { color: colors.aqua }]}>View security center</Text><Ionicons name="arrow-forward" size={16} color={colors.aqua} /></Pressable>
      </VaultGradient>
      <SectionTitle title="Your documents" action="See all" onAction={() => router.push('/(tabs)/documents')} />
      <View>{documents.slice(0, 4).map((document) => <DocumentCard key={document.id} document={document} onPress={() => router.push({ pathname: '/document/[id]', params: { id: document.id } })} onUpload={() => router.push('/(tabs)/documents')} />)}</View>
      <Pressable onPress={() => router.push('/(tabs)/smart-fill')} style={({ pressed }) => [styles.smartFillCard, { backgroundColor: colors.accent, borderColor: colors.primary, opacity: pressed ? 0.86 : 1 }]}>
        <View style={[styles.smartIcon, { backgroundColor: colors.primary }]}><Ionicons name="sparkles" size={24} color={colors.primaryForeground} /></View>
        <View style={{ flex: 1 }}><Text style={[styles.smartTitle, { color: colors.foreground }]}>Smart Fill</Text><Text style={[styles.smartDetail, { color: colors.mutedForeground }]}>Use approved details to complete supported forms.</Text></View>
        <Ionicons name="arrow-forward-circle" size={28} color={colors.primary} />
      </Pressable>
      <SectionTitle title="Recent activity" action="View all" onAction={() => router.push('/(tabs)/activity')} />
      <GlassCard style={{ paddingVertical: 5 }}>{auditItems.slice(0, 2).map((item, index) => <View key={item.id} style={[styles.activityRow, index === 0 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}><View style={[styles.activityIcon, { backgroundColor: colors.accent }]}><Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={17} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.activityTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.activityDetail, { color: colors.mutedForeground }]}>{item.detail}</Text></View><Text style={[styles.activityTime, { color: colors.mutedForeground }]}>{item.time.replace('Today, ', '')}</Text></View>)}</GlassCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4, marginBottom: 6 },
  greeting: { fontFamily: 'Inter_700Bold', fontSize: 25, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  circleButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  heroCard: { padding: 20, minHeight: 238, justifyContent: 'space-between', marginBottom: 28 },
  heroGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: '#2c6c72', opacity: 0.34, right: -68, top: -58 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitle: { color: '#f3f8f5', fontFamily: 'Inter_700Bold', fontSize: 25, lineHeight: 30, marginTop: 20 },
  heroDetail: { color: '#b8cdca', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, maxWidth: 290, marginTop: 7 },
  heroLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  heroLinkText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  smartFillCard: { minHeight: 86, borderRadius: 22, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, marginBottom: 28 },
  smartIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  smartTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 3 },
  smartDetail: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, maxWidth: 220 },
  activityRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11 },
  activityIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activityTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  activityDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  activityTime: { fontFamily: 'Inter_500Medium', fontSize: 10 },
});