import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  /** Label shown on the confirm button while `onConfirm` is running. */
  busyLabel?: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
    </svg>
  );
}

/** Destructive-action confirmation. Bottom sheet on mobile, centered dialog on desktop. */
export default function ConfirmDialog({
  title,
  children,
  confirmLabel,
  busyLabel = 'Working…',
  onConfirm,
  onClose,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Focus the safe choice so a stray Enter never confirms
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setBusy(false);
    }
  }

  return createPortal(
    <div
      className="sheet-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <div
        className="sheet confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-body"
      >
        <div className="sheet-handle" aria-hidden />
        <div className="confirm-icon">
          <TrashIcon />
        </div>
        <h2 id="confirm-title" className="sheet-title">
          {title}
        </h2>
        <div id="confirm-body" className="confirm-body">
          {children}
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="confirm-actions">
          <button
            ref={cancelRef}
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="button" className="btn btn-danger" disabled={busy} onClick={confirm}>
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
