import { useTranslation } from 'react-i18next'
import { formatCountdown, toneForFee, type ConfirmedBlock, type Priority, type ProjectedBlock } from '../simulation/chain'
import { useSimulation } from '../simulation/SimulationProvider'
import { Tooltip } from './Tooltip'

type BlockTileProps = {
  label: string
  feeRate: number
  txCount: number
  blockTip: string
  upcoming?: boolean
  highlight?: boolean
}

function BlockTile({ label, feeRate, txCount, blockTip, upcoming = false, highlight = false }: BlockTileProps) {
  const { t } = useTranslation()

  return (
    <div className="flex w-24 shrink-0 flex-col items-center gap-1">
      <Tooltip text={blockTip}>
        <div
          className={`h-16 w-16 rounded-md ${toneForFee(feeRate)} ${
            upcoming ? 'border border-dashed border-text-muted/50' : ''
          } ${highlight ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-secondary' : ''}`}
        />
      </Tooltip>
      <span className="text-center text-xs font-medium text-text-primary">{label}</span>
      <span className="text-center text-[11px] text-text-muted">{t('layers.txCount', { txs: txCount.toLocaleString() })}</span>
      <Tooltip text={t('layers.feeTip')}>
        <span className="font-mono text-xs text-accent">{feeRate} sat/vB</span>
      </Tooltip>
    </div>
  )
}

export function BitcoinLayer() {
  const { t } = useTranslation()
  const { chain, secondsLeft } = useSimulation()

  function priorityLabel(priority: Priority) {
    return t(`layers.priority.${priority}`)
  }

  return (
    <section className="shrink-0 border-t border-border bg-bg-secondary">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-center text-xl font-semibold tracking-tight text-text-primary md:text-2xl">
          {t('layers.bitcoin')}
        </h2>
        <p className="mt-1 text-center font-mono text-sm text-accent">
          <Tooltip text={t('layers.nextBlockTip')}>
            <span>{t('layers.nextBlockIn', { time: formatCountdown(secondsLeft) })}</span>
          </Tooltip>
        </p>
      </div>

      <div className="flex flex-col items-center px-4 py-4">
        <div className="flex w-full max-w-5xl flex-col items-stretch gap-4 md:flex-row md:items-start md:justify-center">
          <div className="flex-1">
            <p className="mb-3 text-center text-sm font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t('layers.mempool')}
            </p>
            <div className="flex items-center justify-center gap-3">
              {chain.upcoming.map((block: ProjectedBlock) => (
                <BlockTile
                  key={block.id}
                  label={priorityLabel(block.priority)}
                  feeRate={block.feeRate}
                  txCount={block.txCount}
                  upcoming
                  highlight={block.priority === 'high'}
                  blockTip={t('layers.upcomingBlockTip', {
                    priority: priorityLabel(block.priority),
                    txs: block.txCount.toLocaleString(),
                  })}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center md:min-h-[132px] md:flex-col md:px-4">
            <div className="h-px w-24 bg-border md:h-24 md:w-px" />
            <span className="px-2 font-mono text-xs uppercase tracking-widest text-accent md:py-2">
              {t('layers.now')}
            </span>
            <div className="h-px w-24 bg-border md:h-24 md:w-px" />
          </div>

          <div className="flex-1">
            <p className="mb-3 text-center text-sm font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t('layers.confirmed')}
            </p>
            <div className="flex items-center justify-center gap-3 overflow-x-auto pb-1">
              {chain.confirmed.map((block: ConfirmedBlock) => (
                <BlockTile
                  key={block.id}
                  label={`#${block.height}`}
                  feeRate={block.feeRate}
                  txCount={block.txCount}
                  blockTip={t('layers.confirmedBlockTip', {
                    height: block.height,
                    pool: block.pool,
                    txs: block.txCount.toLocaleString(),
                  })}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
