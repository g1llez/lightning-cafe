import type { ReactNode } from 'react'

type LayerAssetCardProps = {
  title: string
  action?: ReactNode
  onBack?: () => void
  backLabel?: string
  children: ReactNode
}

/** Panel chrome only — parent positions (wallet stack, L2, …). */
export function LayerAssetCard({ title, action, onBack, backLabel, children }: LayerAssetCardProps) {
  return (
    <div className="w-full rounded-lg border border-border bg-bg-panel/95 p-3 shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label={backLabel}
              className="shrink-0 text-sm leading-none text-text-muted transition hover:text-accent"
            >
              ‹
            </button>
          )}
          <span className="truncate text-xs leading-none uppercase tracking-[0.14em] text-text-muted">
            {title}
          </span>
        </div>
        {action}
      </div>
      <div className="max-h-96 overflow-y-auto">{children}</div>
    </div>
  )
}
