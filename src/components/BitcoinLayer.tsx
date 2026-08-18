import { useTranslation } from 'react-i18next'

type ChainBlock = {
  label: string
  feeRate: number
  tone: string
}

const UPCOMING_BLOCKS: ChainBlock[] = [
  { label: '~3', feeRate: 4, tone: 'bg-block-low' },
  { label: '~2', feeRate: 9, tone: 'bg-block-mid' },
  { label: '~1', feeRate: 18, tone: 'bg-block-high' },
]

const CONFIRMED_BLOCKS: ChainBlock[] = [
  { label: '#912004', feeRate: 22, tone: 'bg-block-high' },
  { label: '#912003', feeRate: 14, tone: 'bg-block-mid' },
  { label: '#912002', feeRate: 35, tone: 'bg-block-hot' },
  { label: '#912001', feeRate: 12, tone: 'bg-block-mid' },
  { label: '#912000', feeRate: 8, tone: 'bg-block-low' },
]

type BlockTileProps = {
  block: ChainBlock
  upcoming?: boolean
}

function BlockTile({ block, upcoming = false }: BlockTileProps) {
  return (
    <div className="flex w-20 shrink-0 flex-col items-center gap-1">
      <div
        className={`h-16 w-16 rounded-md ${block.tone} ${
          upcoming ? 'border border-dashed border-text-muted/50 opacity-80' : ''
        }`}
        title={`${block.label} · ${block.feeRate} sat/vB`}
      />
      <span className="font-mono text-xs text-text-muted">{block.label}</span>
      <span className="font-mono text-xs text-accent">{block.feeRate} sat/vB</span>
    </div>
  )
}

export function BitcoinLayer() {
  const { t } = useTranslation()

  return (
    <section className="shrink-0 border-t border-border bg-bg-secondary">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-center text-xl font-semibold tracking-tight text-text-primary md:text-2xl">
          {t('layers.bitcoin')}
        </h2>
      </div>

      <div className="flex flex-col items-center px-4 py-4">
        <div className="flex w-full max-w-5xl flex-col items-stretch gap-4 md:flex-row md:items-start md:justify-center">
          <div className="flex-1">
            <p className="mb-2 text-center text-sm font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t('layers.mempool')}
            </p>
            <p className="mb-3 text-center text-sm text-text-muted">{t('layers.mempoolHint')}</p>
            <div className="flex items-center justify-center gap-3">
              {UPCOMING_BLOCKS.map((block) => (
                <BlockTile key={block.label} block={block} upcoming />
              ))}
            </div>
          </div>

          <div
            className="flex items-center justify-center md:min-h-[132px] md:flex-col md:px-4"
            aria-hidden="true"
          >
            <div className="h-px w-24 bg-border md:h-24 md:w-px" />
            <span className="px-2 font-mono text-xs uppercase tracking-widest text-accent md:py-2">
              {t('layers.now')}
            </span>
            <div className="h-px w-24 bg-border md:h-24 md:w-px" />
          </div>

          <div className="flex-1">
            <p className="mb-2 text-center text-sm font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t('layers.confirmed')}
            </p>
            <p className="mb-3 text-center text-sm text-text-muted">{t('layers.confirmedHint')}</p>
            <div className="flex items-center justify-center gap-3 overflow-x-auto pb-1">
              {CONFIRMED_BLOCKS.map((block) => (
                <BlockTile key={block.label} block={block} />
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-text-muted">{t('layers.feeHint')}</p>
      </div>
    </section>
  )
}
