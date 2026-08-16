import * as Haptics from 'expo-haptics';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DocumentCard, EmptyState, GlassCard, SecurityBadge } from '@/components/VaultUI';
import { useColors } from '@/hooks/useColors';
import { useVault, type VaultDocument } from '@/context/VaultContext';

const countryGlobeArt = require('../../assets/images/country-globe-art.png');

export default function DocumentsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { documents, profile, addDocument, addAudit } = useVault();

  const uploadDocument = async (document: VaultDocument) => {
    try {
      const isResume = document.id.toLowerCase().includes('resume') || document.label.toLowerCase().includes('resume');
      let uri: string | undefined;
      let contentType: string | undefined;
      let fileName: string | undefined;

      if (isResume) {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/pdf',
          copyToCacheDirectory: true,
          multiple: false,
        });
        if (result.canceled) return;
        const asset = result.assets[0];
        if (!asset) return;
        uri = asset.uri;
        contentType = asset.mimeType ?? 'application/pdf';
        fileName = asset.name;
      } else {
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 1,
        });
        if (result.canceled) return;
        const asset = result.assets[0];
        if (!asset) return;
        uri = asset.uri;
        contentType = asset.mimeType ?? 'image/jpeg';
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await addDocument({
        ...document,
        status: 'Processing',
        identifier: 'Review pending',
        updated: 'Just now',
        imageUri: uri,
        contentType,
        ...(fileName ? { identifier: fileName } : {}),
      });
      await addAudit('Document uploaded', `${document.label} is being stored securely on this device`, 'cloud-upload-outline');
      Alert.alert(
        'Saved on this device',
        isResume
          ? 'Your PDF resume is stored in Secure Vault’s private app storage and is ready for Smart Fill review.'
          : 'The document file is stored in Secure Vault’s private app storage. Review is required before any field is used.',
      );
    } catch {
      Alert.alert('Upload failed', 'The document could not be copied into private device storage. Please try again.');
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 96, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
      <View style={styles.header}><View style={styles.headingRow}><View style={[styles.headingIcon, { backgroundColor: colors.primary }]}><Ionicons name="wallet-outline" size={19} color={colors.primaryForeground} /></View><View><Text style={[styles.eyebrow, { color: colors.primary }]}>YOUR WALLET</Text><Text style={[styles.title, { color: colors.foreground }]}>Identity wallet</Text></View></View><Pressable accessibilityLabel="Open security center" onPress={() => router.push('/security')} style={[styles.circleButton, { backgroundColor: colors.card, borderColor: colors.border }]}><Ionicons name="settings-outline" size={20} color={colors.foreground} /></Pressable></View>
      <ImageBackground source={countryGlobeArt} resizeMode="cover" imageStyle={styles.walletImage} style={styles.walletBanner}>
        <View style={[styles.walletBannerShade, { backgroundColor: `${colors.midnight}B8` }]} />
        <Text style={[styles.walletBannerEyebrow, { color: colors.aqua }]}>ONE WALLET. EVERY IDENTITY.</Text>
        <Text style={[styles.walletBannerTitle, { color: colors.card }]}>Keep your important numbers ready, never exposed.</Text>
      </ImageBackground>
      <GlassCard style={styles.summary}><View style={[styles.summaryIcon, { backgroundColor: colors.accent }]}><Ionicons name="lock-closed" size={20} color={colors.primary} /></View><View style={{ flex: 1 }}><Text style={[styles.summaryTitle, { color: colors.foreground }]}>Private and encrypted</Text><Text style={[styles.summaryDetail, { color: colors.mutedForeground }]}>Only you can reveal sensitive details.</Text></View><SecurityBadge label="Protected" /></GlassCard>
      <Text style={[styles.helper, { color: colors.mutedForeground }]}>IDENTITY DOCUMENTS</Text>
      {documents.map((document) => <DocumentCard key={document.id} document={document} onPress={() => router.push({ pathname: '/document/[id]', params: { id: document.id } })} onUpload={() => uploadDocument(document)} />)}
      <Pressable onPress={() => uploadDocument({ id: `other-${Date.now()}`, type: 'Other', label: 'New document', status: 'Not added', identifier: 'Ready when you are', updated: '—', icon: 'document-attach-outline', color: 'aqua' })} style={({ pressed }) => [styles.addButton, { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 }]}><Ionicons name="add" size={20} color={colors.primary} /><Text style={[styles.addText, { color: colors.foreground }]}>Add another document</Text></Pressable>
      <Pressable testID="button-complete-profile" onPress={() => router.push('/profile')} style={({ pressed }) => [styles.profileCard, { backgroundColor: colors.accent, borderColor: colors.primary, opacity: pressed ? 0.86 : 1 }]}>
        <View style={[styles.profileIcon, { backgroundColor: colors.primary }]}><Ionicons name="person-outline" size={22} color={colors.primaryForeground} /></View>
        <View style={{ flex: 1 }}><Text style={[styles.profileTitle, { color: colors.foreground }]}>{profile ? 'Edit complete profile' : 'Add complete profile'}</Text><Text style={[styles.profileDetail, { color: colors.mutedForeground }]}>{profile ? 'Your details are saved locally and encrypted.' : 'Name, family, contact, address, and identity details.'}</Text></View>
        <Ionicons name="arrow-forward-circle" size={27} color={colors.primary} />
      </Pressable>
      <View style={styles.footnote}><Ionicons name="information-circle-outline" size={16} color={colors.mutedForeground} /><Text style={[styles.footnoteText, { color: colors.mutedForeground }]}>Uploaded files are stored in this device’s private app storage. File contents never appear in your activity history.</Text></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headingRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headingIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.6, marginBottom: 7 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 28, letterSpacing: -0.5 },
  walletBanner: { minHeight: 142, borderRadius: 24, overflow: 'hidden', justifyContent: 'flex-end', padding: 16, marginBottom: 14 },
  walletImage: { opacity: 0.96 },
  walletBannerShade: { ...StyleSheet.absoluteFillObject },
  walletBannerEyebrow: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.4, marginBottom: 7 },
  walletBannerTitle: { fontFamily: 'Inter_700Bold', fontSize: 20, lineHeight: 25, maxWidth: 300 },
  circleButton: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 28 },
  summaryIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  summaryTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  summaryDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  helper: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.5, marginBottom: 12 },
  addButton: { minHeight: 58, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  addText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  profileCard: { minHeight: 86, borderRadius: 22, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14 },
  profileIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  profileTitle: { fontFamily: 'Inter_700Bold', fontSize: 15, marginBottom: 3 },
  profileDetail: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16, maxWidth: 245 },
  footnote: { flexDirection: 'row', gap: 8, marginTop: 18, paddingHorizontal: 4 },
  footnoteText: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17, flex: 1 },
});