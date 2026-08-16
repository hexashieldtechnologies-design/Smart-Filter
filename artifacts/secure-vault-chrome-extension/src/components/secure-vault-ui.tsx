import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  CloudOff,
  Database,
  FileKey2,
  Fingerprint,
  Globe2,
  KeyRound,
  LockKeyhole,
  Pause,
  Play,
  RefreshCw,
  ScanLine,
  Shield,
  ShieldCheck,
  SlidersHorizontal,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'wouter';
import { maskValue } from '@/shared/redaction';
import type { FieldMatch } from '@/shared/types';
import {
  confirmFill,
  getVaultStatus,
  importEncryptedVault,
  isExtensionRuntimeAvailable,
  startSmartFill,
  unlockVault,
} from '@/popup/runtime';
import type {
  FieldSensitivity,
  PageContext,
  PopupStage,
  SemanticMatch,
  VaultMetadata,
  VaultMode,
} from '@/types/vault';

const vaultMetadata: VaultMetadata = {
  name: 'Personal identity vault',
  version: 'v2.4',
  entries: 18,
  importedAt: '14 Mar 2025',
  fingerprint: '7C9A · 2F41 · E8D0',
};

const pageContext: PageContext = {
  origin: 'accounts.northstar.test',
  title: 'Northstar — Create workspace',
  secure: true,
  supported: true,
  sessionFresh: true,
};

const initialMatches: SemanticMatch[] = [
  { id: 'name', fieldLabel: 'Full name', semanticKey: 'identity.full_name', valuePreview: 'Avery Morgan', confidence: 98, sensitivity: 'standard', approved: true },
  { id: 'email', fieldLabel: 'Work email', semanticKey: 'identity.email', valuePreview: 'avery.morgan@…', confidence: 96, sensitivity: 'standard', approved: true },
  { id: 'company', fieldLabel: 'Company', semanticKey: 'identity.organization', valuePreview: 'Lumen Fieldworks', confidence: 91, sensitivity: 'standard', approved: true },
  { id: 'phone', fieldLabel: 'Phone number', semanticKey: 'identity.phone', valuePreview: '+1 (415) 555-…', confidence: 87, sensitivity: 'sensitive', approved: false },
];

function Mark({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? 'vault-mark vault-mark-small' : 'vault-mark'} aria-hidden="true">
      <span className="vault-mark-shield"><Shield size={small ? 15 : 20} strokeWidth={2.4} /></span>
      <span className="vault-mark-dot" />
    </span>
  );
}

function StatusPill({ children, tone = 'teal' }: { children: ReactNode; tone?: 'teal' | 'amber' | 'red' | 'slate' }) {
  return <span className={`status-pill status-pill-${tone}`}>{children}</span>;
}

function Button({
  children,
  onClick,
  variant = 'primary',
  className = '',
  disabled = false,
  type = 'button',
  testId,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'quiet' | 'outline' | 'danger';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
  testId: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-testid={testId}
      className={`vault-button vault-button-${variant} ${className}`}
    >
      {children}
    </button>
  );
}

function PageSignal({ context, onOpenWarning }: { context: PageContext; onOpenWarning: () => void }) {
  return (
    <div className="page-signal" data-testid="card-page-signal">
      <div className="page-signal-icon"><Globe2 size={16} /></div>
      <div className="min-w-0 flex-1">
        <div className="page-signal-overline">Current page</div>
       <div className="page-signal-origin" data-testid="text-page-origin">{context.origin}</div>
      </div>
      <button className="signal-secure" onClick={onOpenWarning} data-testid="button-review-origin">
        <span className="signal-dot" />
        Verified
        <CircleHelp size={13} />
      </button>
    </div>
  );
}

function ScanIllustration({ active = false }: { active?: boolean }) {
  return (
    <div className={`scan-illustration ${active ? 'scan-illustration-active' : ''}`} aria-hidden="true">
      <div className="scan-corner scan-corner-tl" />
      <div className="scan-corner scan-corner-tr" />
      <div className="scan-corner scan-corner-bl" />
      <div className="scan-corner scan-corner-br" />
      <div className="scan-orbit scan-orbit-one" />
      <div className="scan-orbit scan-orbit-two" />
      <div className="scan-core"><ScanLine size={27} /></div>
      {active && <div className="scan-line vault-scan-line" />}
    </div>
  );
}

function MatchRow({
  match,
  onToggle,
}: {
  match: SemanticMatch;
  onToggle: (id: string) => void;
}) {
  const sensitivityLabel: Record<FieldSensitivity, string> = {
    standard: 'Standard',
    sensitive: 'Sensitive',
    blocked: 'Not fillable',
  };
  return (
    <div className={`match-row ${match.sensitivity === 'sensitive' ? 'match-row-sensitive' : ''}`} data-testid={`row-match-${match.id}`}>
      <button
        className={`match-check ${match.approved ? 'match-check-on' : ''}`}
        aria-label={`${match.approved ? 'Remove' : 'Approve'} ${match.fieldLabel}`}
        onClick={() => onToggle(match.id)}
        data-testid={`button-toggle-match-${match.id}`}
      >
        {match.approved && <Check size={14} strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="match-label">{match.fieldLabel}</div>
        <div className="match-key">{match.semanticKey}</div>
      </div>
      <div className="match-value-wrap">
        <div className="match-value">{match.valuePreview}</div>
        <div className={`match-confidence ${match.sensitivity === 'sensitive' ? 'match-confidence-warn' : ''}`}>
          {match.sensitivity === 'sensitive' && <KeyRound size={11} />}
          {sensitivityLabel[match.sensitivity]} · {match.confidence}%
        </div>
      </div>
    </div>
  );
}

function BrandHeader({ wide = false, onOpenOptions }: { wide?: boolean; onOpenOptions?: () => void }) {
  return (
    <header className={`brand-header ${wide ? 'brand-header-wide' : ''}`}>
      <Link href="/" className="brand-link" data-testid="link-home">
        <Mark small={!wide} />
        <span className="brand-wordmark">
          <strong>Secure Vault</strong>
          <span>Smart Fill</span>
        </span>
      </Link>
      {wide ? (
        <div className="header-actions">
          <span className="local-badge"><CloudOff size={13} /> Local only</span>
          <button className="icon-button" onClick={onOpenOptions} aria-label="Open extension popup" data-testid="button-open-popup">
            <ArrowLeft size={17} />
          </button>
        </div>
      ) : (
        <button className="icon-button" onClick={onOpenOptions} aria-label="Open vault settings" data-testid="button-open-settings">
          <SlidersHorizontal size={17} />
        </button>
      )}
    </header>
  );
}

function TrustFooter() {
  return (
    <div className="trust-footer" data-testid="text-trust-footer">
      <ShieldCheck size={14} />
      <span>Never submits forms</span>
      <span className="trust-separator">·</span>
      <span>No passwords, OTPs, CAPTCHAs, or payment fields</span>
    </div>
  );
}

function OriginWarning({ context, onClose, onContinue }: { context: PageContext; onClose: () => void; onContinue: () => void }) {
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" aria-labelledby="origin-warning-title">
      <div className="modal-card vault-appear" data-testid="dialog-origin-warning">
        <button className="modal-close" onClick={onClose} aria-label="Close warning" data-testid="button-close-warning"><X size={17} /></button>
        <div className="modal-symbol modal-symbol-amber"><AlertTriangle size={21} /></div>
        <div className="modal-kicker">Before you continue</div>
        <h2 id="origin-warning-title">Confirm this page</h2>
        <p className="modal-copy">Smart Fill can write into fields on this page, but it will never press Submit. Confirm that you recognize this origin and session.</p>
        <div className="origin-proof">
           <div className="origin-proof-line"><Globe2 size={15} /><span>{context.origin}</span><StatusPill tone={context.secure ? 'teal' : 'amber'}>{context.secure ? 'HTTPS' : 'HTTP'}</StatusPill></div>
          <div className="origin-proof-line origin-proof-muted"><Fingerprint size={15} /><span>Session started 2 minutes ago</span></div>
        </div>
        <div className="modal-actions">
          <Button variant="quiet" onClick={onClose} testId="button-cancel-warning">Cancel</Button>
          <Button onClick={onContinue} testId="button-confirm-origin">I recognize this page <ArrowRight size={15} /></Button>
        </div>
      </div>
    </div>
  );
}

function SensitiveConfirmation({ matches, onApprove, onCancel }: { matches: SemanticMatch[]; onApprove: () => void; onCancel: () => void }) {
  const sensitive = matches.filter((match) => match.sensitivity === 'sensitive');
  return (
    <div className="modal-scrim" role="dialog" aria-modal="true" aria-labelledby="sensitive-title">
      <div className="modal-card vault-appear" data-testid="dialog-sensitive-confirmation">
        <div className="modal-symbol modal-symbol-teal"><KeyRound size={21} /></div>
        <div className="modal-kicker">Explicit approval required</div>
        <h2 id="sensitive-title">One sensitive field is ready</h2>
        <p className="modal-copy">Review this value before Smart Fill writes it into the page. Sensitive values are never copied to the clipboard.</p>
        <div className="sensitive-review">
          {sensitive.map((match) => (
            <div key={match.id} className="sensitive-review-row">
              <span>{match.fieldLabel}</span>
              <span className="sensitive-value">{match.valuePreview}</span>
            </div>
          ))}
        </div>
        <div className="modal-note"><ShieldCheck size={14} /> Your approval applies to this page only.</div>
        <div className="modal-actions">
          <Button variant="quiet" onClick={onCancel} testId="button-cancel-sensitive">Skip sensitive field</Button>
          <Button onClick={onApprove} testId="button-approve-sensitive">Approve & fill <Check size={15} /></Button>
        </div>
      </div>
    </div>
  );
}

function VaultSetup({ locked, onUnlock, onImport }: { locked: boolean; onUnlock: (passphrase: string) => void; onImport: (file: File) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [passphrase, setPassphrase] = useState('');
  return (
    <div className="setup-state vault-appear" data-testid="section-vault-setup">
      <div className="setup-icon"><FileKey2 size={28} /></div>
      <div className="setup-kicker">{locked ? 'Vault locked' : 'No vault connected'}</div>
      <h1>{locked ? 'Unlock your local vault' : 'Bring your identity vault'}</h1>
      <p>{locked ? 'Your encrypted vault is here, but its contents stay closed until you unlock it.' : 'Import an encrypted vault file to begin matching identity fields on the pages you visit.'}</p>
      {locked ? (
        <>
          <label className="field-label" htmlFor="vault-passphrase">Vault passphrase</label>
           <input id="vault-passphrase" className="vault-input" type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} placeholder="Enter passphrase" data-testid="input-vault-passphrase" />
           <Button className="w-full" onClick={() => onUnlock(passphrase)} disabled={!passphrase} testId="button-unlock-vault"><LockKeyhole size={16} /> Unlock locally</Button>
           <button className="text-button" onClick={() => fileRef.current?.click()} data-testid="button-replace-vault">Replace vault file</button>
        </>
      ) : (
        <>
          <input
            ref={fileRef}
            className="sr-only"
            type="file"
             accept=".vault"
             onChange={(event) => {
               const file = event.target.files?.[0];
               setFileName(file?.name ?? '');
               if (file) onImport(file);
             }}
            data-testid="input-vault-file"
          />
          <Button className="w-full" onClick={() => fileRef.current?.click()} testId="button-select-vault"><Upload size={16} /> {fileName || 'Choose encrypted vault'}</Button>
          <div className="setup-or"><span>or</span></div>
          <button className="drop-zone" onClick={() => fileRef.current?.click()} data-testid="button-drop-vault">
            <span>Drop a .vault file here</span>
            <small>Nothing leaves this device</small>
          </button>
        </>
      )}
      <div className="setup-assurance"><CloudOff size={14} /><span>Encrypted at rest · local processing only</span></div>
    </div>
  );
}

export function PopupExperience({ onOpenOptions }: { onOpenOptions: () => void }) {
  const extensionRuntime = isExtensionRuntimeAvailable();
  const [vaultMode, setVaultMode] = useState<VaultMode>(() => extensionRuntime ? 'no-vault' : 'ready');
  const [stage, setStage] = useState<PopupStage>('ready');
  const [matches, setMatches] = useState(initialMatches);
  const [currentPage, setCurrentPage] = useState(pageContext);
  const [showOriginWarning, setShowOriginWarning] = useState(false);
  const [showSensitive, setShowSensitive] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string>();

  const approvedCount = matches.filter((match) => match.approved).length;

  useEffect(() => {
    if (!extensionRuntime) return;
    let active = true;
    void getVaultStatus().then((response) => {
      if (!active || !response.ok) return;
      setVaultMode(response.data.state === 'no_vault' ? 'no-vault' : response.data.state);
    });
    return () => {
      active = false;
    };
  }, [extensionRuntime]);

  const toggleMatch = (id: string) => {
    setMatches((current) => current.map((match) => match.id === id ? { ...match, approved: !match.approved } : match));
  };

  const handleImport = (file: File) => {
    if (!extensionRuntime) {
      setVaultMode('ready');
      return;
    }
    void importEncryptedVault(file).then((response) => {
      if (!response.ok) {
        setRuntimeError(response.message);
        return;
      }
      setRuntimeError(undefined);
      setVaultMode('locked');
    }).catch(() => setRuntimeError('The encrypted vault could not be imported.'));
  };

  const handleUnlock = (passphrase: string) => {
    if (!extensionRuntime) {
      setVaultMode('ready');
      return;
    }
    void unlockVault(passphrase).then((response) => {
      if (!response.ok) {
        setRuntimeError(response.message);
        return;
      }
      setRuntimeError(undefined);
      setVaultMode('ready');
    }).catch(() => setRuntimeError('The vault could not be unlocked.'));
  };

  const matchesFromPlan = (fields: FieldMatch[]): SemanticMatch[] => fields.map((field) => ({
    id: field.fieldId,
    fieldLabel: field.label,
    semanticKey: field.semanticType,
    valuePreview: field.valueAvailable
      ? field.sensitive
        ? maskValue(field.semanticType, field.value)
        : field.value ?? 'Available locally'
      : 'Unavailable',
    confidence: Math.round(field.confidence * 100),
    sensitivity: field.status === 'blocked' || field.status === 'unsupported' ? 'blocked' : field.sensitive ? 'sensitive' : 'standard',
    approved: field.selected,
  }));

  const startScan = () => {
    setStage('scanning');
    if (extensionRuntime) {
      void startSmartFill().then((response) => {
        if (!response.ok) {
          setRuntimeError(response.message);
          setStage(response.errorCode === 'UNSUPPORTED_PAGE' ? 'unsupported' : 'ready');
          return;
        }
        setRuntimeError(undefined);
        setCurrentPage((current) => ({
          ...current,
          origin: response.data.session.origin,
          secure: response.data.session.origin.startsWith('https://'),
        }));
        setMatches(matchesFromPlan(response.data.plan.fields));
        setStage('review');
      }).catch(() => {
        setRuntimeError('The current page could not be inspected.');
        setStage('ready');
      });
      return;
    }
    setTimeout(() => setStage('review'), 900);
  };

  const performFill = (includeSensitive: boolean) => {
    setShowSensitive(false);
    setStage('filling');
    if (!extensionRuntime) {
      setTimeout(() => setStage('complete'), 1100);
      return;
    }
    const fieldIds = matches.filter((match) => match.approved && match.sensitivity === 'standard').map((match) => match.id);
    const sensitiveFieldIds = includeSensitive
      ? matches.filter((match) => match.approved && match.sensitivity === 'sensitive').map((match) => match.id)
      : [];
    void confirmFill(fieldIds, sensitiveFieldIds).then((response) => {
      if (!response.ok) {
        setRuntimeError(response.message);
        setStage('review');
        return;
      }
      setRuntimeError(undefined);
      setStage('complete');
    }).catch(() => {
      setRuntimeError('The page did not accept the approved fill plan.');
      setStage('review');
    });
  };

  const beginFill = () => {
    if (matches.some((match) => match.sensitivity === 'sensitive' && match.approved)) {
      setShowSensitive(true);
    } else {
      performFill(false);
    }
  };

  const completeFill = () => {
    performFill(true);
  };

  if (vaultMode !== 'ready') {
    return (
      <main className="popup-frame vault-shell grid-paper">
        <BrandHeader onOpenOptions={onOpenOptions} />
         <VaultSetup locked={vaultMode === 'locked'} onUnlock={handleUnlock} onImport={handleImport} />
        <TrustFooter />
      </main>
    );
  }

  return (
    <main className="popup-frame vault-shell">
      <BrandHeader onOpenOptions={onOpenOptions} />
      <div className="popup-content">
        {stage === 'complete' ? (
          <section className="complete-state vault-appear" data-testid="section-complete-summary">
            <div className="complete-mark"><CheckCircle2 size={31} /></div>
            <div className="setup-kicker">Verified fill complete</div>
            <h1>Fields written. Nothing submitted.</h1>
             <p>Smart Fill updated {approvedCount} approved fields on {currentPage.origin} and left the page ready for your review.</p>
            <div className="complete-stats">
              <div><strong>{approvedCount}</strong><span>fields filled</span></div>
              <div><strong>0</strong><span>forms submitted</span></div>
              <div><strong>0</strong><span>secrets exposed</span></div>
            </div>
            <div className="complete-next"><ShieldCheck size={15} /><span>Check the page, then submit yourself when ready.</span></div>
            <Button className="w-full" variant="outline" onClick={() => setStage('ready')} testId="button-scan-another">Scan page again <RefreshCw size={15} /></Button>
          </section>
        ) : stage === 'filling' || stage === 'paused' ? (
          <section className="filling-state vault-appear" data-testid="section-filling-status">
            <div className={`filling-ring ${stage === 'paused' ? 'filling-ring-paused' : ''}`}><Zap size={26} /></div>
            <div className="setup-kicker">{stage === 'paused' ? 'Fill paused' : 'Writing approved fields'}</div>
            <h1>{stage === 'paused' ? 'Page is waiting' : 'Carefully filling the page'}</h1>
            <p>{stage === 'paused' ? 'No more fields will be changed until you resume this session.' : 'Smart Fill writes one field at a time and will stop before any sensitive value.'}</p>
            <div className="progress-track"><span style={{ width: stage === 'paused' ? '46%' : '72%' }} /></div>
             <div className="fill-progress-copy"><span>{stage === 'paused' ? '2 of 4 fields written' : '3 of 4 fields written'}</span><span>{currentPage.origin}</span></div>
            <Button variant={stage === 'paused' ? 'primary' : 'quiet'} className="w-full" onClick={() => stage === 'paused' ? setStage('filling') : setStage('paused')} testId="button-toggle-pause">
              {stage === 'paused' ? <><Play size={15} /> Resume fill</> : <><Pause size={15} /> Pause fill</>}
            </Button>
          </section>
        ) : (
          <>
             <PageSignal context={currentPage} onOpenWarning={() => setShowOriginWarning(true)} />
             {runtimeError && <div className="review-note review-note-error" role="status"><AlertTriangle size={15} /><span>{runtimeError}</span></div>}
            {stage === 'ready' && (
              <section className="scan-hero vault-appear" data-testid="section-ready-scan">
                <ScanIllustration />
                <div className="setup-kicker">Ready to inspect</div>
                <h1>Find the fields.<br /><em>Keep the control.</em></h1>
                <p>Smart Fill reads the page structure, not its contents. You decide what gets written.</p>
                <Button className="scan-cta" onClick={startScan} testId="button-scan-page"><ScanLine size={16} /> Inspect page <span className="button-shortcut">Enter</span></Button>
              </section>
            )}
            {stage === 'scanning' && (
              <section className="scan-hero scan-hero-scanning vault-appear" data-testid="section-active-scan">
                <ScanIllustration active />
                <div className="setup-kicker">Inspecting structure</div>
                <h1>Looking for<br /><em>semantic matches</em></h1>
                <p>Reading labels and field intent locally. Values are still locked in your vault.</p>
                <div className="scan-status-line"><span className="status-dot-live" /> Mapping page structure <span className="vault-spin"><RefreshCw size={13} /></span></div>
              </section>
            )}
            {(stage === 'review' || stage === 'sensitive-confirmation') && (
              <section className="review-state vault-appear" data-testid="section-match-review">
                <div className="review-heading">
                  <div>
                    <div className="setup-kicker">Review before writing</div>
                    <h1>{approvedCount} matches <em>found</em></h1>
                  </div>
                  <StatusPill>{approvedCount} approved</StatusPill>
                </div>
                <div className="review-note"><ShieldCheck size={15} /><span>Only approved fields are eligible. Sensitive fields always ask again.</span></div>
                <div className="match-list">
                  {matches.map((match) => <MatchRow key={match.id} match={match} onToggle={toggleMatch} />)}
                </div>
                <div className="review-actions">
                  <Button variant="quiet" onClick={() => setStage('ready')} testId="button-cancel-review">Cancel</Button>
                  <Button onClick={beginFill} disabled={!approvedCount} testId="button-fill-approved">Fill {approvedCount} approved <ArrowRight size={15} /></Button>
                </div>
              </section>
            )}
            {(stage === 'unsupported' || stage === 'origin-warning') && (
              <section className="exception-state vault-appear" data-testid={`section-${stage}`}>
                <div className="exception-icon"><AlertTriangle size={27} /></div>
                <div className="setup-kicker">No action taken</div>
                <h1>{stage === 'unsupported' ? 'This page is not supported' : 'Session needs a second look'}</h1>
                <p>{stage === 'unsupported' ? 'Smart Fill cannot safely identify fields on this page. Your vault remains closed and untouched.' : 'The page origin or session changed since your last review. Start a fresh inspection before filling.'}</p>
                <Button variant="outline" onClick={() => setStage('ready')} testId="button-return-safe">Return to safe state</Button>
              </section>
            )}
          </>
        )}
      </div>
      {stage !== 'complete' && stage !== 'filling' && stage !== 'paused' && <TrustFooter />}
       {showOriginWarning && <OriginWarning context={currentPage} onClose={() => setShowOriginWarning(false)} onContinue={() => { setShowOriginWarning(false); setStage('review'); }} />}
      {showSensitive && <SensitiveConfirmation matches={matches} onApprove={completeFill} onCancel={() => { setShowSensitive(false); setStage('review'); }} />}
    </main>
  );
}

function SideNav({ active, onSelect }: { active: string; onSelect: (item: string) => void }) {
  const items = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'vault', label: 'Vault file', icon: Database },
    { id: 'activity', label: 'Fill activity', icon: ClipboardCheck },
  ];
  return (
    <aside className="options-nav">
      <BrandHeader wide onOpenOptions={() => onSelect('popup')} />
      <div className="nav-section-label">Manage</div>
      <nav aria-label="Management sections">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} className={`nav-item ${active === item.id ? 'nav-item-active' : ''}`} onClick={() => onSelect(item.id)} data-testid={`button-nav-${item.id}`}>
              <Icon size={17} /><span>{item.label}</span>{active === item.id && <span className="nav-active-bar" />}
            </button>
          );
        })}
      </nav>
      <div className="nav-bottom">
        <div className="nav-local-note"><CloudOff size={15} /><div><strong>Local by design</strong><span>Vault data never syncs.</span></div></div>
        <div className="nav-version">SECURE VAULT <span>0.8.1</span></div>
      </div>
    </aside>
  );
}

function OverviewPanel({ onOpenPopup }: { onOpenPopup: () => void }) {
  const [demoMode, setDemoMode] = useState<VaultMode>('ready');
  const [expanded, setExpanded] = useState(false);
  const modeLabels: Record<VaultMode, string> = { ready: 'Ready', locked: 'Locked', 'no-vault': 'No vault' };
  return (
    <div className="options-panel">
      <div className="options-topline">
        <div><div className="setup-kicker">Extension settings</div><h1>Control the handoff.</h1><p className="options-intro">Secure Vault keeps the boundary clear between what your vault knows and what a page asks for.</p></div>
        <Button variant="outline" onClick={onOpenPopup} testId="button-preview-popup"><ArrowLeft size={15} /> Open popup</Button>
      </div>
      <div className="management-grid">
        <section className="management-card management-card-hero" data-testid="card-vault-status">
          <div className="card-heading"><div><div className="card-kicker">Vault status</div><h2>Personal identity vault</h2></div><StatusPill>{modeLabels[demoMode]}</StatusPill></div>
          <div className="vault-health"><div className="health-visual"><div className="health-ring"><ShieldCheck size={26} /></div></div><div><strong>{demoMode === 'ready' ? 'Ready for review' : demoMode === 'locked' ? 'Contents are sealed' : 'Import required'}</strong><span>{demoMode === 'ready' ? 'Local vault is unlocked for this browser session.' : demoMode === 'locked' ? 'Unlock the vault before inspecting a page.' : 'Choose an encrypted .vault file to get started.'}</span></div></div>
          <div className="metadata-strip"><div><span>Entries</span><strong>{demoMode === 'no-vault' ? '—' : vaultMetadata.entries}</strong></div><div><span>Format</span><strong>{demoMode === 'no-vault' ? '—' : vaultMetadata.version}</strong></div><div><span>Fingerprint</span><strong className="font-mono">{demoMode === 'no-vault' ? '—' : vaultMetadata.fingerprint}</strong></div></div>
          <div className="demo-switcher"><span>Preview a vault state</span>{(['ready', 'locked', 'no-vault'] as VaultMode[]).map((mode) => <button key={mode} className={demoMode === mode ? 'demo-choice-active' : ''} onClick={() => setDemoMode(mode)} data-testid={`button-demo-${mode}`}>{modeLabels[mode]}</button>)}</div>
        </section>
        <section className="management-card management-card-boundary" data-testid="card-boundary">
          <div className="card-kicker">Safe boundaries</div><h2>What Smart Fill will not do</h2>
          <div className="boundary-list"><div><span className="boundary-icon boundary-icon-green"><Check size={14} /></span><span>Write only after you approve a match</span></div><div><span className="boundary-icon boundary-icon-green"><Check size={14} /></span><span>Keep processing on this device</span></div><div><span className="boundary-icon boundary-icon-red"><X size={14} /></span><span>Handle passwords, OTPs, CAPTCHAs, or payments</span></div><div><span className="boundary-icon boundary-icon-red"><X size={14} /></span><span>Submit a form or navigate on your behalf</span></div></div>
          <button className="disclosure-button" onClick={() => setExpanded(!expanded)} data-testid="button-toggle-boundaries"><span>Read the privacy promise</span><ChevronDown size={16} className={expanded ? 'rotate-180' : ''} /></button>
          {expanded && <p className="disclosure-copy vault-appear">The extension only receives semantic field labels from the active page. Encrypted vault values remain local, and each sensitive field requires a fresh approval.</p>}
        </section>
        <section className="management-card recent-card" data-testid="card-recent-activity">
          <div className="card-heading"><div><div className="card-kicker">Latest activity</div><h2>Quiet, deliberate fills</h2></div><span className="activity-count">3 this week</span></div>
          <div className="activity-row"><div className="activity-mark"><CheckCircle2 size={16} /></div><div><strong>Northstar workspace</strong><span>4 fields · 2 minutes ago</span></div><StatusPill>Verified</StatusPill></div>
          <div className="activity-row"><div className="activity-mark"><CheckCircle2 size={16} /></div><div><strong>Harbor billing setup</strong><span>2 fields · Yesterday</span></div><StatusPill>Verified</StatusPill></div>
          <button className="disclosure-button" onClick={() => onOpenPopup()} data-testid="button-view-activity">View in popup <ArrowRight size={16} /></button>
        </section>
      </div>
      <div className="options-bottom-note"><Fingerprint size={16} /><span>Vault fingerprint <strong className="font-mono">{vaultMetadata.fingerprint}</strong></span><span className="note-divider" /><span>Imported {vaultMetadata.importedAt}</span><button className="text-button" data-testid="button-manage-vault">Manage vault file</button></div>
    </div>
  );
}

function VaultFilePanel({ onOpenPopup }: { onOpenPopup: () => void }) {
  const [selected, setSelected] = useState(false);
  return <div className="options-panel"><div className="options-topline"><div><div className="setup-kicker">Vault file</div><h1>One file. One boundary.</h1><p className="options-intro">The encrypted vault is the only source Smart Fill can read from.</p></div><Button variant="outline" onClick={onOpenPopup} testId="button-vault-file-back"><ArrowLeft size={15} /> Back to popup</Button></div><section className="file-management-card" data-testid="section-vault-file"><div className="file-card-icon"><FileKey2 size={26} /></div><div className="card-kicker">Imported vault</div><h2>{selected ? 'identity-vault-2025.vault' : vaultMetadata.name}</h2><p>{selected ? 'A new file is selected and ready to import.' : 'Encrypted locally. No cloud copy exists.'}</p><div className="file-meta-grid"><div><span>Entries</span><strong>{selected ? '24' : vaultMetadata.entries}</strong></div><div><span>Last imported</span><strong>{selected ? 'Not yet' : vaultMetadata.importedAt}</strong></div><div><span>Fingerprint</span><strong className="font-mono">{selected ? '91B2 · 4D09 · C1A8' : vaultMetadata.fingerprint}</strong></div></div><div className="file-actions"><Button onClick={() => setSelected(true)} testId="button-change-vault"><Upload size={15} /> Choose another file</Button><Button variant="quiet" onClick={() => setSelected(false)} testId="button-lock-vault"><LockKeyhole size={15} /> Lock vault</Button></div><div className="file-assurance"><ShieldCheck size={15} /> Imports are parsed in memory, then encrypted at rest.</div></section></div>;
}

function ActivityPanel({ onOpenPopup }: { onOpenPopup: () => void }) {
  return <div className="options-panel"><div className="options-topline"><div><div className="setup-kicker">Fill activity</div><h1>A useful paper trail.</h1><p className="options-intro">A local record of what you approved. Nothing here leaves this device.</p></div><Button variant="outline" onClick={onOpenPopup} testId="button-activity-back"><ArrowLeft size={15} /> Back to popup</Button></div><section className="activity-management-card" data-testid="section-activity-log"><div className="activity-log-header"><span>Recent sessions</span><span>Local record</span></div>{['Northstar workspace', 'Harbor billing setup', 'Cedar team invite', 'Atlas profile'].map((name, index) => <div className="activity-log-row" key={name}><div className="activity-log-number">0{index + 1}</div><div className="activity-mark"><CheckCircle2 size={16} /></div><div className="flex-1"><strong>{name}</strong><span>{index === 0 ? '2 minutes ago' : `${index + 1} days ago`} · {index + 2} approved fields</span></div><span className="font-mono activity-origin">{['northstar.test', 'harbor.test', 'cedar.test', 'atlas.test'][index]}</span><StatusPill>Verified</StatusPill></div>)}</section></div>;
}

export function OptionsExperience({ onOpenPopup }: { onOpenPopup: () => void }) {
  const [active, setActive] = useState('overview');
  const panel = useMemo(() => {
    if (active === 'vault') return <VaultFilePanel onOpenPopup={onOpenPopup} />;
    if (active === 'activity') return <ActivityPanel onOpenPopup={onOpenPopup} />;
    return <OverviewPanel onOpenPopup={onOpenPopup} />;
  }, [active, onOpenPopup]);
  return <main className="options-layout vault-shell"><SideNav active={active} onSelect={(item) => item === 'popup' ? onOpenPopup() : setActive(item)} /><div className="options-main">{panel}<div className="options-privacy-footer"><LockKeyhole size={14} /> Session is ephemeral · closes when this browser session ends</div></div></main>;
}