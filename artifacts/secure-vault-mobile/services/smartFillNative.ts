import { Linking, NativeModules, Platform } from 'react-native';
import { secureVaultNative } from '@/services/secureVaultNative';

export type SmartFillPermissions = {
  overlay: boolean;
  accessibility: boolean;
  autofill: boolean;
  nativeBridge: boolean;
};

export type SmartFillExtraction = {
  key: string;
  value: string;
  confidence: number;
  source: string;
};

type NativeSmartFillModule = {
  checkOverlayPermission?: () => Promise<boolean>;
  requestOverlayPermission?: () => Promise<void>;
  checkAccessibilityPermission?: () => Promise<boolean>;
  openAccessibilitySettings?: () => Promise<void>;
  checkAutofillPermission?: () => Promise<boolean>;
  openAutofillSettings?: () => Promise<void>;
  startSmartFill?: (fields: SmartFillNativeField[], credentialAuthorized?: boolean) => Promise<boolean>;
  isSmartFillActive?: () => Promise<boolean>;
  pauseSmartFill?: () => Promise<void>;
  resumeSmartFill?: () => Promise<void>;
  stopSmartFill?: () => Promise<void>;
  setVaultFiles?: (files: NativeVaultFileSummary[]) => Promise<void>;
  analyzeDocument?: (uri: string, documentType: string) => Promise<SmartFillExtraction[]>;
  consumePendingScreenshot?: () => Promise<{
    base64: string;
    mimeType: string;
  } | null>;
};

export type NativeVaultFileSummary = {
  id: string;
  label: string;
  type: string;
  status: string;
  identifier: string;
  extractedFieldCount: number;
};

export type SmartFillNativeField = {
  id: string;
  value: string;
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
      return { overlay: true, accessibility: true, autofill: true, nativeBridge: false };
    }

    if (!isAndroid || !nativeModule) {
      return { overlay: false, accessibility: false, autofill: false, nativeBridge: false };
    }

    const [overlay, accessibility, autofill] = await Promise.all([
      nativeModule.checkOverlayPermission?.() ?? Promise.resolve(false),
      nativeModule.checkAccessibilityPermission?.() ?? Promise.resolve(false),
      nativeModule.checkAutofillPermission?.() ?? Promise.resolve(false),
    ]);

    return { overlay, accessibility, autofill, nativeBridge: true };
  },

  async openOverlaySettings() {
    if (nativeModule?.requestOverlayPermission) {
      await nativeModule.requestOverlayPermission();
      return;
    }

    if (isAndroid) {
      throw new Error('Native Android overlay settings are unavailable in this build.');
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

  async openAutofillSettings() {
    if (nativeModule?.openAutofillSettings) {
      await nativeModule.openAutofillSettings();
      return;
    }
    if (isAndroid) {
      throw new Error('Native Android Autofill settings are unavailable in this build.');
    }
    await Linking.openSettings();
  },

  async start(fields: SmartFillNativeField[], credentialAuthorized = false) {
    if (isWebPreview) return true;
    return (await nativeModule?.startSmartFill?.(fields, credentialAuthorized)) ?? false;
  },

  async isActive() {
    if (isWebPreview) return false;
    return (await nativeModule?.isSmartFillActive?.()) ?? false;
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

  async setVaultFiles(files: NativeVaultFileSummary[]) {
    if (isWebPreview) return;
    await nativeModule?.setVaultFiles?.(files);
  },

  async clearCredentialAuthorization() {
    await secureVaultNative.clearCredentialAuthorization();
  },

  async analyzeDocument(uri: string, documentType: string): Promise<SmartFillExtraction[]> {
    if (isWebPreview || !nativeModule?.analyzeDocument) return [];
    const temporaryUri = await secureVaultNative.decryptFileToTemp(uri);
    if (!temporaryUri) return [];
    try {
      return (await nativeModule.analyzeDocument(temporaryUri, documentType)) ?? [];
    } finally {
      await secureVaultNative.deleteFile(temporaryUri);
    }
  },

  async consumePendingScreenshot(): Promise<{ base64: string; mimeType: string } | null> {
    if (isWebPreview) return null;
    return (await nativeModule?.consumePendingScreenshot?.()) ?? null;
  },
};