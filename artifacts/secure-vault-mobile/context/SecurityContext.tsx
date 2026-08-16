import { BackHandler, Platform, StyleSheet, Text, View } from 'react-native';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PrimaryButton } from '@/components/VaultUI';
import { useColors } from '@/hooks/useColors';
import { useVault } from '@/context/VaultContext';
import { secureVaultNative } from '@/services/secureVaultNative';

type SecurityState = 'checking' | 'locked' | 'unlocked' | 'blocked';

type SecurityContextValue = {
  state: SecurityState;
  authenticate: (reason?: string) => Promise<boolean>;
  lock: () => Promise<void>;
};

const SecurityContext = createContext<SecurityContextValue | null>(null);

export function SecurityProvider({ children }: { children: React.ReactNode }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { ready, hasOnboarded, biometricEnabled } = useVault();
  const [state, setState] = useState<SecurityState>(Platform.OS === 'android' ? 'checking' : 'unlocked');
  const startupComplete = useRef(false);
  const authInFlight = useRef(false);

  const lock = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    setState('locked');
    await secureVaultNative.setSecureWindow(true);
  }, []);

  const authenticate = useCallback(async (reason = 'Authenticate to unlock Secure Vault') => {
    if (Platform.OS !== 'android') {
      setState('unlocked');
      return true;
    }
    if (authInFlight.current) return false;
    authInFlight.current = true;
    try {
      const authenticated = await secureVaultNative.authenticate(reason);
      setState(authenticated ? 'unlocked' : 'locked');
      if (authenticated) await secureVaultNative.setSecureWindow(true);
      return authenticated;
    } finally {
      authInFlight.current = false;
    }
  }, []);

  const runStartupSecurity = useCallback(async () => {
    setState('checking');
    await secureVaultNative.setSecureWindow(true);
    const integrity = await secureVaultNative.checkDeviceIntegrity();
    // Expo Go is intentionally allowed to use the controlled preview. A
    // release Android build without the native security bridge must fail
    // closed rather than silently falling back to an unsecured vault.
    if (!integrity.supported && !__DEV__) {
      setState('blocked');
      return;
    }
    if (integrity.compromised) {
      setState('blocked');
      return;
    }
    if (!biometricEnabled) {
      setState('unlocked');
      return;
    }
    setState('locked');
    await authenticate();
  }, [authenticate, biometricEnabled]);

  useEffect(() => {
    if (!ready || Platform.OS !== 'android') return;
    if (!hasOnboarded) {
      startupComplete.current = false;
      setState('unlocked');
      return;
    }
    if (!startupComplete.current) {
      startupComplete.current = true;
      void runStartupSecurity();
    }
  }, [hasOnboarded, ready, runStartupSecurity]);

  const value = useMemo(() => ({ state, authenticate, lock }), [authenticate, lock, state]);

  if (state === 'blocked') {
    return <IntegrityBlockedScreen colors={colors} insets={insets} />;
  }
  if (state === 'checking') {
    return <SecurityLoadingScreen colors={colors} insets={insets} />;
  }
  if (state === 'locked') {
    return (
      <SecurityContext.Provider value={value}>
        <LockedScreen colors={colors} insets={insets} onAuthenticate={() => authenticate()} />
      </SecurityContext.Provider>
    );
  }

  return <SecurityContext.Provider value={value}>{children}</SecurityContext.Provider>;
}

export function useSecurity() {
  const value = useContext(SecurityContext);
  if (!value) throw new Error('useSecurity must be used inside SecurityProvider');
  return value;
}

function SecurityLoadingScreen({ colors, insets }: { colors: ReturnType<typeof useColors>; insets: ReturnType<typeof useSafeAreaInsets> }) {
  return (
    <View style={[styles.screen, { backgroundColor: colors.midnight, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <Ionicons name="shield-checkmark-outline" size={48} color={colors.aqua} />
      <Text style={[styles.title, { color: colors.foreground }]}>Checking device security</Text>
      <Text style={[styles.detail, { color: colors.mutedForeground }]}>Your vault stays hidden until the security check is complete.</Text>
    </View>
  );
}

function LockedScreen({
  colors,
  insets,
  onAuthenticate,
}: {
  colors: ReturnType<typeof useColors>;
  insets: ReturnType<typeof useSafeAreaInsets>;
  onAuthenticate: () => void;
}) {
  return (
    <View style={[styles.screen, { backgroundColor: colors.midnight, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={[styles.lockIcon, { backgroundColor: colors.navy }]}>
        <Ionicons name="lock-closed" size={40} color={colors.aqua} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>Secure Vault is locked</Text>
      <Text style={[styles.detail, { color: colors.mutedForeground }]}>Authenticate with your fingerprint, face, or Android device credential to continue.</Text>
      <PrimaryButton label="Authenticate to continue" onPress={onAuthenticate} icon="finger-print-outline" />
    </View>
  );
}

function IntegrityBlockedScreen({ colors, insets }: { colors: ReturnType<typeof useColors>; insets: ReturnType<typeof useSafeAreaInsets> }) {
  return (
    <View style={[styles.screen, { backgroundColor: colors.midnight, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={[styles.lockIcon, { backgroundColor: '#5a2e36' }]}>
        <Ionicons name="shield-outline" size={40} color={colors.destructive} />
      </View>
      <Text style={[styles.title, { color: colors.foreground }]}>This device is not supported</Text>
      <Text style={[styles.detail, { color: colors.mutedForeground }]}>Secure Vault cannot open on a device that does not meet its security requirements.</Text>
      {Platform.OS === 'android' ? <PrimaryButton label="Close Secure Vault" onPress={() => BackHandler.exitApp()} tone="light" icon="close-outline" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, gap: 16 },
  lockIcon: { width: 94, height: 94, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 25, textAlign: 'center' },
  detail: { fontFamily: 'Inter_400Regular', fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 330, marginBottom: 10 },
});