import { findCanonicalField } from '@/shared/field-aliases';
import { inferFieldKey, normalizeLabel } from '@/shared/normalize';
import { isSensitiveField, resolveLocalSource, documentTypeForField } from '@/shared/resolver';
import type {
  BlockedAction,
  DomFieldSignals,
  FieldMatch,
  FillPlan,
  UnlockedVault,
} from '@/shared/types';

const blockedPatterns: Array<{ pattern: RegExp; reason: BlockedAction['reason']; label: string }> = [
  { pattern: /\b(password|passcode|secret)\b/i, reason: 'password', label: 'Password fields are handled manually.' },
  { pattern: /\b(captcha|recaptcha|security code|i am not a robot)\b/i, reason: 'captcha', label: 'CAPTCHA or anti-bot controls stay manual.' },
  { pattern: /\b(otp|one time password|2fa|two factor|verification code)\b/i, reason: 'otp', label: 'OTP and verification controls stay manual.' },
  { pattern: /\b(cvv|cvc|card number|credit card|debit card|expiry)\b/i, reason: 'payment', label: 'Payment controls stay manual.' },
  { pattern: /\b(terms|privacy policy|declaration|consent|i agree|marketing)\b/i, reason: 'consent', label: 'Consent controls are never checked automatically.' },
  { pattern: /\b(submit|apply|pay|login|log in|register|continue|next|send)\b/i, reason: 'submit', label: 'Submission controls are always manual.' },
];

const scoreWeights = {
  autocomplete: 0.3,
  name: 0.22,
  id: 0.18,
  label: 0.15,
  placeholder: 0.08,
  type: 0.05,
  nearby: 0.02,
};

function signalText(field: DomFieldSignals): string {
  return normalizeLabel(
    [
      field.name,
      field.id,
      field.placeholder,
      field.ariaLabel,
      field.ariaLabelledByText,
      field.associatedLabel,
      field.nearbyText,
      field.autocomplete,
    ]
      .filter(Boolean)
      .join(' '),
  );
}

function blockedReason(field: DomFieldSignals): (typeof blockedPatterns)[number] | undefined {
  const text = signalText(field);
  return blockedPatterns.find(({ pattern }) => pattern.test(text));
}

export function classifyDomField(field: DomFieldSignals) {
  const label =
    field.ariaLabel ||
    field.ariaLabelledByText ||
    field.associatedLabel ||
    field.placeholder ||
    field.name ||
    field.id ||
    field.autocomplete ||
    'Unlabelled field';

  const key = field.controlKind === 'file'
    ? findCanonicalField(normalizeLabel(label))
    : inferFieldKey({
        autocomplete: field.autocomplete,
        name: field.name,
        id: field.id,
        label,
        placeholder: field.placeholder,
        nearbyText: field.nearbyText,
        inputType: field.inputType,
      });

  return { key, label: label.trim(), blocked: blockedReason(field) };
}

function exactAliasMatch(value: string | undefined, key: string | undefined): number {
  if (!value || !key) return 0;
  return normalizeLabel(value) === normalizeLabel(key) ? 1 : 0;
}

function scoreMatch(field: DomFieldSignals, key: string | undefined): number {
  if (!key) return 0;
  const label =
    field.associatedLabel ||
    field.ariaLabel ||
    field.placeholder ||
    field.name ||
    field.id;
  let score = 0;
  score += scoreWeights.autocomplete * exactAliasMatch(field.autocomplete, key);
  score += scoreWeights.name * exactAliasMatch(field.name, key);
  score += scoreWeights.id * exactAliasMatch(field.id, key);
  score += scoreWeights.label * (findCanonicalField(normalizeLabel(label)) === key ? 1 : 0.5);
  score += scoreWeights.placeholder * (findCanonicalField(normalizeLabel(field.placeholder)) === key ? 1 : 0);
  score += scoreWeights.type * (field.inputType === 'email' && key === 'email' ? 1 : field.inputType === 'tel' && key === 'phone' ? 1 : 0);
  score += scoreWeights.nearby * (findCanonicalField(normalizeLabel(field.nearbyText)) === key ? 1 : 0);
  return Math.min(1, Number(score.toFixed(2)));
}

function matchOne(
  field: DomFieldSignals,
  vault: UnlockedVault,
  documents: UnlockedVault['documents'],
): FieldMatch {
  const { key, label, blocked } = classifyDomField(field);
  const descriptor = {
    tagName: field.tagName,
    type: field.inputType,
    name: field.name,
    id: field.id,
    autocomplete: field.autocomplete,
  };

  if (blocked) {
    return {
      fieldId: field.elementId,
      semanticType: 'manual',
      label,
      elementDescriptor: descriptor,
      source: { kind: 'none' },
      valueAvailable: false,
      confidence: 1,
      sensitive: false,
      selected: false,
      status: 'blocked',
      reason: blocked.label,
    };
  }

  if (field.controlKind === 'file') {
    const uploadType = key ? documentTypeForField(key) : undefined;
    const document = uploadType
      ? documents.find((candidate) => candidate.type.toLowerCase() === uploadType)
      : undefined;
    return {
      fieldId: field.elementId,
      semanticType: key ?? 'unknown',
      label,
      elementDescriptor: descriptor,
      source: document ? { kind: 'upload', documentId: document.id } : { kind: 'none' },
      valueAvailable: Boolean(document?.uploadAsset?.present),
      confidence: scoreMatch(field, key),
      sensitive: true,
      selected: false,
      status: document ? 'needs_review' : 'unavailable',
      reason: document
        ? document.uploadAsset?.present
          ? 'Upload requires explicit confirmation.'
          : 'Please choose the approved document file manually.'
        : 'No matching selected document is available.',
    };
  }

  if (!key) {
    return {
      fieldId: field.elementId,
      semanticType: 'unknown',
      label,
      elementDescriptor: descriptor,
      source: { kind: 'none' },
      valueAvailable: false,
      confidence: 0,
      sensitive: false,
      selected: false,
      status: 'unsupported',
      reason: 'No approved semantic field mapping was found.',
    };
  }

  const resolved = resolveLocalSource({
    key,
    profile: vault.profile,
    documents,
  });
  const confidence = scoreMatch(field, key);
  const sensitive = isSensitiveField(key);
  const valueAvailable = Boolean(resolved.value);
  const selected = valueAvailable && confidence >= 0.9 && !sensitive;

  return {
    fieldId: field.elementId,
    semanticType: key,
    label,
    elementDescriptor: descriptor,
    source: resolved.source,
    value: resolved.value,
    valueAvailable,
    confidence,
    sensitive,
    selected,
    sensitiveConfirmationPending: valueAvailable && sensitive,
    status: !valueAvailable ? 'unavailable' : confidence < 0.65 ? 'needs_review' : 'matched',
    reason: !valueAvailable
      ? 'No approved local value is available.'
      : confidence < 0.65
        ? 'The match is below the safe confidence threshold.'
        : sensitive
          ? 'Sensitive field requires explicit confirmation.'
          : undefined,
  };
}

export function buildFillPlan(input: {
  sessionId: string;
  tabId: number;
  origin: string;
  discoveredFields: DomFieldSignals[];
  vault: UnlockedVault;
  selectedDocumentIds?: string[];
}): FillPlan {
  const availableDocuments = input.vault.documents.filter(
    (document) => document.status === 'verified_local',
  );
  const documents = input.selectedDocumentIds?.length
    ? availableDocuments.filter((document) => input.selectedDocumentIds!.includes(document.id))
    : availableDocuments;
  const fields = input.discoveredFields.map((field) => matchOne(field, input.vault, documents));
  const uploadActions = fields
    .filter((field): field is FieldMatch & { source: { kind: 'upload'; documentId: string } } => field.source.kind === 'upload')
    .map((field) => {
      const source = field.source;
      const document = documents.find((candidate) => candidate.id === source.documentId);
      return {
        fieldId: field.fieldId,
        documentId: source.documentId,
        expectedDocumentType: document?.type ?? 'unknown',
        status: document?.uploadAsset?.present ? 'ready' : 'needs_file',
      } as const;
    });

  return {
    sessionId: input.sessionId,
    tabId: input.tabId,
    origin: input.origin,
    createdAt: new Date().toISOString(),
    fields,
    selectedDocumentIds: documents.map((document) => document.id),
    requiresSensitiveConfirmation: fields.some(
      (field) => field.sensitive && field.valueAvailable,
    ),
    uploadActions,
    blockedActions: fields
      .filter((field) => field.status === 'blocked')
      .map((field) => ({
        fieldId: field.fieldId,
        reason: field.reason?.toLowerCase().includes('password')
          ? 'password'
          : field.reason?.toLowerCase().includes('captcha')
            ? 'captcha'
            : field.reason?.toLowerCase().includes('payment')
              ? 'payment'
              : field.reason?.toLowerCase().includes('consent')
                ? 'consent'
                : 'submit',
      })),
  };
}