import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DocumentCard, EmptyState, GlassCard, SecurityBadge } from '@/components/VaultUI';
import { useColors } from '@/hooks/useColors';
import { useVault, type VaultDocument } from '@/context/VaultContext';

export default function DocumentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { documents, addDocument, addAudit } = useVault();

  const uploadDocument = async (document: VaultDocument) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.65,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (!asset) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addDocument({
        ...document,
        status: 'Processing',
        identifier: 'Review pending',
        updated: 'Just now',
        imageUri: asset.uri,
        imageData: asset.base64 ?? undefined,
        contentType: asset.mimeType ?? 'image/jpeg',
      });
      await addAudit('Document uploaded', `${document.label} is being processed securely`, 'cloud-upload-outline');
      Alert.alert('Upload received', 'The document is saved in your test vault. Review is required before any field is used.');
    } catch {
      Alert.alert('Upload failed', 'The document could not be saved to the test vault. Please check the API server and try again.');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 96, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View><Text style={[styles.eyebrow, { color: colors.primary }]}>THE VAULT</Text><Text style={[styles.title, { color: colors.foreground }]}>Your documents</Text></View><Pressable onPress={() => router.push('/security')} style={[styles.circleButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="settings-outline" size={20} color={colors.foreground} /></Pressable></View>
      <GlassCard style={styles.summary}><View style={[styles.summaryIcon, { backgroundColor: colors.accent }]}><Ionicons name="lock-closed" size={20} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.summaryTitle, { color: colors.foreground }]}>Private and encrypted</Text><Text style={[styles.summaryDetail, { color: colors.mutedForeground }]}>Only you can reveal sensitive details.</Text></View><SecurityBadge label="Protected" /></GlassCard>
      <Text style={[styles.helper, { color: colors.mutedForeground }]}>IDENTITY DOCUMENTS</Text>
      {documents.map((document) => <DocumentCard key={document.id} document={document} onPress={() => router.push({ pathname: '/document/[id]', params: { id: document.id } })} onUpload={() => uploadDocument(document)} />)}
      <Pressable onPress={() => uploadDocument({ id: `other-${Date.now()}`, type: 'Other', label: 'New document', status: 'Not added', identifier: 'Ready when you are', updated: '—', icon: 'document-attach-outline', color: 'aqua' })} style={({ pressed }) => [styles.addButton, { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 }]}><Ionicons name="add" size={20} color={colors.primary} /><Text style={[styles.addText, { color: colors.foreground }]}>Add another document</Text></Pressable>
      <View style={styles.footnote}><Ionicons name="information-circle-outline" size={16} color={colors.mutedForeground} /><Text style={[styles.footnoteText, { color: colors.mutedForeground }]}>Raw images are minimized and never appear in your activity history.</Text></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.6, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.5 },
  circleButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 28 },
  summaryIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  summaryDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  helper: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5, marginBottom: 12 },
  addButton: { minHeight: 58, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  addText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  footnote: { flexDirection: 'row', gap: 8, marginTop: 18, paddingHorizontal: 4 },
  footnoteText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, flex: 1 },
});