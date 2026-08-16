import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="documents">
        <Icon sf={{ default: 'folder', selected: 'folder.fill' }} />
        <Label>Wallet</Label>
      </NativeTabs.Trigger>
       <NativeTabs.Trigger name="smart-fill">
        <Icon sf={{ default: 'wand.and.stars', selected: 'wand.and.stars.inverse' }} />
        <Label>Smart Fill</Label>
      </NativeTabs.Trigger>
       <NativeTabs.Trigger name="activity">
        <Icon sf={{ default: 'clock', selected: 'clock.fill' }} />
        <Label>Activity</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.card,
          borderTopWidth: isWeb ? 1 : 0,
          borderTopColor: colors.border,
          elevation: 0,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={90} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.card }]} />
          ) : null,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => isIOS ? <SymbolView name="house" tintColor={color} size={23} /> : <Feather name="home" size={21} color={color} /> }} />
      <Tabs.Screen name="documents" options={{ title: 'Wallet', tabBarIcon: ({ color }) => isIOS ? <SymbolView name="folder" tintColor={color} size={23} /> : <Feather name="folder" size={21} color={color} /> }} />
      <Tabs.Screen name="smart-fill" options={{ title: 'Smart Fill', tabBarIcon: ({ color }) => isIOS ? <SymbolView name="wand.and.stars" tintColor={color} size={23} /> : <Feather name="edit-3" size={21} color={color} /> }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity', tabBarIcon: ({ color }) => isIOS ? <SymbolView name="clock" tintColor={color} size={23} /> : <Feather name="clock" size={21} color={color} /> }} />
    </Tabs>
  );
}

export default function TabLayout() {
  return isLiquidGlassAvailable() ? <NativeTabLayout /> : <ClassicTabLayout />;
}
