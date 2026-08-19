import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  estimateFeeSats,
  formatCountdown,
  toneForFee,
  type ConfirmedBlock,
  type Priority,
  type ProjectedBlock,
} from '../simulation/chain'
import {
  ownPendingForZone,
  ownSettledInBlock,
  shortAddress,
  type PendingTx,
} from '../simulation/player'
import { useSimulation } from '../simulation/SimulationProvider'
import { mempoolFlyId } from './SatsFlight'
import { Tooltip } from './Tooltip'
import { WalletCard } from './WalletCard'

type BlockTileProps = {
  label: string
  feeRate: number
  txCount: number
  caption: string
  blockTip: ReactNode
  upcoming?: boolean
  highlight?: boolean
  myTxs?: number
  flyId?: string
  ghost?: boolean
}

function BlockTile({
  label,
  feeRate,
  txCount,
  caption,
  blockTip,
  upcoming = false,
  highlight = false,
  myTxs = 0,
  flyId,
  ghost = false,
}: BlockTileProps) {
  const { t } = useTranslation()

  return (
    <div className="flex w-24 shrink-0 flex-col items-center gap-1 pt-2">
      <Tooltip text={blockTip} side="bottom">
        <div className="relative cursor-default" data-fly={flyId}>
          <div
            className={`h-16 w-16 rounded-md ${toneForFee(feeRate)} ${
              upcoming ? 'border border-dashed border-text-muted/50' : ''
            } ${highlight ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-secondary' : ''} ${
              ghost ? 'opacity-0' : ''
            }`}
          />
          {myTxs > 0 && !ghost && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-semibold text-bg-primary">
              {myTxs}
            </span>
          )}
        </div>
      </Tooltip>
      <span className="text-center text-xs font-medium text-text-primary">{label}</span>
      <span className="text-center text-[11px] text-text-muted">{t('layers.txCount', { txs: txCount.toLocaleString() })}</span>
      <span className="max-w-full truncate text-center font-mono text-[11px] text-accent">{caption}</span>
    </div>
  )
}

function MineFlight({
  colorClass,
  highlight,
  badge,
  onDone,
}: {
  colorClass: string
  highlight: boolean
  badge: number
  onDone: () => void
}) {
  const tileRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const tile = tileRef.current
    const origin = document.querySelector('[data-fly="mempool-high"]')
    const dest = document.querySelector('[data-fly="confirmed-head"]')
    if (!tile || !origin || !dest) {
      doneRef.current()
      return
    }

    const from = origin.getBoundingClientRect()
    const to = dest.getBoundingClientRect()
    tile.style.left = `${from.left}px`
    tile.style.top = `${from.top}px`
    tile.style.width = `${from.width}px`
    tile.style.height = `${from.height}px`

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const animation = tile.animate(
      [
        { transform: 'translate(0, 0)', opacity: 1 },
        {
          transform: `translate(${to.left - from.left}px, ${to.top - from.top}px)`,
          opacity: 1,
        },
      ],
      { duration: reduced ? 200 : 750, easing: 'cubic-bezier(0.4, 0, 0.2, 1)', fill: 'forwards' },
    )

    let cancelled = false
    animation.finished
      .then(() => doneRef.current())
      .catch(() => {
        if (!cancelled) {
          doneRef.current()
        }
      })

    return () => {
      cancelled = true
      animation.cancel()
    }
  }, [])

  return (
    <div
      ref={tileRef}
      aria-hidden="true"
      className={`pointer-events-none fixed z-[55] rounded-md ${colorClass} ${
        highlight ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-secondary' : ''
      }`}
    >
      {badge > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-semibold text-bg-primary">
          {badge}
        </span>
      )}
    </div>
  )
}

type BitcoinLayerProps = {
  fill: boolean
  onMessage: (message: string) => void
  onSatsSent: (label: string, target: string, from?: string) => void
}

export function BitcoinLayer({ fill, onMessage, onSatsSent }: BitcoinLayerProps) {
  const { t } = useTranslation()
  const { chain, secondsLeft, player } = useSimulation()
  const lastMinedId = useRef(chain.confirmed[0]?.id)
  const [mining, setMining] = useState<ConfirmedBlock | null>(null)

  useEffect(() => {
    const head = chain.confirmed[0]
    if (!head || head.id === lastMinedId.current) {
      return
    }
    lastMinedId.current = head.id
    setMining(head)
  }, [chain.confirmed])

  function priorityLabel(priority: Priority) {
    return t(`layers.priority.${priority}`)
  }

  function walletName(walletId: string | null) {
    return walletId
      ? player.wallets.find((wallet) => wallet.id === walletId)?.name ?? walletId
      : t('layers.unknownAddress')
  }

  function txLine(tx: PendingTx) {
    const payment = t('layers.myTxLine', {
      sats: tx.sats.toLocaleString(),
      feeSats: estimateFeeSats(tx.feeRate).toLocaleString(),
      fee: tx.feeRate,
      address: shortAddress(tx.address),
      wallet: walletName(tx.walletId),
    })
    if (!tx.changeSats || !tx.changeAddress) {
      return payment
    }
    return `${payment} · ${t('layers.myTxChange', {
      sats: tx.changeSats.toLocaleString(),
      address: shortAddress(tx.changeAddress),
    })}`
  }

  function myTxsTip(txs: PendingTx[]) {
    if (txs.length === 0) {
      return null
    }

    return (
      <div className="border-t border-border pt-1.5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
          {t('layers.myTxsHeading', { count: txs.length })}
        </p>
        <ul className="flex flex-col gap-1">
          {txs.map((tx) => (
            <li key={tx.id} className="font-mono text-[11px] leading-snug">
              {txLine(tx)}
            </li>
          ))}
        </ul>
      </div>
    )
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
        <p className="font-mono text-[11px] text-text-muted">
          {block.feeRate} sat/vB · {t('layers.feeTip')}
        </p>
        {block.priority === 'high' && (
          <p className="text-[11px] text-text-muted">{t('layers.nextUp')}</p>
        )}
        {myTxsTip(myPending)}
      </div>
    )
  }

  function confirmedTip(block: ConfirmedBlock) {
    const mine = ownSettledInBlock(player, block.height)
    return (
      <div className="flex flex-col gap-1.5">
        <p>
          {t('layers.confirmedBlockTip', {
            height: block.height,
            pool: block.pool,
            fee: block.feeRate,
            txs: block.txCount.toLocaleString(),
          })}
        </p>
        {myTxsTip(mine)}
      </div>
    )
  }

  return (
    <section
      className={`relative border-t border-border bg-bg-secondary ${
        fill ? 'min-h-0 flex-1' : 'h-[22rem] shrink-0'
      }`}
    >
      <div className="absolute inset-x-0 top-0 z-10 px-4 py-3 text-center">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{t('layers.bitcoin')}</h2>
        <p className="mt-1 font-mono text-sm text-accent">
          <Tooltip text={t('layers.nextBlockTip')} side="bottom">
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
                const myPending = ownPendingForZone(player, chain.marketRate, block.priority)
                return (
                  <BlockTile
                    key={block.id}
                    label={priorityLabel(block.priority)}
                    feeRate={block.feeRate}
                    txCount={block.txCount}
                    caption={`${block.feeRate} sat/vB`}
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
            <div className="flex items-center justify-center gap-3">
              {chain.confirmed.map((block: ConfirmedBlock, index) => {
                const mine = ownSettledInBlock(player, block.height)
                return (
                  <BlockTile
                    key={block.id}
                    label={`#${block.height}`}
                    feeRate={block.feeRate}
                    txCount={block.txCount}
                    caption={block.pool}
                    highlight={mine.length > 0}
                    myTxs={mine.length}
                    flyId={index === 0 ? 'confirmed-head' : undefined}
                    ghost={index === 0 && mining?.id === block.id}
                    blockTip={confirmedTip(block)}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <WalletCard onMessage={onMessage} onSatsSent={onSatsSent} />
      {mining && (
        <MineFlight
          key={mining.id}
          colorClass={toneForFee(mining.feeRate)}
          highlight={ownSettledInBlock(player, mining.height).length > 0}
          badge={ownSettledInBlock(player, mining.height).length}
          onDone={() => setMining(null)}
        />
      )}
    </section>
  )
}
