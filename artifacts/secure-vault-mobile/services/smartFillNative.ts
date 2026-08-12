import { Linking, NativeModules, Platform } from 'react-native';

export type SmartFillPermissions = {
  overlay: boolean;
  accessibility: boolean;
  nativeBridge: boolean;
};

type NativeSmartFillModule = {
  checkOverlayPermission?: () => Promise<boolean>;
  requestOverlayPermission?: () => Promise<void>;
  checkAccessibilityPermission?: () => Promise<boolean>;
  openAccessibilitySettings?: () => Promise<void>;
  startSmartFill?: () => Promise<boolean>;
  pauseSmartFill?: () => Promise<void>;
  resumeSmartFill?: () => Promise<void>;
  stopSmartFill?: () => Promise<void>;
};

const nativeModule = NativeModules.SmartFillModule as NativeSmartFillModule | undefined;

const isAndroid = Platform.OS === 'android';
const isWebPreview = Platform.OS === 'web';

export const smartFillNative = {
  get hasNativeBridge() {
    return isAndroid && Boolean(nativeModule);
  },

  async getPermissions(): Promise<SmartFillPermissions> {
    if (isWebPreview) {
      return { overlay: true, accessibility: true, nativeBridge: false };
    }

    if (!isAndroid || !nativeModule) {
      return { overlay: false, accessibility: false, nativeBridge: false };
    }

    const [overlay, accessibility] = await Promise.all([
      nativeModule.checkOverlayPermission?.() ?? Promise.resolve(false),
      nativeModule.checkAccessibilityPermission?.() ?? Promise.resolve(false),
    ]);

    return { overlay, accessibility, nativeBridge: true };
  },

  async openOverlaySettings() {
    if (nativeModule?.requestOverlayPermission) {
      await nativeModule.requestOverlayPermission();
      return;
    }

    await Linking.openSettings();
  },

  async openAccessibilitySettings() {
    if (nativeModule?.openAccessibilitySettings) {
      await nativeModule.openAccessibilitySettings();
      return;
    }

    await Linking.openSettings();
  },

  async start() {
    if (isWebPreview) return true;
    return (await nativeModule?.startSmartFill?.()) ?? false;
  },

  async pause() {
    await nativeModule?.pauseSmartFill?.();
  },

  async resume() {
    await nativeModule?.resumeSmartFill?.();
  },

  async stop() {
    await nativeModule?.stopSmartFill?.();
  },
};