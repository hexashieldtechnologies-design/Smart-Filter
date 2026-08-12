import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  getListVaultDocumentsQueryKey,
  useDeleteVaultDocument,
  useListVaultDocuments,
  useUpsertVaultDocument,
  type VaultDocument as ApiVaultDocument,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

export type DocumentStatus = 'Verified' | 'Not added' | 'Processing';

export type VaultDocument = {
  id: string;
  type: string;
  label: string;
  status: DocumentStatus;
  identifier: string;
  updated: string;
  icon: string;
  color: 'aqua' | 'gold' | 'navy' | 'coral';
  imageUri?: string;
  imageData?: string;
  contentType?: string;
};

export type AuditItem = {
  id: string;
  title: string;
  detail: string;
  time: string;
  icon: string;
};

type VaultContextValue = {
  ready: boolean;
  hasOnboarded: boolean;
  documents: VaultDocument[];
  auditItems: AuditItem[];
  biometricEnabled: boolean;
  smartFillEnabled: boolean;
  completeOnboarding: () => Promise<void>;
  addDocument: (document: VaultDocument) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  toggleBiometric: () => Promise<void>;
  toggleSmartFill: () => Promise<void>;
  addAudit: (title: string, detail: string, icon: string) => Promise<void>;
  resetVault: () => Promise<void>;
};

type PersistedVaultState = {
  ownerKey: string;
  hasOnboarded: boolean;
  documents: VaultDocument[];
  auditItems: AuditItem[];
  biometricEnabled: boolean;
  smartFillEnabled: boolean;
};

const starterDocuments: VaultDocument[] = [
  {
    id: 'aadhaar',
    type: 'Identity',
    label: 'Aadhaar Card',
    status: 'Verified',
    identifier: 'XXXX XXXX 1234',
    updated: '12 Aug 2026',
    icon: 'card-outline',
    color: 'aqua',
  },
  {
    id: 'pan',
    type: 'Tax identity',
    label: 'PAN Card',
    status: 'Verified',
    identifier: 'ABCDE•••••',
    updated: '12 Aug 2026',
    icon: 'layers-outline',
    color: 'gold',
  },
  {
    id: 'passport',
    type: 'Travel identity',
    label: 'Passport',
    status: 'Not added',
    identifier: 'Ready when you are',
    updated: '—',
    icon: 'book-outline',
    color: 'navy',
  },
  {
    id: 'license',
    type: 'Mobility',
    label: 'Driving Licence',
    status: 'Not added',
    identifier: 'Ready when you are',
    updated: '—',
    icon: 'car-outline',
    color: 'coral',
  },
];

const starterAudit: AuditItem[] = [
  { id: '1', title: 'Smart Fill session completed', detail: '3 approved fields filled', time: 'Today, 4:12 PM', icon: 'sparkles-outline' },
  { id: '2', title: 'PAN verification completed', detail: 'Document status updated', time: 'Today, 4:07 PM', icon: 'checkmark-circle-outline' },
  { id: '3', title: 'Document uploaded', detail: 'Aadhaar Card added securely', time: 'Today, 4:05 PM', icon: 'cloud-upload-outline' },
];

const VaultContext = createContext<VaultContextValue | null>(null);
const STORAGE_KEY = 'secure-vault-local-state';

function createOwnerKey() {
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

function toLocalDocument(document: ApiVaultDocument): VaultDocument {
  return {
    id: document.id,
    type: document.type,
    label: document.label,
    status: document.status,
    identifier: document.identifier,
    updated: document.updated,
    icon: document.icon,
    color: document.color,
    imageData: document.imageData ?? undefined,
    contentType: document.contentType ?? undefined,
    imageUri: document.imageData
      ? `data:${document.contentType ?? 'image/jpeg'};base64,${document.imageData}`
      : undefined,
  };
}

function toPersistedDocuments(documents: VaultDocument[]) {
  return documents.map(({ imageData: _imageData, imageUri, ...document }) => ({
    ...document,
    ...(imageUri && !imageUri.startsWith('data:') ? { imageUri } : {}),
  }));
}

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);
  const [ownerKey, setOwnerKey] = useState<string | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [documents, setDocuments] = useState<VaultDocument[]>(starterDocuments);
  const [auditItems, setAuditItems] = useState<AuditItem[]>(starterAudit);
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [smartFillEnabled, setSmartFillEnabled] = useState(true);
  const documentsQuery = useListVaultDocuments(
    { ownerKey: ownerKey ?? 'pending-owner-key' },
    {
      query: {
        enabled: Boolean(ownerKey && ready),
        queryKey: getListVaultDocumentsQueryKey({ ownerKey: ownerKey ?? 'pending-owner-key' }),
      },
    },
  );
  const upsertDocument = useUpsertVaultDocument();
  const deleteDocumentRemote = useDeleteVaultDocument();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(async (stored) => {
      let parsed: Partial<PersistedVaultState> = {};
      if (stored) {
        try {
          parsed = JSON.parse(stored) as Partial<PersistedVaultState>;
        } catch {
          parsed = {};
        }
      }
      const nextOwnerKey = parsed.ownerKey ?? createOwnerKey();
      setOwnerKey(nextOwnerKey);
      if (!parsed.ownerKey) {
        await AsyncStorage.mergeItem(STORAGE_KEY, JSON.stringify({ ownerKey: nextOwnerKey }));
      }
      setHasOnboarded(Boolean(parsed.hasOnboarded));
      if (parsed.documents) setDocuments(parsed.documents);
      if (parsed.auditItems) setAuditItems(parsed.auditItems);
      if (typeof parsed.biometricEnabled === 'boolean') setBiometricEnabled(parsed.biometricEnabled);
      if (typeof parsed.smartFillEnabled === 'boolean') setSmartFillEnabled(parsed.smartFillEnabled);
    }).catch(() => {
      setOwnerKey(createOwnerKey());
    }).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!documentsQuery.data) return;
    const remoteDocuments = documentsQuery.data.map(toLocalDocument);
    const remoteById = new Map(remoteDocuments.map((document) => [document.id, document]));
    const starterIds = new Set(starterDocuments.map((document) => document.id));
    setDocuments((current) => {
      const currentById = new Map(current.map((document) => [document.id, document]));
      return [
        ...starterDocuments.map((starter) => remoteById.get(starter.id) ?? currentById.get(starter.id) ?? starter),
        ...remoteDocuments.filter((document) => !starterIds.has(document.id)),
      ];
    });
  }, [documentsQuery.data]);

  const persist = async (next: Partial<PersistedVaultState>) => {
    await AsyncStorage.mergeItem(STORAGE_KEY, JSON.stringify(next));
  };

  const completeOnboarding = async () => {
    setHasOnboarded(true);
    await persist({ hasOnboarded: true });
  };

  const addDocument = async (document: VaultDocument) => {
    if (!ownerKey) throw new Error('Vault is still being prepared');
    const saved = await upsertDocument.mutateAsync({
      documentId: document.id,
      data: {
        ownerKey,
        type: document.type,
        label: document.label,
        status: document.status,
        identifier: document.identifier,
        updated: document.updated,
        icon: document.icon,
        color: document.color,
        imageData: document.imageData ?? null,
        contentType: document.contentType ?? null,
      },
    });
    const savedDocument = toLocalDocument(saved);
    const next = documents.map((item) => item.id === savedDocument.id ? savedDocument : item);
    if (!documents.some((item) => item.id === savedDocument.id)) next.push(savedDocument);
    setDocuments(next);
    await persist({ documents: toPersistedDocuments(next) });
    await queryClient.invalidateQueries({ queryKey: getListVaultDocumentsQueryKey({ ownerKey }) });
  };

  const deleteDocument = async (id: string) => {
    if (!ownerKey) throw new Error('Vault is still being prepared');
    await deleteDocumentRemote.mutateAsync({ documentId: id, data: { ownerKey } });
    const next = documents.map((item) => item.id === id ? { ...item, status: 'Not added' as const, identifier: 'Ready when you are', imageUri: undefined } : item);
    setDocuments(next);
    await persist({ documents: toPersistedDocuments(next) });
    await queryClient.invalidateQueries({ queryKey: getListVaultDocumentsQueryKey({ ownerKey }) });
    await addAudit('Document removed', 'The document was deleted from your vault', 'trash-outline');
  };

  const toggleBiometric = async () => {
    const next = !biometricEnabled;
    setBiometricEnabled(next);
    await persist({ biometricEnabled: next });
  };

  const toggleSmartFill = async () => {
    const next = !smartFillEnabled;
    setSmartFillEnabled(next);
    await persist({ smartFillEnabled: next });
  };

  const addAudit = async (title: string, detail: string, icon: string) => {
    const next = [{ id: Date.now().toString(), title, detail, time: 'Just now', icon }, ...auditItems].slice(0, 8);
    setAuditItems(next);
    await persist({ auditItems: next });
  };

  const resetVault = async () => {
    setHasOnboarded(false);
    setDocuments(starterDocuments);
    setAuditItems(starterAudit);
    setBiometricEnabled(true);
    setSmartFillEnabled(true);
    await AsyncStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(() => ({
    ready,
    hasOnboarded,
    documents,
    auditItems,
    biometricEnabled,
    smartFillEnabled,
    completeOnboarding,
    addDocument,
    deleteDocument,
    toggleBiometric,
    toggleSmartFill,
    addAudit,
    resetVault,
  }), [ready, hasOnboarded, documents, auditItems, biometricEnabled, smartFillEnabled]);

  return <VaultContext.Provider value={value}>{children}</VaultContext.Provider>;
}

export function useVault() {
  const value = useContext(VaultContext);
  if (!value) throw new Error('useVault must be used inside VaultProvider');
  return value;
}