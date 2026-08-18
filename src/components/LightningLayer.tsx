import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LayerAssetCard } from './LayerAssetCard'
import { PlusMenu } from './PlusMenu'

type LightningLayerProps = {
  open: boolean
  onToggle: () => void
  onMessage: (message: string) => void
}

export function LightningLayer({ open, onToggle, onMessage }: LightningLayerProps) {
  const { t } = useTranslation()
  const [plusOpen, setPlusOpen] = useState(false)

  const titleBar = (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      title={open ? t('layers.closeLayer') : t('layers.openLayer')}
      className="group relative flex w-full items-center justify-center px-4 py-3"
    >
      <h2 className="text-xl font-semibold tracking-tight transition group-hover:text-accent md:text-2xl">
        {t('layers.lightning')}
      </h2>
      <span className="absolute right-4 text-sm text-text-muted transition group-hover:text-accent">
        {open ? '▴' : '▾'}
      </span>
    </button>
  )

  if (!open) {
    return <section className="shrink-0 border-b border-border bg-bg-primary">{titleBar}</section>
  }

  return (
    <section className="relative min-h-0 flex-1 overflow-hidden bg-bg-primary">
      <div className="absolute inset-x-0 top-0 z-10">{titleBar}</div>

      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-text-muted">{t('layers.lightningPlaceholder')}</p>
      </div>

      <LayerAssetCard
        title={t('assets.nodes')}
        action={
          <PlusMenu
            open={plusOpen}
            onToggle={() => setPlusOpen((value) => !value)}
            label={t('assets.addNode')}
            items={[
              {
                label: t('assets.addNode'),
                onClick: () => onMessage(t('assets.soon')),
              },
            ]}
          />
        }
      >
        <p className="px-2 py-2 text-sm text-text-muted">{t('assets.noNodes')}</p>
      </LayerAssetCard>
    </section>
  )
}
