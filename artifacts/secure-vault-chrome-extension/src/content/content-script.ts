import { chromeApi } from '@/shared/chrome';
import { randomId } from '@/shared/messages';
import { applyFillPlan } from './fill-engine';
import { collectFieldSignals, pageSnapshot } from './dom-utils';
import type { ExtensionMessage } from '@/shared/messages';
import type { FillPlan } from '@/shared/types';

let observer: MutationObserver | undefined;
let observerTimer: number | undefined;
let panel: HTMLDivElement | undefined;

function response<T>(requestId: string, data: T) {
  return { ok: true, requestId, data };
}

function showPanel(message: string, detail?: string): void {
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'secure-vault-smart-fill-panel';
    panel.style.cssText = [
      'position:fixed',
      'right:20px',
      'bottom:20px',
      'z-index:2147483647',
      'width:320px',
      'padding:16px',
      'border-radius:16px',
      'background:#102b35',
      'color:#f2fbf8',
      'font:14px/1.45 system-ui,sans-serif',
      'box-shadow:0 18px 45px rgba(15,35,40,.28)',
    ].join(';');
    document.documentElement.appendChild(panel);
  }
  panel.replaceChildren();
  const title = document.createElement('strong');
  title.textContent = 'Secure Vault Smart Fill';
  const body = document.createElement('div');
  body.style.marginTop = '8px';
  body.textContent = message;
  panel.append(title, body);
  if (detail) {
    const muted = document.createElement('div');
    muted.style.cssText = 'margin-top:8px;opacity:.72;font-size:12px';
    muted.textContent = detail;
    panel.append(muted);
  }
}

function closePanel(): void {
  panel?.remove();
  panel = undefined;
}

function startObserver(): void {
  observer?.disconnect();
  observer = new MutationObserver(() => {
    window.clearTimeout(observerTimer);
    observerTimer = window.setTimeout(() => {
      if (panel) {
        showPanel('The page changed. Scan again before filling.');
      }
    }, 400);
  });
  observer.observe(document.body, { childList: true, subtree: true, attributes: true });
}

function stopObserver(): void {
  observer?.disconnect();
  observer = undefined;
  window.clearTimeout(observerTimer);
}

async function sendProgress(result: unknown, requestId: string, sessionId?: string): Promise<void> {
  await chromeApi?.runtime?.sendMessage?.({
    type: 'CONTENT_FILL_PROGRESS',
    requestId: randomId(),
    sessionId,
    result,
  });
}

chromeApi?.runtime?.onMessage?.addListener((message: unknown, _sender, sendResponse) => {
  const incoming = message as ExtensionMessage;

  if (incoming.type === 'CONTENT_SCAN') {
    startObserver();
    const fields = collectFieldSignals();
    showPanel(
      `${fields.length} visible controls detected.`,
      'Review matches in the Secure Vault popup. Nothing has been filled.',
    );
    sendResponse(
      response(incoming.requestId, {
        fields,
        page: pageSnapshot(),
      }),
    );
    return true;
  }

  if (incoming.type === 'CONTENT_APPLY_FILL') {
    const plan: FillPlan = incoming.plan;
    const approvedFieldIds = plan.fields
      .filter((field) => field.selected)
      .map((field) => field.fieldId);
    void applyFillPlan(plan, approvedFieldIds).then(async (result) => {
      showPanel(
        `${result.filledCount} field${result.filledCount === 1 ? '' : 's'} filled and verified.`,
        'Review the page yourself. Secure Vault never submits forms.',
      );
      await sendProgress(result, incoming.requestId, incoming.sessionId);
      sendResponse(response(incoming.requestId, result));
    });
    return true;
  }

  if (incoming.type === 'CONTENT_CLOSE_PANEL') {
    stopObserver();
    closePanel();
    sendResponse(response(incoming.requestId, { closed: true }));
    return true;
  }

  return false;
});