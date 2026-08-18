import { useTranslation } from 'react-i18next'

export function LightningLayer() {
  const { t } = useTranslation()

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-bg-primary">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-center text-xl font-semibold tracking-tight text-text-primary md:text-2xl">
          {t('layers.lightning')}
        </h2>
      </div>

      <div className="flex flex-1 items-center justify-center p-6">
        <div className="max-w-lg rounded-xl border border-dashed border-border bg-bg-secondary/70 px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-bg-panel text-2xl text-accent">
            ⚡
          </div>
          <p className="text-sm leading-relaxed text-text-muted">{t('layers.lightningPlaceholder')}</p>
        </div>
      </div>
    </section>
  )
}
