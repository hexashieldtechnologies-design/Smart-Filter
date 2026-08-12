import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard } from '@/components/VaultUI';
import { useColors } from '@/hooks/useColors';
import { useVault } from '@/context/VaultContext';

export default function ActivityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { auditItems } = useVault();
  return <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 96, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}><View style={styles.header}><View><Text style={[styles.eyebrow, { color: colors.primary }]}>AUDIT TRAIL</Text><Text style={[styles.title, { color: colors.foreground }]}>Activity</Text></View><Pressable onPress={() => router.push('/security')} style={[styles.circleButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} /></Pressable></View><GlassCard style={styles.info}><Ionicons name="eye-off-outline" size={19} color={colors.primary} /><Text style={[styles.infoText, { color: colors.mutedForeground }]}>Security events are recorded without storing your document values.</Text></GlassCard><Text style={[styles.label, { color: colors.mutedForeground }]}>RECENT EVENTS</Text>{auditItems.map((item) => <View key={item.id} style={styles.item}><View style={styles.timeline}><View style={[styles.dot, { backgroundColor: colors.primary }]} /><View style={[styles.line, { backgroundColor: colors.border }]} /></View><View style={{ flex: 1, paddingBottom: 22 }}><Text style={[styles.time, { color: colors.mutedForeground }]}>{item.time}</Text><Text style={[styles.itemTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.detail, { color: colors.mutedForeground }]}>{item.detail}</Text></View><View style={[styles.itemIcon, { backgroundColor: colors.accent }]}><Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={17} color={colors.primary} /></View></View>)}</ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.6, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28 },
  circleButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  info: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 27 },
  infoText: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, flex: 1 },
  label: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5, marginBottom: 18 },
  item: { flexDirection: 'row', gap: 13 },
  timeline: { width: 12, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  line: { width: 1, flex: 1, marginTop: 6 },
  time: { fontFamily: 'Inter_500Medium', fontSize: 11, marginBottom: 5 },
  itemTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  detail: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  itemIcon: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});