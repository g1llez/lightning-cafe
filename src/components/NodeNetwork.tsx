import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sandboxBlockInterval } from '../simulation/chain'
import {
  MEMPOOL_NODE_ID,
  NODE_DISC_RADIUS,
  PROPAGATION_HOP_MS,
  edgeEndpoints,
  isOwnNodeReady,
  ownNodeProgress,
  ownNodeProgressPercent,
  propagationHops,
  visibleEdges,
  visibleNetwork,
  type NetworkPulse,
  type PropagationHop,
} from '../simulation/nodes'
import { useSimulation } from '../simulation/SimulationProvider'
import { BitcoinNodeIcon } from './BitcoinNodeIcon'
import { mempoolFlyId, nodeFlyId } from './SatsFlight'
import { Tooltip } from './Tooltip'

const PACKET_MS = 420
/** Let the sats chip reach the origin node before hops leave it. */
const TX_ORIGIN_HOLD_MS = 900

type ActivePacket = PropagationHop & {
  key: string
  pulseId: string
  kind: NetworkPulse['kind']
  x1: number
  y1: number
  x2: number
  y2: number
}

type NodeNetworkProps = {
  onSatsSent: (label: string, target: string, from?: string) => void
}

export function NodeNetwork({ onSatsSent }: NodeNetworkProps) {
  const { t } = useTranslation()
  const { player, chain, secondsLeft, networkPulse, revealMempoolTx } = useSimulation()
  const onSatsSentRef = useRef(onSatsSent)
  onSatsSentRef.current = onSatsSent
  const revealRef = useRef(revealMempoolTx)
  revealRef.current = revealMempoolTx
  const tRef = useRef(t)
  tRef.current = t
  const tip = chain.confirmed[0]?.height ?? chain.nextHeight - 1
  const blockFill = 1 - secondsLeft / sandboxBlockInterval()
  const nodes = useMemo(() => visibleNetwork(player.ownNode), [player.ownNode])
  const idSet = useMemo(() => new Set(nodes.map((node) => node.id)), [nodes])
  const edges = useMemo(() => visibleEdges(idSet), [idSet])
  const byId = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])

  const [informed, setInformed] = useState<Set<string>>(() => new Set())
  const [packets, setPackets] = useState<ActivePacket[]>([])
  const [pulseKey, setPulseKey] = useState<string | null>(null)

  useEffect(() => {
    if (!networkPulse || networkPulse.id === pulseKey) {
      return
    }
    if (!idSet.has(networkPulse.originId)) {
      return
    }

    const pulse = networkPulse
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hold = pulse.kind === 'tx' && !reduced ? TX_ORIGIN_HOLD_MS : 0
    const hops = propagationHops(pulse.originId, edges).map((hop) => ({
      ...hop,
      delayMs: hop.delayMs + hold,
    }))
    setPulseKey(pulse.id)
    setInformed(new Set([pulse.originId]))

    function deliverToMempool() {
      if (pulse.kind !== 'tx' || !pulse.txId || !pulse.lane) {
        return
      }
      revealRef.current(pulse.txId)
      onSatsSentRef.current(
        tRef.current('services.flyingSats', { sats: (pulse.sats ?? 0).toLocaleString() }),
        mempoolFlyId(pulse.lane),
        nodeFlyId(MEMPOOL_NODE_ID),
      )
    }

    if (reduced || hops.length === 0) {
      setInformed(new Set(idSet))
      setPackets([])
      deliverToMempool()
      return
    }

    const timers: number[] = []
    setPackets(
      hops.map((hop, index) => {
        const from = byId.get(hop.fromId)
        const to = byId.get(hop.toId)
        const ends =
          from && to
            ? edgeEndpoints(from.x, from.y, to.x, to.y, NODE_DISC_RADIUS)
            : { x1: 0, y1: 0, x2: 0, y2: 0 }
        return {
          ...hop,
          ...ends,
          key: `${pulse.id}-${index}`,
          pulseId: pulse.id,
          kind: pulse.kind,
        }
      }),
    )

    if (pulse.originId === MEMPOOL_NODE_ID) {
      timers.push(window.setTimeout(deliverToMempool, hold))
    }

    for (const hop of hops) {
      timers.push(
        window.setTimeout(() => {
          setInformed((current) => {
            const next = new Set(current)
            next.add(hop.toId)
            return next
          })
          if (hop.toId === MEMPOOL_NODE_ID && pulse.kind === 'tx') {
            deliverToMempool()
          }
        }, hop.delayMs),
      )
    }

    const clearAt = (hops[hops.length - 1]?.delayMs ?? hold) + PACKET_MS + PROPAGATION_HOP_MS
    timers.push(
      window.setTimeout(() => {
        setPackets((current) => current.filter((packet) => packet.pulseId !== pulse.id))
        setInformed(new Set())
      }, clearAt),
    )

    return () => {
      for (const timer of timers) {
        window.clearTimeout(timer)
      }
    }
  }, [networkPulse, pulseKey, edges, idSet, byId])

  const own = player.ownNode
  const ownReady = own ? isOwnNodeReady(own, tip) : false
  const syncPercent = own ? ownNodeProgressPercent(own, tip, ownReady ? 0 : blockFill) : 0
  const syncProgress = own ? ownNodeProgress(own, tip, ownReady ? 0 : blockFill) : 1

  return (
    <div className="mx-auto w-full max-w-2xl px-2">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
        {t('layers.network')}
      </p>
      <div
        className="relative mx-auto aspect-square w-full max-h-[min(52vh,28rem)]"
        style={{ containerType: 'size' }}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {edges.map((edge) => {
            const a = byId.get(edge.a)
            const b = byId.get(edge.b)
            if (!a || !b) {
              return null
            }
            const ends = edgeEndpoints(a.x, a.y, b.x, b.y, NODE_DISC_RADIUS)
            const lit = informed.has(edge.a) && informed.has(edge.b) && informed.size > 0
            return (
              <line
                key={`${edge.a}-${edge.b}`}
                x1={ends.x1}
                y1={ends.y1}
                x2={ends.x2}
                y2={ends.y2}
                className={lit ? 'stroke-accent/70' : 'stroke-border/80'}
                strokeWidth={lit ? 1 : 0.65}
                strokeLinecap="round"
              />
            )
          })}
          {packets.map((packet) => (
            <PacketDot
              key={packet.key}
              x1={packet.x1}
              y1={packet.y1}
              x2={packet.x2}
              y2={packet.y2}
              delayMs={packet.delayMs}
              kind={packet.kind}
            />
          ))}
        </svg>

        {nodes.map((node) => {
          const syncing = node.kind === 'own' && own && !ownReady
          const hot = informed.has(node.id)
          const tipText =
            node.kind === 'exchange'
              ? t('layers.nodeExchangeTip')
              : node.kind === 'mempool'
                ? t('layers.nodeMempoolTip')
                : node.kind === 'public'
                  ? t('layers.nodePublicTip')
                  : node.kind === 'npc'
                    ? t('layers.nodeNpcTip')
                    : null

          const discPx = `${NODE_DISC_RADIUS * 2}cqi`
          const icon = (
            <span
              data-fly={nodeFlyId(node.id)}
              className={`inline-flex rounded-full ${
                node.kind === 'own'
                  ? 'ring-2 ring-accent'
                  : node.kind === 'exchange'
                    ? 'ring-2 ring-amber-400/80'
                    : node.kind === 'mempool'
                      ? 'border-2 border-dashed border-accent/80'
                      : ''
              } ${hot ? 'ring-offset-1 ring-offset-bg-secondary' : ''}`}
            >
              <BitcoinNodeIcon
                className="block"
                style={{ width: discPx, height: discPx }}
                title={node.name}
              />
            </span>
          )

          return (
            <div
              key={node.id}
              className="absolute z-[1]"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <div className={`relative ${hot ? 'scale-105' : ''} transition`}>
                {syncing && (
                  <span
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent/35"
                    style={{
                      width: `calc(${NODE_DISC_RADIUS * 2}cqi + 8px)`,
                      height: `calc(${NODE_DISC_RADIUS * 2}cqi + 8px)`,
                      background: `conic-gradient(var(--color-accent, #f7931a) ${syncProgress * 360}deg, transparent 0)`,
                      mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
                      WebkitMask:
                        'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
                    }}
                  />
                )}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                  {tipText ? <Tooltip text={tipText} side="top">{icon}</Tooltip> : icon}
                </div>
                <div
                  className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-0.5"
                  style={{ top: `calc(${NODE_DISC_RADIUS}cqi + 6px)` }}
                >
                  <span className="max-w-[6.5rem] truncate text-center text-xs font-medium text-text-primary md:text-[13px]">
                    {node.name}
                  </span>
                  {node.kind === 'own' && own && (
                    <Tooltip
                      text={ownReady ? t('layers.nodeOwnTip') : t('layers.nodeSyncingTip')}
                      side="top"
                    >
                      <span className="cursor-help font-mono text-[11px] text-text-muted">
                        {ownReady
                          ? t('assets.nodeReady')
                          : t('assets.nodeSyncing', { percent: syncPercent })}
                      </span>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PacketDot({
  x1,
  y1,
  x2,
  y2,
  delayMs,
  kind,
}: {
  x1: number
  y1: number
  x2: number
  y2: number
  delayMs: number
  kind: NetworkPulse['kind']
}) {
  return (
    <circle
      cx={x1}
      cy={y1}
      r={kind === 'block' ? 1.5 : 1.25}
      opacity={0}
      className={kind === 'block' ? 'fill-accent' : 'fill-amber-300'}
    >
      <animate
        attributeName="cx"
        from={x1}
        to={x2}
        begin={`${delayMs}ms`}
        dur={`${PACKET_MS}ms`}
        fill="freeze"
      />
      <animate
        attributeName="cy"
        from={y1}
        to={y2}
        begin={`${delayMs}ms`}
        dur={`${PACKET_MS}ms`}
        fill="freeze"
      />
      <animate
        attributeName="opacity"
        values="0;1;1;0"
        keyTimes="0;0.08;0.85;1"
        begin={`${delayMs}ms`}
        dur={`${PACKET_MS}ms`}
        fill="freeze"
      />
    </circle>
  )
}
