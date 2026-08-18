import { useTranslation } from 'react-i18next'

const BLOCKS = [
  { height: 912_004, feeRate: 8, tone: 'bg-block-low' },
  { height: 912_003, feeRate: 14, tone: 'bg-block-mid' },
  { height: 912_002, feeRate: 22, tone: 'bg-block-high' },
  { height: 912_001, feeRate: 35, tone: 'bg-block-hot' },
  { height: 912_000, feeRate: 12, tone: 'bg-block-mid' },
  { height: 911_999, feeRate: 6, tone: 'bg-block-low' },
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
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-center text-xl font-semibold tracking-tight text-text-primary md:text-2xl">
          {t('layers.bitcoin')}
        </h2>
      </div>

      <div className="flex flex-col items-center space-y-4 px-4 py-4">
        <div className="w-full max-w-3xl">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t('layers.mempool')}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
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

        <div className="w-full max-w-3xl">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-text-muted">
            {t('layers.blocks')}
          </p>
          <div className="flex items-center justify-center gap-3 overflow-x-auto pb-1">
            {BLOCKS.map((block) => (
              <div key={block.height} className="flex w-16 shrink-0 flex-col items-center gap-1">
                <div
                  className={`h-16 w-16 rounded-md ${block.tone}`}
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
