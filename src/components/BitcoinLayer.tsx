import { useTranslation } from 'react-i18next'
import type { ReactNode } from 'react'
import { formatCountdown, toneForFee, type ConfirmedBlock, type Priority, type ProjectedBlock } from '../simulation/chain'
import { pendingForZone, shortAddress, type PendingTx } from '../simulation/player'
import { useSimulation } from '../simulation/SimulationProvider'
import { mempoolFlyId } from './SatsFlight'
import { Tooltip } from './Tooltip'
import { WalletCard } from './WalletCard'

type BlockTileProps = {
  label: string
  feeRate: number
  txCount: number
  blockTip: ReactNode
  upcoming?: boolean
  highlight?: boolean
  myTxs?: number
  flyId?: string
}

function BlockTile({
  label,
  feeRate,
  txCount,
  blockTip,
  upcoming = false,
  highlight = false,
  myTxs = 0,
  flyId,
}: BlockTileProps) {
  const { t } = useTranslation()

  return (
    <div className="flex w-24 shrink-0 flex-col items-center gap-1">
      <Tooltip text={blockTip}>
        <div className="relative" data-fly={flyId}>
          <div
            className={`h-16 w-16 rounded-md ${toneForFee(feeRate)} ${
              upcoming ? 'border border-dashed border-text-muted/50' : ''
            } ${highlight ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-secondary' : ''}`}
          />
          {myTxs > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-semibold text-bg-primary">
              {myTxs}
            </span>
          )}
        </div>
      </Tooltip>
      <span className="text-center text-xs font-medium text-text-primary">{label}</span>
      <span className="text-center text-[11px] text-text-muted">{t('layers.txCount', { txs: txCount.toLocaleString() })}</span>
      <Tooltip text={t('layers.feeTip')}>
        <span className="font-mono text-xs text-accent">{feeRate} sat/vB</span>
      </Tooltip>
    </div>
  )
}

type BitcoinLayerProps = {
  fill: boolean
  onMessage: (message: string) => void
}

export function BitcoinLayer({ fill, onMessage }: BitcoinLayerProps) {
  const { t } = useTranslation()
  const { chain, secondsLeft, player } = useSimulation()

  function priorityLabel(priority: Priority) {
    return t(`layers.priority.${priority}`)
  }

  function walletName(walletId: string) {
    return player.wallets.find((wallet) => wallet.id === walletId)?.name ?? walletId
  }

  function mempoolTip(block: ProjectedBlock, myPending: PendingTx[]) {
    return (
      <div className="flex flex-col gap-1.5">
        <p>
          {t('layers.upcomingBlockTip', {
            priority: priorityLabel(block.priority),
            txs: block.txCount.toLocaleString(),
          })}
        </p>
        {block.priority === 'high' && (
          <p className="text-[11px] text-text-muted">{t('layers.nextUp')}</p>
        )}
        {myPending.length > 0 && (
          <div className="border-t border-border pt-1.5">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
              {t('layers.myTxsHeading', { count: myPending.length })}
            </p>
            <ul className="flex flex-col gap-1">
              {myPending.map((tx) => (
                <li key={tx.id} className="font-mono text-[11px] leading-snug">
                  {t('layers.myTxLine', {
                    sats: tx.sats.toLocaleString(),
                    fee: tx.feeRate,
                    address: shortAddress(tx.address),
                    wallet: walletName(tx.walletId),
                  })}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <section
      className={`relative overflow-hidden border-t border-border bg-bg-secondary ${
        fill ? 'min-h-0 flex-1' : 'h-[22rem] shrink-0'
      }`}
    >
      <div className="absolute inset-x-0 top-0 z-10 px-4 py-3 text-center">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{t('layers.bitcoin')}</h2>
        <p className="mt-1 font-mono text-sm text-accent">
          <Tooltip text={t('layers.nextBlockTip')}>
            <span>{t('layers.nextBlockIn', { time: formatCountdown(secondsLeft) })}</span>
          </Tooltip>
        </p>
      </div>

      {/* Left padding keeps the floating wallet card from covering the mempool blocks. */}
      <div
        className={`flex h-full justify-center px-4 pb-4 pt-20 md:pl-[23rem] ${
          fill ? 'items-center' : 'items-end'
        }`}
      >
        <div className="flex w-full max-w-5xl flex-col items-stretch gap-4 md:flex-row md:items-start md:justify-center">
          <div className="flex-1">
            <p className="mb-3 text-center text-sm font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t('layers.mempool')}
            </p>
            <div className="flex items-center justify-center gap-3">
              {chain.upcoming.map((block: ProjectedBlock) => {
                const myPending = pendingForZone(player, chain.marketRate, block.priority)
                return (
                  <BlockTile
                    key={block.id}
                    label={priorityLabel(block.priority)}
                    feeRate={block.feeRate}
                    txCount={block.txCount}
                    upcoming
                    highlight={myPending.length > 0}
                    flyId={mempoolFlyId(block.priority)}
                    myTxs={myPending.length}
                    blockTip={mempoolTip(block, myPending)}
                  />
                )
              })}
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

      <WalletCard onMessage={onMessage} />
    </section>
  )
}
