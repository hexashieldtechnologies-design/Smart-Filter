import { chromeApi } from '@/shared/chrome';
import type { FillPlan, SmartFillSession, UnlockedVault } from '@/shared/types';

let memoryVault: UnlockedVault | undefined;
let memorySession: SmartFillSession | undefined;
let memoryPlan: FillPlan | undefined;

export async function saveEncryptedEnvelope(envelope: string, metadata: unknown): Promise<void> {
  if (chromeApi?.storage?.local) {
    await chromeApi.storage.local.set({
      encryptedVaultEnvelope: envelope,
      vaultMetadata: metadata,
    });
  }
}

export async function loadEncryptedEnvelope(): Promise<string | undefined> {
  if (!chromeApi?.storage?.local) return undefined;
  const stored = await chromeApi.storage.local.get('encryptedVaultEnvelope');
  return typeof stored.encryptedVaultEnvelope === 'string'
    ? stored.encryptedVaultEnvelope
    : undefined;
}

export async function setUnlockedVault(vault: UnlockedVault | undefined): Promise<void> {
  memoryVault = vault;
  if (chromeApi?.storage?.session) {
    if (vault) {
      await chromeApi.storage.session.set({ unlockedVault: vault });
    } else {
      await chromeApi.storage.session.remove('unlockedVault');
    }
  }
}

export async function getUnlockedVault(): Promise<UnlockedVault | undefined> {
  if (memoryVault) return memoryVault;
  if (!chromeApi?.storage?.session) return undefined;
  const stored = await chromeApi.storage.session.get('unlockedVault');
  memoryVault = stored.unlockedVault as UnlockedVault | undefined;
  return memoryVault;
}

export async function clearUnlockedVault(): Promise<void> {
  memoryVault = undefined;
  memorySession = undefined;
  memoryPlan = undefined;
  if (chromeApi?.storage?.session) await chromeApi.storage.session.clear();
}

export async function setSession(session: SmartFillSession | undefined): Promise<void> {
  memorySession = session;
  if (chromeApi?.storage?.session) {
    if (session) await chromeApi.storage.session.set({ activeSession: session });
    else await chromeApi.storage.session.remove('activeSession');
  }
}

export async function getSession(): Promise<SmartFillSession | undefined> {
  if (memorySession) return memorySession;
  if (!chromeApi?.storage?.session) return undefined;
  const stored = await chromeApi.storage.session.get('activeSession');
  memorySession = stored.activeSession as SmartFillSession | undefined;
  return memorySession;
}

export async function setPlan(plan: FillPlan | undefined): Promise<void> {
  memoryPlan = plan;
  if (chromeApi?.storage?.session) {
    if (plan) await chromeApi.storage.session.set({ activePlan: plan });
    else await chromeApi.storage.session.remove('activePlan');
  }
}

export async function getPlan(): Promise<FillPlan | undefined> {
  if (memoryPlan) return memoryPlan;
  if (!chromeApi?.storage?.session) return undefined;
  const stored = await chromeApi.storage.session.get('activePlan');
  memoryPlan = stored.activePlan as FillPlan | undefined;
  return memoryPlan;
}