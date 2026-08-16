import { chromeApi } from './chrome';
import type {
  DomFieldSignals,
  FillPlan,
  FillResult,
  SmartFillSession,
} from './types';

export type BaseMessage = {
  requestId: string;
  sessionId?: string;
  type: string;
};

export type ExtensionMessage =
  | (BaseMessage & { type: 'SESSION_START'; tabId?: number })
  | (BaseMessage & { type: 'PAGE_SCAN_REQUEST'; tabId: number })
  | (BaseMessage & { type: 'FILES_OPEN' })
  | (BaseMessage & { type: 'FILES_SET_SELECTION'; documentIds: string[] })
  | (BaseMessage & { type: 'FILL_CONFIRM'; fieldIds: string[]; sensitiveFieldIds: string[] })
  | (BaseMessage & { type: 'SESSION_STOP' })
  | (BaseMessage & { type: 'VAULT_STATUS' })
  | (BaseMessage & { type: 'VAULT_IMPORT'; envelope: string; metadata: unknown })
  | (BaseMessage & { type: 'VAULT_UNLOCK'; passphrase: string })
  | (BaseMessage & { type: 'VAULT_LOCK' })
  | (BaseMessage & { type: 'CONTENT_SCAN' })
  | (BaseMessage & { type: 'CONTENT_APPLY_FILL'; plan: FillPlan })
  | (BaseMessage & { type: 'CONTENT_CLOSE_PANEL' })
  | (BaseMessage & { type: 'CONTENT_SCAN_RESULT'; fields: DomFieldSignals[]; page: PageSnapshot })
  | (BaseMessage & { type: 'CONTENT_FILL_PROGRESS'; result: FillResult });

export type PageSnapshot = {
  origin: string;
  title: string;
  urlPath: string;
};

export type MessageResponse<T = unknown> =
  | { ok: true; requestId: string; data: T }
  | { ok: false; requestId: string; errorCode: string; message: string };

export function randomId(): string {
  return `${Date.now().toString(36)}-${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
}

export async function sendExtensionMessage<T = unknown>(
  message: ExtensionMessage,
): Promise<MessageResponse<T>> {
  if (!chromeApi?.runtime?.sendMessage) {
    return {
      ok: false,
      requestId: message.requestId,
      errorCode: 'RUNTIME_UNAVAILABLE',
      message: 'Chrome extension runtime is not available in preview mode.',
    };
  }
  return chromeApi.runtime.sendMessage(message) as Promise<MessageResponse<T>>;
}

export function ok<T>(requestId: string, data: T): MessageResponse<T> {
  return { ok: true, requestId, data };
}

export function fail(
  requestId: string,
  errorCode: string,
  message: string,
): MessageResponse<never> {
  return { ok: false, requestId, errorCode, message };
}

export function originFromUrl(url: string | undefined): string {
  if (!url) return 'unknown';
  try {
    return new URL(url).origin;
  } catch {
    return 'unknown';
  }
}

export function sessionIsExpired(session: SmartFillSession | undefined): boolean {
  return !session || Date.now() >= Date.parse(session.expiresAt);
}