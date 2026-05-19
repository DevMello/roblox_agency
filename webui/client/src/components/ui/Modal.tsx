import { useEffect, type ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="palette-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      style={{ alignItems: 'center', paddingTop: 0 }}
    >
      {/* Backdrop click-to-close */}
      <div
        style={{ position: 'absolute', inset: 0 }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="palette"
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <h2
            id="modal-title"
            style={{
              fontFamily: 'var(--f-display)',
              fontSize: '15px',
              fontWeight: 600,
              margin: 0,
              color: 'var(--ink)',
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            aria-label="Close"
            style={{ padding: '4px 6px' }}
          >
            <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06z" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 16px',
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px',
              padding: '14px 16px',
              borderTop: '1px solid var(--border)',
              flexShrink: 0,
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
