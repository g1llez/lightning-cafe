import { useTranslation } from 'react-i18next'

const BLOCKS = [
  { height: 912_004, feeRate: 8, weight: 0.42, tone: 'bg-block-low' },
  { height: 912_003, feeRate: 14, weight: 0.68, tone: 'bg-block-mid' },
  { height: 912_002, feeRate: 22, weight: 0.81, tone: 'bg-block-high' },
  { height: 912_001, feeRate: 35, weight: 0.95, tone: 'bg-block-hot' },
  { height: 912_000, feeRate: 12, weight: 0.55, tone: 'bg-block-mid' },
  { height: 911_999, feeRate: 6, weight: 0.33, tone: 'bg-block-low' },
] as const

const MEMPOOL_TXS = [
  { id: 'a4f2…9c1', fee: 12, vsize: 142 },
  { id: 'b8e1…0d7', fee: 28, vsize: 98 },
  { id: 'c3aa…44f', fee: 9, vsize: 210 },
]

export function BitcoinLayer() {
  const { t } = useTranslation()

  return (
    <section className="shrink-0 border-t border-border bg-bg-secondary">
      <div className="border-b border-border px-4 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
          {t('layers.bitcoin')}
        </h2>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t('layers.mempool')}
          </p>
          <div className="flex flex-wrap gap-2">
            {MEMPOOL_TXS.map((tx) => (
              <div
                key={tx.id}
                className="rounded-md border border-border bg-bg-panel px-3 py-2 font-mono text-xs text-text-muted"
              >
                <span className="text-text-primary">{tx.id}</span>
                <span className="mx-2 text-border">|</span>
                {tx.fee} sat/vB · {tx.vsize} vB
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t('layers.blocks')}
          </p>
          <div className="flex items-end gap-2 overflow-x-auto pb-1">
            {BLOCKS.map((block) => (
              <div key={block.height} className="flex min-w-[72px] flex-col items-center gap-1">
                <div
                  className={`w-16 rounded-md ${block.tone} transition`}
                  style={{ height: `${Math.max(block.weight * 96, 28)}px` }}
                  title={`#${block.height}`}
                />
                <span className="font-mono text-[10px] text-text-muted">#{block.height}</span>
                <span className="font-mono text-[10px] text-accent">{block.feeRate} sat/vB</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
