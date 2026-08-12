import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BrandMark, SecurityBadge } from '@/components/VaultUI';
import { useColors } from '@/hooks/useColors';

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  return (
    <LinearGradient colors={[colors.midnight, colors.navy]} style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 18 }]}>
        <View style={styles.topLine}>
          <View style={styles.brandLine}><BrandMark size={40} /><Text style={styles.brandName}>secure vault</Text></View>
          <Ionicons name="ellipsis-horizontal" size={22} color={colors.aqua} />
        </View>
        <View style={styles.hero}>
          <View style={styles.orbit} />
          <View style={styles.heroShield}><Ionicons name="shield-checkmark" size={66} color={colors.aqua} /></View>
          <Text style={styles.kicker}>PRIVATE BY DESIGN</Text>
          <Text style={styles.title}>Your identity,{"\n"}held beautifully.</Text>
          <Text style={styles.subtitle}>A secure space for the documents and details that make you, you.</Text>
          <SecurityBadge label="End-to-end protection" />
        </View>
        <View style={styles.actions}>
          <Pressable testID="button-get-started" onPress={() => router.push('/signup')} style={({ pressed }) => [styles.primary, { backgroundColor: colors.aqua, opacity: pressed ? 0.84 : 1 }]}>
            <Text style={[styles.primaryText, { color: colors.midnight }]}>Get started</Text>
            <Ionicons name="arrow-forward" size={20} color={colors.midnight} />
          </Pressable>
          <Pressable testID="button-sign-in" onPress={() => router.replace('/(tabs)')} style={({ pressed }) => [styles.signIn, { opacity: pressed ? 0.7 : 1 }]}>
            <Text style={styles.signInText}>I already have an account</Text>
          </Pressable>
          <Text style={styles.legal}>By continuing, you agree to our Terms and Privacy Policy.</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between' },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandLine: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandName: { color: '#f3f8f5', fontFamily: 'Inter_600SemiBold', fontSize: 16, letterSpacing: 0.4 },
  hero: { alignItems: 'flex-start', position: 'relative', paddingTop: 34 },
  orbit: { position: 'absolute', width: 240, height: 240, borderRadius: 120, borderWidth: 1, borderColor: '#2b6570', top: -18, left: 52, transform: [{ rotate: '18deg' }] },
  heroShield: { width: 130, height: 130, borderRadius: 44, backgroundColor: '#21485a', alignItems: 'center', justifyContent: 'center', marginBottom: 34, shadowColor: '#7de2d1', shadowOpacity: 0.2, shadowRadius: 30, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  kicker: { color: '#7de2d1', fontFamily: 'Inter_700Bold', fontSize: 11, letterSpacing: 2.1, marginBottom: 12 },
  title: { color: '#f3f8f5', fontFamily: 'Inter_700Bold', fontSize: 39, lineHeight: 44, letterSpacing: -1.2 },
  subtitle: { color: '#b8cdca', fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24, maxWidth: 320, marginTop: 16, marginBottom: 18 },
  actions: { gap: 12 },
  primary: { minHeight: 58, borderRadius: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryText: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  signIn: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  signInText: { color: '#d4e5df', fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  legal: { color: '#789594', fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center', lineHeight: 15, paddingHorizontal: 20, marginTop: 4 },
});