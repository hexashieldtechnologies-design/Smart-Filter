import { valuesMatch } from '@/shared/normalize';
import type { FieldMatch, FillPlan, FillResult } from '@/shared/types';

function findElement(field: FieldMatch): HTMLElement | undefined {
  const selector = `[data-secure-vault-field-id="${CSS.escape(field.fieldId)}"]`;
  const direct = document.querySelector<HTMLElement>(selector);
  if (direct) return direct;
  if (field.elementDescriptor.id) return document.getElementById(field.elementDescriptor.id) ?? undefined;
  if (field.elementDescriptor.name) {
    return document.querySelector<HTMLElement>(
      `[name="${CSS.escape(field.elementDescriptor.name)}"]`,
    ) ?? undefined;
  }
  return undefined;
}

function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const prototype = element instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
  descriptor?.set?.call(element, value);
  element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}

function setFieldValue(element: HTMLElement, value: string): void {
  if (element instanceof HTMLSelectElement) {
    const matchingOption = Array.from(element.options).find(
      (option) => option.value.trim().toLowerCase() === value.trim().toLowerCase()
        || option.text.trim().toLowerCase() === value.trim().toLowerCase(),
    );
    element.value = matchingOption?.value ?? value;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.focus();
    element.select?.();
    setNativeValue(element, value);
    element.blur();
    return;
  }

  if (element.getAttribute('contenteditable') === 'true') {
    element.textContent = value;
    element.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

async function fillOneField(field: FieldMatch): Promise<FillResult['fields'][number]> {
  if (!field.valueAvailable || !field.value || field.status !== 'matched' || field.sensitiveConfirmationPending) {
    return {
      fieldId: field.fieldId,
      semanticType: field.semanticType,
      status: field.sensitive ? 'blocked' : 'skipped',
      reason: field.reason ?? 'Field needs review before filling.',
    };
  }

  const element = findElement(field);
  if (!element) {
    return {
      fieldId: field.fieldId,
      semanticType: field.semanticType,
      status: 'failed',
      reason: 'The field is no longer available on the page.',
    };
  }

  setFieldValue(element, field.value);
  await new Promise((resolve) => requestAnimationFrame(resolve));

  const actual = element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement
    ? element.value
    : element.textContent ?? '';
  const verified = valuesMatch(field.semanticType as never, field.value, actual);

  return {
    fieldId: field.fieldId,
    semanticType: field.semanticType,
    status: verified ? 'filled_verified' : 'fill_sent_not_verified',
    reason: verified ? undefined : 'The website did not confirm the value after filling.',
  };
}

export async function applyFillPlan(plan: FillPlan, approvedFieldIds: string[]): Promise<FillResult> {
  const startedAt = new Date().toISOString();
  const fields = [];
  for (const field of plan.fields) {
    if (!approvedFieldIds.includes(field.fieldId)) {
      fields.push({
        fieldId: field.fieldId,
        semanticType: field.semanticType,
        status: 'skipped' as const,
        reason: 'Not approved in the review panel.',
      });
      continue;
    }
    fields.push(await fillOneField(field));
  }

  return {
    sessionId: plan.sessionId,
    startedAt,
    completedAt: new Date().toISOString(),
    detectedCount: plan.fields.length,
    matchedCount: plan.fields.filter((field) => field.status === 'matched').length,
    filledCount: fields.filter((field) => field.status === 'filled_verified').length,
    skippedCount: fields.filter((field) => field.status === 'skipped').length,
    needsReviewCount: plan.fields.filter((field) => field.status === 'needs_review').length,
    unavailableCount: plan.fields.filter((field) => field.status === 'unavailable').length,
    fields,
  };
}