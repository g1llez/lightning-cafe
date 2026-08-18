import { useTranslation } from 'react-i18next'

type AssetsPanelProps = {
  onSoon: () => void
}

export function AssetsPanel({ onSoon }: AssetsPanelProps) {
  const { t } = useTranslation()

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-border bg-bg-secondary md:w-64 md:border-r md:border-b-0">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
          {t('assets.title')}
        </h2>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="text-sm leading-relaxed text-text-muted">{t('assets.empty')}</p>

        <button
          type="button"
          onClick={onSoon}
          className="rounded-md border border-dashed border-border bg-bg-panel px-3 py-2 text-left text-sm transition hover:border-accent/60"
        >
          {t('assets.addWallet')}
        </button>

        <button
          type="button"
          onClick={onSoon}
          className="rounded-md border border-dashed border-border bg-bg-panel px-3 py-2 text-left text-sm transition hover:border-accent/60"
        >
          {t('assets.addNode')}
        </button>
      </div>
    </aside>
  )
}
