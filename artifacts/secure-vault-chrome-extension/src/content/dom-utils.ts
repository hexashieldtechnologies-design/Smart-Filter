import type { DomFieldSignals } from '@/shared/types';

const supportedSelector = [
  'input[type="text"]',
  'input[type="email"]',
  'input[type="tel"]',
  'input[type="number"]',
  'input[type="date"]',
  'input[type="url"]',
  'input[type="search"]',
  'input:not([type])',
  'textarea',
  'select',
  'input[type="file"]',
  '[contenteditable="true"]',
].join(',');

export function isVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0' &&
    !element.hasAttribute('disabled') &&
    !element.hasAttribute('readonly')
  );
}

function visibleText(element: Element | null): string {
  return element?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function associatedLabel(element: HTMLElement): string {
  const id = element.getAttribute('id');
  if (id) {
    const label = document.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label) return visibleText(label);
  }

  const parentLabel = element.closest('label');
  if (parentLabel) return visibleText(parentLabel);

  const parent = element.parentElement;
  if (!parent) return '';
  const nearby = parent.querySelector(':scope > label, :scope > span, :scope > p');
  return visibleText(nearby);
}

function nearbyText(element: HTMLElement): string {
  const parent = element.parentElement;
  if (!parent) return '';
  const text = visibleText(parent);
  return text.length > 260 ? text.slice(0, 260) : text;
}

function controlKind(element: HTMLElement): DomFieldSignals['controlKind'] {
  if (element instanceof HTMLSelectElement) return 'select';
  if (element instanceof HTMLTextAreaElement) return 'textarea';
  if (element instanceof HTMLInputElement && element.type === 'file') return 'file';
  if (element.getAttribute('contenteditable') === 'true') return 'contenteditable';
  return 'text';
}

export function collectFieldSignals(root: ParentNode = document): DomFieldSignals[] {
  const elements = Array.from(root.querySelectorAll<HTMLElement>(supportedSelector));
  const fields: DomFieldSignals[] = [];
  const seen = new Map<string, DomFieldSignals>();

  for (const [index, element] of elements.entries()) {
    const visible = isVisible(element);
    const kind = controlKind(element);
    const input = element instanceof HTMLInputElement ? element : undefined;
    const key = element.getAttribute('data-secure-vault-field-id')
      || (element.getAttribute('name') ? `name:${element.getAttribute('name')}` : '')
      || element.id
      || `${element.getAttribute('autocomplete') ?? ''}:${associatedLabel(element)}:${index}`;
    if (!element.hasAttribute('data-secure-vault-field-id')) {
      element.setAttribute('data-secure-vault-field-id', key);
    }
    const signal: DomFieldSignals = {
      elementId: key,
      tagName: element.tagName.toLowerCase(),
      inputType: input?.type,
      name: element.getAttribute('name') ?? undefined,
      id: element.id || undefined,
      placeholder: element.getAttribute('placeholder') ?? undefined,
      ariaLabel: element.getAttribute('aria-label') ?? undefined,
      ariaLabelledByText: element.getAttribute('aria-labelledby')
        ?.split(/\s+/)
        .map((labelId) => visibleText(document.getElementById(labelId)))
        .filter(Boolean)
        .join(' ') || undefined,
      autocomplete: element.getAttribute('autocomplete') ?? undefined,
      associatedLabel: associatedLabel(element) || undefined,
      nearbyText: nearbyText(element) || undefined,
      accept: input?.accept || undefined,
      required: element.hasAttribute('required'),
      disabled: element.hasAttribute('disabled'),
      readonly: element.hasAttribute('readonly'),
      visible,
      inIframe: window.self !== window.top,
      insideShadowRoot: false,
      controlKind: kind,
    };

    const previous = seen.get(key);
    if (!previous || (!previous.visible && signal.visible)) {
      seen.set(key, signal);
    }
  }

  fields.push(...seen.values());
  return fields;
}

export function pageSnapshot() {
  return {
    origin: window.location.origin,
    title: document.title,
    urlPath: `${window.location.pathname}${window.location.search}`,
  };
}