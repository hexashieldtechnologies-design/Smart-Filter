import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { ImageBackground, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandMark, SecurityBadge } from '@/components/VaultUI';
import { useColors } from '@/hooks/useColors';

const backgroundImage = require('../assets/images/get-started-bg.png');

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <ImageBackground
      source={backgroundImage}
      resizeMode="cover"
      style={styles.container}
      imageStyle={styles.backgroundImage}
    >
      <View style={[styles.imageTint, { backgroundColor: `${colors.midnight}18`, pointerEvents: 'none' }]} />
      <LinearGradient
        colors={[`${colors.midnight}52`, `${colors.midnight}0C`, `${colors.midnight}00`]}
        locations={[0, 0.3, 0.7]}
        style={[styles.topShade, { pointerEvents: 'none' }]}
      />
      <LinearGradient
        colors={[`${colors.midnight}00`, `${colors.midnight}42`, `${colors.midnight}C7`]}
        locations={[0.08, 0.56, 1]}
        style={[styles.bottomShade, { pointerEvents: 'none' }]}
      />

      <View style={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.topLine}>
          <View style={styles.brandLine}>
            <BrandMark size={42} />
            <View>
              <Text style={[styles.brandName, { color: colors.card }]}>secure vault</Text>
              <Text style={[styles.brandCaption, { color: `${colors.card}A8` }]}>YOUR PRIVATE SPACE</Text>
            </View>
          </View>
          <View style={[styles.headerTag, { backgroundColor: `${colors.midnight}8C`, borderColor: `${colors.aqua}52` }]}>
            <View style={[styles.liveDot, { backgroundColor: colors.aqua }]} />
            <Text style={[styles.headerTagText, { color: colors.card }]}>PROTECTED</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <View style={styles.sceneMeta}>
            <View style={[styles.sceneIcon, { backgroundColor: `${colors.midnight}B8`, borderColor: `${colors.aqua}66` }]}>
              <Ionicons name="lock-closed" size={17} color={colors.aqua} />
            </View>
            <View>
              <Text style={[styles.sceneMetaLabel, { color: colors.aqua }]}>BUILT FOR TRUST</Text>
              <Text style={[styles.sceneMetaValue, { color: `${colors.card}D1` }]}>Identity stays yours</Text>
            </View>
          </View>

          <View style={[styles.copyBlock, { backgroundColor: `${colors.midnight}8C`, borderColor: `${colors.aqua}2E` }]}>
            <Text style={[styles.kicker, { color: colors.aqua }]}>YOUR IDENTITY, HELD CLOSE</Text>
            <Text style={[styles.title, { color: colors.card }]}>Everything{"\n"}important, protected.</Text>
            <Text style={[styles.subtitle, { color: `${colors.card}CC` }]}>
              A private place for your documents, details, and the everyday moments Smart Fill makes easier.
            </Text>
          </View>

          <View style={styles.trustRow}>
            <SecurityBadge label="End-to-end protection" />
            <View style={[styles.trustChip, { backgroundColor: `${colors.midnight}A6`, borderColor: `${colors.card}2E` }]}>
              <Ionicons name="sparkles-outline" size={14} color={colors.gold} />
              <Text style={[styles.trustChipText, { color: `${colors.card}E6` }]}>Smart Fill ready</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            testID="button-get-started"
            onPress={() => router.push('/signup')}
            style={({ pressed }) => [
              styles.primary,
              {
                backgroundColor: colors.aqua,
                transform: [{ scale: pressed ? 0.985 : 1 }],
                opacity: pressed ? 0.9 : 1,
                ...(Platform.OS === 'web'
                  ? { boxShadow: `0px 8px 18px ${colors.midnight}3D` }
                  : {
                      shadowColor: colors.midnight,
                      shadowOpacity: 0.24,
                      shadowRadius: 18,
                      shadowOffset: { width: 0, height: 8 },
                      elevation: 6,
                    }),
              },
            ]}
          >
            <Text style={[styles.primaryText, { color: colors.midnight }]}>Get started</Text>
            <View style={[styles.primaryIcon, { backgroundColor: `${colors.midnight}16` }]}>
              <Ionicons name="arrow-forward" size={19} color={colors.midnight} />
            </View>
          </Pressable>
          <Pressable
            testID="button-sign-in"
            onPress={() => router.replace('/(tabs)')}
            style={({ pressed }) => [
              styles.signIn,
              { borderColor: `${colors.card}4A`, backgroundColor: `${colors.midnight}59`, opacity: pressed ? 0.72 : 1 },
            ]}
          >
            <Text style={[styles.signInText, { color: colors.card }]}>I already have an account</Text>
            <Ionicons name="chevron-forward" size={16} color={`${colors.card}B8`} />
          </Pressable>
          <Text style={[styles.legal, { color: `${colors.card}8F` }]}>
            By continuing, you agree to our Terms and Privacy Policy.
          </Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backgroundImage: { opacity: 0.96 },
  imageTint: { ...StyleSheet.absoluteFillObject },
  topShade: { ...StyleSheet.absoluteFillObject, height: '66%' },
  bottomShade: { ...StyleSheet.absoluteFillObject, top: '24%' },
  content: { flex: 1, paddingHorizontal: 22, justifyContent: 'space-between' },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandName: { fontFamily: 'Inter_600SemiBold', fontSize: 16, letterSpacing: 0.2 },
  brandCaption: { fontFamily: 'Inter_500Medium', fontSize: 8, letterSpacing: 1.45, marginTop: 2 },
  headerTag: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 7 },
  liveDot: { width: 6, height: 6, borderRadius: 3 },
  headerTagText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.1 },
  hero: { flex: 1, justifyContent: 'flex-end', paddingBottom: 22, paddingTop: 30 },
  sceneMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 26 },
  sceneIcon: { width: 37, height: 37, borderRadius: 13, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sceneMetaLabel: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1.25 },
  sceneMetaValue: { fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 3 },
  copyBlock: { alignItems: 'flex-start', borderWidth: 1, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 12, marginHorizontal: -10 },
  kicker: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.75, marginBottom: 10 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 36, lineHeight: 40, letterSpacing: -1.1 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 15, lineHeight: 22, maxWidth: 340, marginTop: 14 },
  trustRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  trustChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 },
  trustChipText: { fontFamily: 'Inter_500Medium', fontSize: 11 },
  actions: { gap: 10 },
  primary: { minHeight: 58, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  primaryText: { fontFamily: 'Inter_700Bold', fontSize: 16, letterSpacing: 0.1 },
  primaryIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  signIn: { minHeight: 50, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  signInText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  legal: { fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center', lineHeight: 15, paddingHorizontal: 18, marginTop: 2 },
});