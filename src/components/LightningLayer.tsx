import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LayerAssetCard } from './LayerAssetCard'

type LightningLayerProps = {
  onMessage: (message: string) => void
}

export function LightningLayer({ onMessage }: LightningLayerProps) {
  const { t } = useTranslation()
  const [plusOpen, setPlusOpen] = useState(false)

  return (
    <section className="relative min-h-0 flex-1 overflow-hidden bg-bg-primary">
      <h2 className="absolute inset-x-0 top-0 z-10 px-4 py-3 text-center text-xl font-semibold tracking-tight md:text-2xl">
        {t('layers.lightning')}
      </h2>

      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-text-muted">{t('layers.lightningPlaceholder')}</p>
      </div>

      <LayerAssetCard
        title={t('assets.nodes')}
        plusLabel={t('services.title')}
        plusOpen={plusOpen}
        onPlusToggle={() => setPlusOpen((value) => !value)}
        plusItems={[
          {
            label: t('assets.addNode'),
            onClick: () => onMessage(t('assets.soon')),
          },
        ]}
      >
        <p className="px-2 py-2 text-sm text-text-muted">{t('assets.noNodes')}</p>
      </LayerAssetCard>
    </section>
  )
}
