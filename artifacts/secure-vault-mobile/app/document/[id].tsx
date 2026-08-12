import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassCard, PrimaryButton, SecurityBadge, StatusPill } from '@/components/VaultUI';
import { useColors } from '@/hooks/useColors';
import { useVault } from '@/context/VaultContext';

export default function DocumentDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { documents, deleteDocument } = useVault();
  const document = documents.find((item) => item.id === id) ?? documents[0];
  const [unlocked, setUnlocked] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  if (!document) return null;
  const reveal = () => { setUnlocked(true); setShowDetails(true); };
  const remove = () => Alert.alert('Delete this document?', 'This removes the document from your vault. This action cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { await deleteDocument(document.id); router.back(); } }]);
  return <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 30, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}><View style={styles.header}><Pressable onPress={() => router.back()} style={styles.back}><Ionicons name="arrow-back" size={22} color={colors.foreground} /></Pressable><Text style={[styles.headerTitle, { color: colors.foreground }]}>Document</Text><Pressable onPress={remove} style={styles.back}><Ionicons name="trash-outline" size={20} color={colors.destructive} /></Pressable></View><View style={[styles.preview, { backgroundColor: document.color === 'aqua' ? colors.navy : colors.midnight }]}><Ionicons name={document.icon as keyof typeof Ionicons.glyphMap} size={55} color={document.color === 'gold' ? colors.gold : colors.aqua} /><View style={styles.previewLines}><View style={styles.lineLong} /><View style={styles.lineShort} /><View style={styles.lineMedium} /></View><View style={styles.previewLock}><Ionicons name={unlocked ? 'lock-open-outline' : 'lock-closed-outline'} size={18} color={colors.aqua} /></View></View><View style={styles.docHeader}><View><Text style={[styles.type, { color: colors.mutedForeground }]}>{document.type}</Text><Text style={[styles.title, { color: colors.foreground }]}>{document.label}</Text></View><StatusPill status={document.status} /></View><GlassCard style={styles.infoCard}><View style={styles.infoRow}><Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Identifier</Text><Text style={[styles.infoValue, { color: colors.foreground }]}>{unlocked ? document.id === 'aadhaar' ? '4678 9012 1234' : document.id === 'pan' ? 'ABCDE1234F' : document.identifier : document.identifier}</Text></View><View style={styles.infoRow}><Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Last updated</Text><Text style={[styles.infoValue, { color: colors.foreground }]}>{document.updated}</Text></View><View style={styles.infoRow}><Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>Protection</Text><SecurityBadge label="Biometric required" /></View></GlassCard>{unlocked ? <Pressable onPress={() => setShowDetails(!showDetails)} style={[styles.hideButton, { borderColor: colors.border }]}><Ionicons name={showDetails ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.primary} /><Text style={[styles.hideText, { color: colors.foreground }]}>{showDetails ? 'Hide sensitive details' : 'Show sensitive details'}</Text></Pressable> : <View style={[styles.lockedPanel, { backgroundColor: colors.accent }]}><Ionicons name="finger-print-outline" size={25} color={colors.primary} /><Text style={[styles.lockedTitle, { color: colors.foreground }]}>Sensitive content is locked</Text><Text style={[styles.lockedDetail, { color: colors.mutedForeground }]}>Unlock to reveal the full identifier and approved fields.</Text><PrimaryButton label="Unlock document" onPress={reveal} icon="lock-open-outline" /></View>}<PrimaryButton label="Delete document" onPress={remove} tone="light" icon="trash-outline" /></ScrollView>;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  back: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  preview: { minHeight: 220, borderRadius: 28, alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden', marginBottom: 20 },
  previewLines: { gap: 7, marginTop: 15, opacity: 0.7 },
  lineLong: { width: 130, height: 8, borderRadius: 4, backgroundColor: '#9fcac3' },
  lineShort: { width: 85, height: 7, borderRadius: 4, backgroundColor: '#4e7b82' },
  lineMedium: { width: 105, height: 7, borderRadius: 4, backgroundColor: '#4e7b82' },
  previewLock: { position: 'absolute', right: 18, top: 18, width: 35, height: 35, borderRadius: 12, backgroundColor: '#21485a', alignItems: 'center', justifyContent: 'center' },
  docHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 14 },
  type: { fontFamily: 'Inter_600SemiBold', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.3, marginBottom: 6 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 26 },
  infoCard: { gap: 0, marginBottom: 15 },
  infoRow: { minHeight: 55, borderBottomWidth: 1, borderBottomColor: '#dbe6e2', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  infoLabel: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  infoValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  lockedPanel: { borderRadius: 22, padding: 18, gap: 9, marginBottom: 12 },
  lockedTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  lockedDetail: { fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginBottom: 4 },
  hideButton: { minHeight: 54, borderWidth: 1, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  hideText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});