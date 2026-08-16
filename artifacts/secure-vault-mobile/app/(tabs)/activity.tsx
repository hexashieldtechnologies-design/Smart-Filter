import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useVault } from '@/context/VaultContext';

export default function ActivityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { auditItems } = useVault();
  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 96, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headingRow}>
          <View style={[styles.headingIcon, { backgroundColor: colors.primary }]}><Ionicons name="time-outline" size={19} color={colors.primaryForeground} /></View>
          <View><Text style={[styles.eyebrow, { color: colors.primary }]}>AUDIT TRAIL</Text><Text style={[styles.title, { color: colors.foreground }]}>Activity</Text></View>
        </View>
        <Pressable accessibilityLabel="Open security center" onPress={() => router.push('/security')} style={[styles.circleButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} /></Pressable>
      </View>
      <View style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.heroTop, { backgroundColor: colors.accent }]}>
          <View style={[styles.heroIcon, { backgroundColor: colors.primary }]}><Ionicons name="pulse-outline" size={22} color={colors.primaryForeground} /></View>
          <View style={{ flex: 1 }}><Text style={[styles.heroTitle, { color: colors.foreground }]}>Your security history</Text><Text style={[styles.heroDetail, { color: colors.mutedForeground }]}>A private record of actions inside your vault.</Text></View>
          <View style={[styles.eventCount, { backgroundColor: colors.card }]}><Text style={[styles.eventCountValue, { color: colors.primary }]}>{auditItems.length}</Text><Text style={[styles.eventCountLabel, { color: colors.mutedForeground }]}>events</Text></View>
        </View>
        <View style={styles.heroFooter}><Ionicons name="lock-closed-outline" size={15} color={colors.success} /><Text style={[styles.heroFooterText, { color: colors.mutedForeground }]}>Values and document contents are never shown here.</Text></View>
      </View>
      <Text style={[styles.label, { color: colors.mutedForeground }]}>RECENT EVENTS</Text>
      {auditItems.map((item, index) => (
        <View key={item.id} style={styles.item}>
          <View style={styles.timeline}><View style={[styles.dot, { backgroundColor: index === 0 ? colors.primary : colors.aqua }]} />{index < auditItems.length - 1 ? <View style={[styles.line, { backgroundColor: colors.border }]} /> : null}</View>
          <View style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={{ flex: 1 }}><Text style={[styles.time, { color: colors.primary }]}>{item.time}</Text><Text style={[styles.itemTitle, { color: colors.foreground }]}>{item.title}</Text><Text style={[styles.detail, { color: colors.mutedForeground }]}>{item.detail}</Text></View>
            <View style={[styles.itemIcon, { backgroundColor: colors.accent }]}><Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={17} color={colors.primary} /></View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headingIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.6, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28 },
  circleButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { borderWidth: 1, borderRadius: 22, overflow: 'hidden', marginBottom: 27 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14 },
  heroIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  heroDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, marginTop: 3 },
  eventCount: { minWidth: 48, alignItems: 'center', borderRadius: 13, paddingVertical: 7, paddingHorizontal: 6 },
  eventCountValue: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  eventCountLabel: { fontFamily: 'Inter_500Medium', fontSize: 9, marginTop: 1 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 15, paddingVertical: 11 },
  heroFooterText: { fontFamily: 'Inter_400Regular', fontSize: 10 },
  label: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5, marginBottom: 18 },
  item: { flexDirection: 'row', gap: 9, minHeight: 88 },
  timeline: { width: 12, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  line: { width: 2, flex: 1, marginTop: 6 },
  eventCard: { flex: 1, borderWidth: 1, borderRadius: 18, padding: 13, flexDirection: 'row', gap: 10, marginBottom: 10 },
  time: { fontFamily: 'Inter_600SemiBold', fontSize: 10, marginBottom: 5 },
  itemTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  detail: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  itemIcon: { width: 37, height: 37, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});