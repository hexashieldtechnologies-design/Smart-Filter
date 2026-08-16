import { NativeModules, Platform } from 'react-native';

export type DeviceIntegrityStatus = {
  compromised: boolean;
  supported: boolean;
};

export type DeviceSecurityStatus = {
  canAuthenticate: boolean;
  supported: boolean;
};

export type SavedLoginCredential = {
  id: string;
  domain: string;
  username: string;
  passwordRef: string;
};

type NativeSecureVaultModule = {
  authenticate?: (reason: string) => Promise<boolean>;
  checkDeviceIntegrity?: () => Promise<DeviceIntegrityStatus>;
  decryptFileToTemp?: (uri: string) => Promise<string>;
  decryptText?: (value: string) => Promise<string>;
  deleteFile?: (uri: string) => Promise<void>;
  encryptFile?: (uri: string) => Promise<string>;
  encryptText?: (value: string) => Promise<string>;
  getDeviceSecurityStatus?: () => Promise<DeviceSecurityStatus>;
  setSecureWindow?: (enabled: boolean) => Promise<void>;
  saveLoginCredential?: (domain: string, username: string, password: string) => Promise<boolean>;
  readLoginCredentialMetadata?: () => Promise<SavedLoginCredential[]>;
  authorizeCredentialFill?: (domain: string, username: string) => Promise<boolean>;
  clearCredentialAuthorization?: () => Promise<void>;
  clearLoginCredentials?: () => Promise<void>;
};

const nativeModule = NativeModules.SecureVaultSecurity as NativeSecureVaultModule | undefined;

export const secureVaultNative = {
  available: Platform.OS === 'android' && Boolean(nativeModule),

  async authenticate(reason = 'Authenticate to unlock Secure Vault'): Promise<boolean> {
    if (Platform.OS !== 'android') return true;
    return (await nativeModule?.authenticate?.(reason)) ?? false;
  },

  async checkDeviceIntegrity(): Promise<DeviceIntegrityStatus> {
    if (Platform.OS !== 'android') return { compromised: false, supported: false };
    return (await nativeModule?.checkDeviceIntegrity?.()) ?? { compromised: false, supported: false };
  },

  async getDeviceSecurityStatus(): Promise<DeviceSecurityStatus> {
    if (Platform.OS !== 'android') return { canAuthenticate: true, supported: false };
    return (await nativeModule?.getDeviceSecurityStatus?.()) ?? { canAuthenticate: false, supported: false };
  },

  async encryptText(value: string): Promise<string | undefined> {
    if (!nativeModule?.encryptText) return undefined;
    return nativeModule.encryptText(value);
  },

  async decryptText(value: string): Promise<string | undefined> {
    if (!nativeModule?.decryptText) return undefined;
    try {
      return await nativeModule.decryptText(value);
    } catch {
      return undefined;
    }
  },

  async encryptFile(uri: string): Promise<string | undefined> {
    if (!nativeModule?.encryptFile) return undefined;
    return nativeModule.encryptFile(uri);
  },

  async decryptFileToTemp(uri: string): Promise<string | undefined> {
    if (!nativeModule?.decryptFileToTemp) return undefined;
    return nativeModule.decryptFileToTemp(uri);
  },

  async deleteFile(uri: string): Promise<void> {
    await nativeModule?.deleteFile?.(uri);
  },

  async setSecureWindow(enabled: boolean): Promise<void> {
    await nativeModule?.setSecureWindow?.(enabled);
  },

  get credentialStorageAvailable() {
    return Platform.OS === 'android' && Boolean(
      nativeModule?.saveLoginCredential &&
      nativeModule?.readLoginCredentialMetadata &&
      nativeModule?.authorizeCredentialFill,
    );
  },

  async saveLoginCredential(domain: string, username: string, password: string): Promise<boolean> {
    if (nativeModule?.saveLoginCredential) {
      return (await nativeModule.saveLoginCredential(domain, username, password)) ?? false;
    }
    return false;
  },

  async readLoginCredentialMetadata(): Promise<SavedLoginCredential[]> {
    if (!nativeModule?.readLoginCredentialMetadata) return [];
    try {
      return (await nativeModule.readLoginCredentialMetadata()) ?? [];
    } catch {
      return [];
    }
  },

  async authorizeCredentialFill(domain: string, username: string): Promise<boolean> {
    if (!nativeModule?.authorizeCredentialFill) return false;
    return (await nativeModule.authorizeCredentialFill(domain, username)) ?? false;
  },

  async clearCredentialAuthorization(): Promise<void> {
    await nativeModule?.clearCredentialAuthorization?.();
  },

  async clearLoginCredentials(): Promise<void> {
    await nativeModule?.clearLoginCredentials?.();
  },
};