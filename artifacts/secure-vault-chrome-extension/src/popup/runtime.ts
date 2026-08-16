import { hasChromeRuntime } from '@/shared/chrome';
import { sendExtensionMessage, type MessageResponse, randomId } from '@/shared/messages';
import type { FillPlan, FillResult } from '@/shared/types';

export type VaultRuntimeStatus = {
  state: 'ready' | 'locked' | 'no_vault';
  metadata?: {
    schemaVersion?: number;
    importedAt?: string;
    documentCount?: number;
    labels?: string[];
  };
};

export function isExtensionRuntimeAvailable(): boolean {
  return hasChromeRuntime();
}

export function getVaultStatus(): Promise<MessageResponse<VaultRuntimeStatus>> {
  return sendExtensionMessage({
    type: 'VAULT_STATUS',
    requestId: randomId(),
  });
}

export async function importEncryptedVault(file: File): Promise<MessageResponse<{ imported: boolean }>> {
  const envelope = await file.text();
  return sendExtensionMessage({
    type: 'VAULT_IMPORT',
    requestId: randomId(),
    envelope,
    metadata: {
      importedAt: new Date().toISOString(),
      fileName: file.name,
    },
  });
}

export function unlockVault(passphrase: string): Promise<MessageResponse<{
  unlocked: boolean;
  documentCount: number;
}>> {
  return sendExtensionMessage({
    type: 'VAULT_UNLOCK',
    requestId: randomId(),
    passphrase,
  });
}

export function startSmartFill(): Promise<MessageResponse<{
  session: { id: string; origin: string };
  plan: FillPlan;
}>> {
  return sendExtensionMessage({
    type: 'SESSION_START',
    requestId: randomId(),
  });
}

export function confirmFill(
  fieldIds: string[],
  sensitiveFieldIds: string[],
): Promise<MessageResponse<FillResult>> {
  return sendExtensionMessage({
    type: 'FILL_CONFIRM',
    requestId: randomId(),
    fieldIds,
    sensitiveFieldIds,
  });
}