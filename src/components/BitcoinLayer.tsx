import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BLOCK_INTERVAL_SECONDS,
  createInitialChain,
  formatCountdown,
  mineBlock,
  nextLowFeeRate,
  toneForFee,
  type ConfirmedBlock,
  type Priority,
  type ProjectedBlock,
} from '../simulation/chain'

type BlockTileProps = {
  label: string
  feeRate: number
  upcoming?: boolean
  highlight?: boolean
}

function BlockTile({ label, feeRate, upcoming = false, highlight = false }: BlockTileProps) {
  return (
    <div className="flex w-24 shrink-0 flex-col items-center gap-1">
      <div
        className={`h-16 w-16 rounded-md ${toneForFee(feeRate)} ${
          upcoming ? 'border border-dashed border-text-muted/50' : ''
        } ${highlight ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-secondary' : ''}`}
        title={`${label} · ${feeRate} sat/vB`}
      />
      <span className="text-center text-xs font-medium text-text-primary">{label}</span>
      <span className="font-mono text-xs text-accent">{feeRate} sat/vB</span>
    </div>
  )
}

export function BitcoinLayer() {
  const { t } = useTranslation()
  const [chain, setChain] = useState(createInitialChain)
  const [secondsLeft, setSecondsLeft] = useState(BLOCK_INTERVAL_SECONDS)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => current - 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (secondsLeft > 0) {
      return
    }

    setChain((current) => mineBlock(current, nextLowFeeRate()))
    setSecondsLeft(BLOCK_INTERVAL_SECONDS)
  }, [secondsLeft])

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
          {t('layers.nextBlockIn', { time: formatCountdown(secondsLeft) })}
        </p>
      </div>

      <div className="flex flex-col items-center px-4 py-4">
        <div className="flex w-full max-w-5xl flex-col items-stretch gap-4 md:flex-row md:items-start md:justify-center">
          <div className="flex-1">
            <p className="mb-2 text-center text-sm font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t('layers.mempool')}
            </p>
            <p className="mb-3 text-center text-sm text-text-muted">{t('layers.mempoolHint')}</p>
            <div className="flex items-center justify-center gap-3">
              {chain.upcoming.map((block: ProjectedBlock) => (
                <BlockTile
                  key={block.id}
                  label={priorityLabel(block.priority)}
                  feeRate={block.feeRate}
                  upcoming
                  highlight={block.priority === 'high'}
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
            <p className="mb-2 text-center text-sm font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t('layers.confirmed')}
            </p>
            <p className="mb-3 text-center text-sm text-text-muted">{t('layers.confirmedHint')}</p>
            <div className="flex items-center justify-center gap-3 overflow-x-auto pb-1">
              {chain.confirmed.map((block: ConfirmedBlock) => (
                <BlockTile key={block.id} label={`#${block.height}`} feeRate={block.feeRate} />
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-text-muted">{t('layers.feeHint')}</p>
        <p className="mt-1 text-center text-sm text-text-muted">{t('layers.blockIntervalHint')}</p>
      </div>
    </section>
  )
}
