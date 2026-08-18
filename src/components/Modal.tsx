import { useEffect, type ReactNode } from 'react'

type ModalProps = {
  title: string
  subtitle?: string
  closeLabel: string
  onClose: () => void
  children: ReactNode
}

export function Modal({ title, subtitle, closeLabel, onClose, children }: ModalProps) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-border bg-bg-panel p-4 shadow-xl"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold tracking-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-text-muted">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-text-muted transition hover:border-accent/60 hover:text-text-primary"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
