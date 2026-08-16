import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { DocumentCard, GlassCard, SectionTitle, SecurityBadge } from '@/components/VaultUI';
import { useColors } from '@/hooks/useColors';
import { useVault } from '@/context/VaultContext';

const profileSetupBackground = require('../../assets/images/profile-setup-bg.png');

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { documents, profile, auditItems } = useVault();
  const verifiedCount = documents.filter((item) => item.status === 'Verified').length;
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 96, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
         <View style={styles.headingRow}><View style={[styles.headingIcon, { backgroundColor: colors.primary }]}><Ionicons name="home-outline" size={19} color={colors.primaryForeground} /></View><View><Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR PRIVATE SPACE</Text><Text style={[styles.greeting, { color: colors.foreground }]}>Good evening, Anam</Text></View></View>
        <View style={styles.headerActions}><Pressable onPress={() => router.push('/security')} style={[styles.circleButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} /></Pressable><View style={[styles.avatar, { backgroundColor: colors.navy }]}><Text style={[styles.avatarText, { color: colors.aqua }]}>A</Text></View></View>
      </View>
      <ImageBackground source={profileSetupBackground} resizeMode="cover" imageStyle={styles.heroImage} style={styles.heroCard}>
         <LinearGradient colors={[`${colors.midnight}ED`, `${colors.navy}D9`, `${colors.midnight}F0`]} style={StyleSheet.absoluteFill} />
         <View style={styles.heroTop}><SecurityBadge label="Wallet protected" /><Ionicons name="ellipsis-horizontal" size={22} color={colors.aqua} /></View>
         <Text style={[styles.heroTitle, { color: colors.card }]}>Everything important,{"\n"}in one calm place.</Text>
         <Text style={[styles.heroDetail, { color: `${colors.card}CC` }]}>Your identity wallet is active and watching over {verifiedCount} verified documents.</Text>
         <Pressable onPress={() => router.push('/security')} style={styles.heroLink}><Text style={[styles.heroLinkText, { color: colors.aqua }]}>View security center</Text><Ionicons name="arrow-forward" size={16} color={colors.aqua} /></Pressable>
      </ImageBackground>
      <View style={styles.snapshotRow}>
        <Snapshot label="Verified" value={`${verifiedCount}/${documents.length}`} icon="checkmark-circle-outline" />
        <Snapshot label="Profile" value={profile ? 'Ready' : 'Add details'} icon="person-outline" />
        <Snapshot label="Smart Fill" value="On" icon="sparkles-outline" />
      </View>
      <SectionTitle title="Your documents" action="See all" onAction={() => router.push('/(tabs)/documents')} />
      <View>{documents.slice(0, 4).map((document) => <DocumentCard key={document.id} document={document} onPress={() => router.push({ pathname: '/document/[id]', params: { id: document.id } })} onUpload={() => router.push('/(tabs)/documents')} />)}</View>
      <Pressable testID="button-home-profile" onPress={() => router.push('/profile')} style={({ pressed }) => [styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.86 : 1 }]}>
        <View style={[styles.profileIcon, { backgroundColor: colors.accent }]}><Ionicons name="person-outline" size={21} color={colors.primary} /></View>
        <View style={{ flex: 1 }}><Text style={[styles.profileTitle, { color: colors.foreground }]}>{profile ? 'Complete profile saved' : 'Add your complete profile'}</Text><Text style={[styles.profileDetail, { color: colors.mutedForeground }]}>{profile ? 'Personal and contact details are encrypted locally.' : 'Keep your name, family, contact, address, and identity details in one place.'}</Text></View>
        <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
      </Pressable>
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

function Snapshot({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  const colors = useColors();
  return <View style={[styles.snapshot, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[styles.snapshotIcon, { backgroundColor: colors.accent }]}><Ionicons name={icon} size={15} color={colors.primary} /></View><View><Text style={[styles.snapshotLabel, { color: colors.mutedForeground }]}>{label}</Text><Text style={[styles.snapshotValue, { color: colors.foreground }]}>{value}</Text></View></View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headingIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.4, marginBottom: 6 },
  greeting: { fontFamily: 'Inter_700Bold', fontSize: 25, letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  circleButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  heroCard: { padding: 20, minHeight: 238, justifyContent: 'space-between', marginBottom: 12, borderRadius: 28, overflow: 'hidden' },
  heroImage: { opacity: 0.55 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitle: { fontFamily: 'Inter_700Bold', fontSize: 25, lineHeight: 30, marginTop: 20 },
  heroDetail: { fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 19, maxWidth: 290, marginTop: 7 },
  heroLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16 },
  heroLinkText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  snapshotRow: { flexDirection: 'row', gap: 8, marginBottom: 28 },
  snapshot: { flex: 1, minHeight: 72, borderRadius: 17, borderWidth: 1, padding: 10, gap: 7 },
  snapshotIcon: { width: 25, height: 25, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  snapshotLabel: { fontFamily: 'Inter_500Medium', fontSize: 10 },
  snapshotValue: { fontFamily: 'Inter_700Bold', fontSize: 12, marginTop: 2 },
  smartFillCard: { minHeight: 86, borderRadius: 22, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, marginBottom: 28 },
  smartIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  smartTitle: { fontFamily: 'Inter_700Bold', fontSize: 16, marginBottom: 3 },
  smartDetail: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 17, maxWidth: 220 },
  profileCard: { minHeight: 82, borderRadius: 22, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  profileIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  profileTitle: { fontFamily: 'Inter_700Bold', fontSize: 14, marginBottom: 3 },
  profileDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, maxWidth: 245 },
  activityRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 11 },
  activityIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  activityTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  activityDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  activityTime: { fontFamily: 'Inter_500Medium', fontSize: 10 },
});