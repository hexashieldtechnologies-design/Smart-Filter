export type VaultMode = 'no-vault' | 'locked' | 'ready';

export type PopupStage =
  | 'ready'
  | 'scanning'
  | 'review'
  | 'sensitive-confirmation'
  | 'filling'
  | 'paused'
  | 'complete'
  | 'unsupported'
  | 'origin-warning';

export type FieldSensitivity = 'standard' | 'sensitive' | 'blocked';

export interface VaultMetadata {
  name: string;
  version: string;
  entries: number;
  importedAt: string;
  fingerprint: string;
}

export interface PageContext {
  origin: string;
  title: string;
  secure: boolean;
  supported: boolean;
  sessionFresh: boolean;
}

export interface SemanticMatch {
  id: string;
  fieldLabel: string;
  semanticKey: string;
  valuePreview: string;
  confidence: number;
  sensitivity: FieldSensitivity;
  approved: boolean;
}