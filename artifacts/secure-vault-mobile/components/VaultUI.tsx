import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { VaultDocument } from '@/context/VaultContext';

export function BrandMark({ size = 42 }: { size?: number }) {
  const colors = useColors();
  return (
    <View style={[styles.brandMark, { width: size, height: size, borderRadius: size * 0.31, backgroundColor: colors.midnight }]}>
      <Ionicons name="shield-checkmark" size={size * 0.48} color={colors.aqua} />
    </View>
  );
}

export function ScreenShell({ children, scroll = true, contentStyle, dark = false }: { children: React.ReactNode; scroll?: boolean; contentStyle?: object; dark?: boolean }) {
  const colors = useColors();
  const background = dark ? colors.midnight : colors.background;
  const Component = scroll ? require('react-native').ScrollView : View;
  return (
    <Component
      style={{ flex: 1, backgroundColor: background }}
      contentContainerStyle={scroll ? [styles.screenContent, contentStyle] : undefined}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </Component>
  );
}

export function GlassCard({ children, style, dark = false }: { children: React.ReactNode; style?: object; dark?: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.glassCard, { backgroundColor: dark ? colors.navy : colors.card, borderColor: dark ? colors.border : colors.border }, style]}>
      {children}
    </View>
  );
}

export function PrimaryButton({ label, onPress, icon, disabled = false, tone = 'primary' }: { label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; disabled?: boolean; tone?: 'primary' | 'light' }) {
  const colors = useColors();
  const dark = tone === 'primary';
  return (
    <Pressable testID={`button-${label.toLowerCase().replace(/\s/g, '-')}`} onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.primaryButton, { backgroundColor: dark ? colors.primary : colors.secondary, opacity: disabled ? 0.5 : pressed ? 0.84 : 1 }]}>
      <Text style={[styles.buttonText, { color: dark ? colors.primaryForeground : colors.secondaryForeground }]}>{label}</Text>
      {icon ? <Ionicons name={icon} size={18} color={dark ? colors.primaryForeground : colors.secondaryForeground} /> : null}
    </Pressable>
  );
}

export function SectionTitle({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.sectionTitle}>
      <Text style={[styles.sectionHeading, { color: colors.foreground }]}>{title}</Text>
      {action ? <Pressable onPress={onAction} hitSlop={8}><Text style={[styles.sectionAction, { color: colors.primary }]}>{action}</Text></Pressable> : null}
    </View>
  );
}

export function StatusPill({ status }: { status: VaultDocument['status'] }) {
  const colors = useColors();
  const isVerified = status === 'Verified';
  const isProcessing = status === 'Processing';
  return (
    <View style={[styles.statusPill, { backgroundColor: isVerified ? colors.accent : colors.secondary }]}>
      <Ionicons name={isVerified ? 'checkmark-circle' : isProcessing ? 'time-outline' : 'add-circle-outline'} size={13} color={isVerified ? colors.success : colors.mutedForeground} />
      <Text style={[styles.statusText, { color: isVerified ? colors.success : colors.mutedForeground }]}>{status}</Text>
    </View>
  );
}

export function DocumentCard({ document, onPress, onUpload }: { document: VaultDocument; onPress: () => void; onUpload: () => void }) {
  const colors = useColors();
  const iconColor = document.color === 'aqua' ? colors.primary : document.color === 'gold' ? colors.gold : document.color === 'coral' ? colors.destructive : colors.navy;
  return (
    <Pressable onPress={document.status === 'Not added' ? onUpload : onPress} style={({ pressed }) => [styles.documentCard, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.88 : 1 }]}>
      <View style={[styles.docIcon, { backgroundColor: `${iconColor}20` }]}>
        <Ionicons name={document.icon as keyof typeof Ionicons.glyphMap} size={25} color={iconColor} />
      </View>
      <View style={styles.docBody}>
        <Text style={[styles.docType, { color: colors.mutedForeground }]}>{document.type}</Text>
        <Text style={[styles.docLabel, { color: colors.foreground }]}>{document.label}</Text>
        <Text style={[styles.docIdentifier, { color: colors.mutedForeground }]}>{document.identifier}</Text>
      </View>
      <View style={styles.docRight}>
        <StatusPill status={document.status} />
        <Ionicons name={document.status === 'Not added' ? 'arrow-up-circle-outline' : 'chevron-forward'} size={20} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

export function SecurityBadge({ label = 'Protected' }: { label?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.securityBadge, { backgroundColor: colors.accent }]}>
      <Ionicons name="shield-checkmark-outline" size={14} color={colors.success} />
      <Text style={[styles.securityBadgeText, { color: colors.success }]}>{label}</Text>
    </View>
  );
}

export function EmptyState({ title, detail, icon = 'folder-open-outline' }: { title: string; detail: string; icon?: keyof typeof Ionicons.glyphMap }) {
  const colors = useColors();
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}><Ionicons name={icon} size={26} color={colors.primary} /></View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.emptyDetail, { color: colors.mutedForeground }]}>{detail}</Text>
    </View>
  );
}

export function ScoreRing({ score }: { score: number }) {
  const colors = useColors();
  return (
    <View style={[styles.scoreRing, { borderColor: colors.primary }]}>
      <Text style={[styles.scoreValue, { color: colors.foreground }]}>{score}%</Text>
      <Text style={[styles.scoreCaption, { color: colors.mutedForeground }]}>secure</Text>
    </View>
  );
}

export function LoadingState() {
  const colors = useColors();
  return <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={{ color: colors.mutedForeground }}>Unlocking your vault…</Text></View>;
}

export function VaultGradient({ children, style }: { children: React.ReactNode; style?: object }) {
  const colors = useColors();
  return <LinearGradient colors={[colors.midnight, colors.navy]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.gradient, style]}>{children}</LinearGradient>;
}

export const styles = StyleSheet.create({
  brandMark: { alignItems: 'center', justifyContent: 'center' },
  screenContent: { paddingHorizontal: 20, paddingBottom: 42 },
  glassCard: { borderWidth: 1, borderRadius: 24, padding: 18 },
  primaryButton: { minHeight: 54, borderRadius: 18, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  buttonText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionHeading: { fontFamily: 'Inter_700Bold', fontSize: 19 },
  sectionAction: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 99, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  documentCard: { minHeight: 100, borderRadius: 22, borderWidth: 1, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 13, marginBottom: 10 },
  docIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  docBody: { flex: 1, gap: 2 },
  docType: { fontFamily: 'Inter_500Medium', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.7 },
  docLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  docIdentifier: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  docRight: { alignItems: 'flex-end', gap: 12 },
  securityBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 99 },
  securityBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 28, gap: 8 },
  emptyIcon: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 3 },
  emptyTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  emptyDetail: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', lineHeight: 20 },
  scoreRing: { width: 104, height: 104, borderRadius: 52, borderWidth: 8, alignItems: 'center', justifyContent: 'center' },
  scoreValue: { fontFamily: 'Inter_700Bold', fontSize: 24 },
  scoreCaption: { fontFamily: 'Inter_500Medium', fontSize: 11, marginTop: -2 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  gradient: { borderRadius: 28, overflow: 'hidden' },
});