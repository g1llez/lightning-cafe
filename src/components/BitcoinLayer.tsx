import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import {
  formatCountdown,
  lanePackPace,
  sandboxBlockInterval,
  toneForFee,
  type ConfirmedBlock,
  type Priority,
  type ProjectedBlock,
} from '../simulation/chain'
import {
  inspectConfirmedBlock,
  inspectMempoolLane,
  type FundedAddress,
} from '../simulation/inspect'
import {
  ownPendingForZone,
  ownSettledInBlock,
  shortAddress,
} from '../simulation/player'
import { useSimulation } from '../simulation/SimulationProvider'
import { mempoolFlyId } from './SatsFlight'
import { BlockTetris } from './BlockTetris'
import { BlockInspectModal } from './TxInspect'
import { NodeNetwork } from './NodeNetwork'
import { Tooltip } from './Tooltip'
import { WalletCard } from './WalletCard'

type InspectTarget =
  | { kind: 'mempool'; block: ProjectedBlock }
  | { kind: 'confirmed'; block: ConfirmedBlock }

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
  testId?: string
  onInspect?: () => void
  packing?: {
    seed: string
    fill: number
    txCount: number
    minePieces: number
    interval: number
    pace?: number
  }
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
  testId,
  onInspect,
  packing,
}: BlockTileProps) {
  const { t } = useTranslation()

  return (
    <div className="flex w-24 shrink-0 flex-col items-center gap-1 pt-2">
      <Tooltip text={blockTip} side="bottom">
        <button
          type="button"
          data-fly={flyId}
          data-testid={testId}
          onClick={onInspect}
          className="relative"
        >
          <div
            className={`h-16 w-16 overflow-hidden rounded-md ${toneForFee(feeRate)} ${
              upcoming ? 'border border-dashed border-text-muted/50' : ''
            } ${highlight ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-secondary' : ''} ${
              ghost ? 'opacity-0' : ''
            }`}
          >
            {packing && !ghost ? (
              <BlockTetris
                key={packing.seed}
                seed={packing.seed}
                fill={packing.fill}
                txCount={packing.txCount}
                minePieces={packing.minePieces}
                interval={packing.interval}
                pace={packing.pace}
              />
            ) : null}
          </div>
          {myTxs > 0 && !ghost && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-semibold text-bg-primary">
              {myTxs}
            </span>
          )}
        </button>
      </Tooltip>
      <span className="text-center text-xs font-medium text-text-primary">{label}</span>
      <span className="text-center text-[11px] text-text-muted">{t('layers.txCount', { txs: txCount.toLocaleString() })}</span>
      <span className="max-w-full truncate text-center font-mono text-[11px] text-accent">{caption}</span>
    </div>
  )
}

function MineFlight({
  packing,
  feeRate,
  highlight,
  badge,
  onDone,
}: {
  packing: { seed: string; txCount: number; minePieces: number }
  feeRate: number
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
      className={`pointer-events-none fixed z-[55] overflow-hidden rounded-md ${toneForFee(feeRate)} ${
        highlight ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-secondary' : ''
      }`}
    >
      <BlockTetris
        seed={packing.seed}
        fill={1}
        txCount={packing.txCount}
        minePieces={packing.minePieces}
        interval={0}
      />
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
  const { chain, secondsLeft, player, hiddenMempoolTxIds } = useSimulation()
  const hiddenMempool = new Set(hiddenMempoolTxIds)
  const interval = sandboxBlockInterval()
  const packingFill = 1 - secondsLeft / interval
  const highFee =
    chain.upcoming.find((block) => block.priority === 'high')?.feeRate ?? chain.marketRate
  const lastMinedId = useRef(chain.confirmed[0]?.id)
  const [mining, setMining] = useState<ConfirmedBlock | null>(null)
  const [inspect, setInspect] = useState<InspectTarget | null>(null)
  /** Narrow viewports: fewer confirmed tiles so the row fits. */
  const [confirmedVisible, setConfirmedVisible] = useState(5)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)')
    const sync = () => setConfirmedVisible(media.matches ? 3 : 5)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

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

  function addressTip(rows: FundedAddress[]) {
    if (rows.length === 0) {
      return null
    }

    return (
      <div className="border-t border-border pt-1.5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
          {t('layers.myAddressesHeading', { count: rows.length })}
        </p>
        <ul className="flex flex-col gap-1">
          {rows.map((row) => (
            <li key={`${row.tx.id}-${row.address}-${row.role}`} className="font-mono text-[11px]">
              {shortAddress(row.address)} · {row.sats.toLocaleString()} sats
            </li>
          ))}
        </ul>
      </div>
    )
  }

  function mempoolTip(block: ProjectedBlock) {
    return (
      <p className="font-mono text-[11px]">
        {t('layers.txCount', { txs: block.txCount.toLocaleString() })} · {block.feeRate} sat/vB
      </p>
    )
  }

  function confirmedTip(block: ConfirmedBlock) {
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
        {addressTip(inspectConfirmedBlock(player, block.height))}
      </div>
    )
  }

  return (
    <section
      className={`relative flex flex-col border-t border-border bg-bg-secondary ${
        fill ? 'min-h-0 flex-1' : 'h-[22rem] shrink-0'
      }`}
    >
      <div className="shrink-0 px-4 py-3 text-center">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{t('layers.bitcoin')}</h2>
        <p className="mt-1 font-mono text-sm text-accent">
          <Tooltip text={t('layers.nextBlockTip')} side="bottom">
            <span>{t('layers.nextBlockIn', { time: formatCountdown(secondsLeft) })}</span>
          </Tooltip>
        </p>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-between gap-3 px-4 pb-4 md:pl-[23rem]">
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <NodeNetwork onSatsSent={onSatsSent} />
        </div>

        <div className="flex w-full max-w-5xl flex-col items-stretch gap-4 self-center md:flex-row md:items-start md:justify-center">
          <div className="flex-1">
            <p className="mb-3 text-center text-sm font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t('layers.mempool')}
            </p>
            <div className="flex items-center justify-center gap-3">
              {chain.upcoming.map((block: ProjectedBlock) => {
                const myPending = ownPendingForZone(player, chain.marketRate, block.priority).filter(
                  (tx) => !hiddenMempool.has(tx.id),
                )
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
                    testId={`block-mempool-${block.priority}`}
                    packing={{
                      seed: block.id,
                      fill: packingFill,
                      txCount: block.txCount,
                      minePieces: myPending.length,
                      interval,
                      pace: lanePackPace(block.feeRate, highFee),
                    }}
                    onInspect={() => setInspect({ kind: 'mempool', block })}
                    blockTip={mempoolTip(block)}
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
              {chain.confirmed.slice(0, confirmedVisible).map((block: ConfirmedBlock, index) => {
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
                    testId={`block-confirmed-${block.height}`}
                    packing={{
                      seed: block.id,
                      fill: 1,
                      txCount: block.txCount,
                      minePieces: mine.length,
                      interval: 0,
                    }}
                    onInspect={() => setInspect({ kind: 'confirmed', block })}
                    blockTip={confirmedTip(block)}
                  />
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {inspect?.kind === 'mempool' && (
        <BlockInspectModal
          title={t('layers.inspectMempool', { priority: priorityLabel(inspect.block.priority) })}
          subtitle={t('layers.upcomingBlockTip', {
            priority: priorityLabel(inspect.block.priority),
            txs: inspect.block.txCount.toLocaleString(),
          })}
          player={player}
          addresses={inspectMempoolLane(
            player,
            chain.marketRate,
            inspect.block.priority,
          )}
          onClose={() => setInspect(null)}
        />
      )}
      {inspect?.kind === 'confirmed' && (
        <BlockInspectModal
          title={t('layers.inspectConfirmed', { height: inspect.block.height })}
          subtitle={t('layers.confirmedBlockTip', {
            height: inspect.block.height,
            pool: inspect.block.pool,
            fee: inspect.block.feeRate,
            txs: inspect.block.txCount.toLocaleString(),
          })}
          player={player}
          addresses={inspectConfirmedBlock(player, inspect.block.height)}
          onClose={() => setInspect(null)}
        />
      )}
      <WalletCard onMessage={onMessage} onSatsSent={onSatsSent} />
      {mining && (
        <MineFlight
          key={mining.id}
          packing={{
            seed: mining.id,
            txCount: mining.txCount,
            minePieces: ownSettledInBlock(player, mining.height).length,
          }}
          feeRate={mining.feeRate}
          highlight={ownSettledInBlock(player, mining.height).length > 0}
          badge={ownSettledInBlock(player, mining.height).length}
          onDone={() => setMining(null)}
        />
      )}
    </section>
  )
}
