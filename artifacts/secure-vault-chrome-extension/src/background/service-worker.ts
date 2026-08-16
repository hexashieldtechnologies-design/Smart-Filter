import { chromeApi } from '@/shared/chrome';
import {
  fail,
  ok,
  originFromUrl,
  randomId,
  sessionIsExpired,
  type ExtensionMessage,
} from '@/shared/messages';
import { buildFillPlan } from '@/content/field-matcher';
import { createVaultMetadata, decryptVault, parseEnvelope } from '@/vault/encrypted-store';
import {
  clearUnlockedVault,
  getPlan,
  getSession,
  getUnlockedVault,
  loadEncryptedEnvelope,
  saveEncryptedEnvelope,
  setPlan,
  setSession,
  setUnlockedVault,
} from '@/vault/session-store';
import type { FillPlan, SmartFillSession } from '@/shared/types';

const HARD_TIMEOUT_MS = 30 * 60 * 1000;

function unsupportedOrigin(url: string | undefined): string | undefined {
  if (!url) return 'The current tab URL is unavailable.';
  if (!/^https?:\/\//i.test(url)) return 'Chrome internal and extension pages are not supported.';
  return undefined;
}

async function activeTab(): Promise<{ id: number; url: string; title?: string }> {
  const tabs = await chromeApi?.tabs?.query?.({ active: true, currentWindow: true });
  const tab = tabs?.[0];
  if (!tab?.id || !tab.url) throw new Error('No supported active tab is available.');
  return { id: tab.id, url: tab.url, title: tab.title };
}

async function injectAndScan(tabId: number, session: SmartFillSession) {
  if (!chromeApi?.scripting?.executeScript || !chromeApi.tabs?.sendMessage) {
    throw new Error('Chrome scripting permissions are not available.');
  }

  try {
    await chromeApi.scripting.executeScript({
      target: { tabId },
      files: ['content-script.js'],
    });
  } catch {
    // It may already be injected in the current tab.
  }

  return chromeApi.tabs.sendMessage(tabId, {
    type: 'CONTENT_SCAN',
    requestId: randomId(),
    sessionId: session.id,
  });
}

async function startSession(message: Extract<ExtensionMessage, { type: 'SESSION_START' }>) {
  const vault = await getUnlockedVault();
  if (!vault) return fail(message.requestId, 'VAULT_LOCKED', 'Unlock Secure Vault before starting Smart Fill.');

  const tab = message.tabId
    ? await chromeApi?.tabs?.get?.(message.tabId)
    : await activeTab();
  const unsupported = unsupportedOrigin(tab?.url);
  if (unsupported || !tab?.id || !tab.url) {
    return fail(message.requestId, 'UNSUPPORTED_PAGE', unsupported ?? 'This page cannot be scanned.');
  }

  const session: SmartFillSession = {
    id: randomId(),
    tabId: tab.id,
    origin: originFromUrl(tab.url),
    startedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + HARD_TIMEOUT_MS).toISOString(),
    phase: 'scanning',
    selectedDocumentIds: [],
  };
  await setSession(session);
  const scanResponse = await injectAndScan(tab.id, session) as {
    ok?: boolean;
    data?: { fields: Parameters<typeof buildFillPlan>[0]['discoveredFields']; page: { origin: string } };
  };
  if (!scanResponse?.data?.fields) {
    return fail(message.requestId, 'NO_VISIBLE_FIELDS', 'No visible supported fields were found on this page.');
  }
  const plan = buildFillPlan({
    sessionId: session.id,
    tabId: tab.id,
    origin: session.origin,
    discoveredFields: scanResponse.data.fields,
    vault,
  });
  session.phase = plan.fields.some((field) => field.valueAvailable) ? 'review_required' : 'error';
  await setSession(session);
  await setPlan(plan);
  return ok(message.requestId, { session, plan });
}

async function confirmFill(message: Extract<ExtensionMessage, { type: 'FILL_CONFIRM' }>) {
  const session = await getSession();
  const plan = await getPlan();
  if (sessionIsExpired(session) || !plan) {
    return fail(message.requestId, 'SESSION_EXPIRED', 'This Smart Fill session has expired. Start again.');
  }

  const tab = await chromeApi?.tabs?.get?.(session!.tabId);
  if (originFromUrl(tab?.url) !== session!.origin) {
    await setSession(undefined);
    await setPlan(undefined);
    return fail(message.requestId, 'ORIGIN_CHANGED', 'The page origin changed. Start Smart Fill again.');
  }

  const allowed = new Set([...message.fieldIds, ...message.sensitiveFieldIds]);
  const approvedPlan: FillPlan = {
    ...plan,
    fields: plan.fields.map((field) => ({
      ...field,
      selected: allowed.has(field.fieldId)
        && (!field.sensitive || message.sensitiveFieldIds.includes(field.fieldId)),
      sensitiveConfirmationPending: false,
    })),
  };
  await setSession({ ...session!, phase: 'filling' });
  await setPlan(approvedPlan);
  const result = await chromeApi?.tabs?.sendMessage?.(session!.tabId, {
    type: 'CONTENT_APPLY_FILL',
    requestId: message.requestId,
    sessionId: session!.id,
    plan: approvedPlan,
  });
  return ok(message.requestId, result);
}

async function handleMessage(message: ExtensionMessage) {
  switch (message.type) {
    case 'VAULT_STATUS': {
      const envelope = await loadEncryptedEnvelope();
      const vault = await getUnlockedVault();
      return ok(message.requestId, {
        state: vault ? 'ready' : envelope ? 'locked' : 'no_vault',
        metadata: undefined,
      });
    }
    case 'VAULT_IMPORT': {
      parseEnvelope(message.envelope);
      await saveEncryptedEnvelope(message.envelope, message.metadata);
      return ok(message.requestId, { imported: true });
    }
    case 'VAULT_UNLOCK': {
      const raw = await loadEncryptedEnvelope();
      if (!raw) return fail(message.requestId, 'VAULT_NOT_IMPORTED', 'Import an encrypted vault before unlocking.');
      try {
        const vault = await decryptVault(parseEnvelope(raw), message.passphrase);
        await setUnlockedVault(vault);
        return ok(message.requestId, {
          unlocked: true,
          documentCount: vault.documents.length,
          metadata: createVaultMetadata(vault),
        });
      } catch {
        return fail(message.requestId, 'VAULT_DECRYPT_FAILED', 'Could not unlock the vault with that passphrase.');
      }
    }
    case 'VAULT_LOCK':
      await clearUnlockedVault();
      return ok(message.requestId, { locked: true });
    case 'SESSION_START':
      return startSession(message);
    case 'PAGE_SCAN_REQUEST':
      return startSession({ ...message, type: 'SESSION_START', tabId: message.tabId });
    case 'FILL_CONFIRM':
      return confirmFill(message);
    case 'SESSION_STOP': {
      const session = await getSession();
      if (session && chromeApi?.tabs?.sendMessage) {
        await chromeApi.tabs.sendMessage(session.tabId, {
          type: 'CONTENT_CLOSE_PANEL',
          requestId: randomId(),
          sessionId: session.id,
        }).catch(() => undefined);
      }
      await setSession(undefined);
      await setPlan(undefined);
      return ok(message.requestId, { stopped: true });
    }
    case 'CONTENT_FILL_PROGRESS': {
      const session = await getSession();
      if (session && message.sessionId === session.id) {
        await setSession({ ...session, phase: 'filled' });
      }
      return ok(message.requestId, { recorded: true });
    }
    default:
      return fail(message.requestId, 'UNSUPPORTED_MESSAGE', 'This action is not available.');
  }
}

chromeApi?.runtime?.onMessage?.addListener((message: unknown, _sender, sendResponse) => {
  void handleMessage(message as ExtensionMessage)
    .then(sendResponse)
    .catch(() => sendResponse(fail((message as ExtensionMessage).requestId, 'INTERNAL_ERROR', 'The extension could not complete that action.')));
  return true;
});

chromeApi?.tabs?.onUpdated?.addListener((tabId, changeInfo, tab) => {
  void getSession().then(async (session) => {
    if (!session || session.tabId !== tabId || !changeInfo.url) return;
    if (originFromUrl(tab.url) !== session.origin) {
      await clearUnlockedVault();
    }
  });
});