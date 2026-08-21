import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sandboxBlockInterval } from '../simulation/chain'
import {
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
import { Tooltip } from './Tooltip'

const PACKET_MS = 420
/** Keep strokes clear of the larger node discs (viewBox units). */
const EDGE_PAD = 9

type ActivePacket = PropagationHop & {
  key: string
  pulseId: string
  kind: NetworkPulse['kind']
  x1: number
  y1: number
  x2: number
  y2: number
}

export function NodeNetwork() {
  const { t } = useTranslation()
  const { player, chain, secondsLeft, networkPulse } = useSimulation()
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

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hops = propagationHops(networkPulse.originId, edges)
    setPulseKey(networkPulse.id)
    setInformed(new Set([networkPulse.originId]))

    if (reduced || hops.length === 0) {
      setInformed(new Set(idSet))
      setPackets([])
      return
    }

    const timers: number[] = []
    setPackets(
      hops.map((hop, index) => {
        const from = byId.get(hop.fromId)
        const to = byId.get(hop.toId)
        const ends =
          from && to
            ? edgeEndpoints(from.x, from.y, to.x, to.y, EDGE_PAD)
            : { x1: 0, y1: 0, x2: 0, y2: 0 }
        return {
          ...hop,
          ...ends,
          key: `${networkPulse.id}-${index}`,
          pulseId: networkPulse.id,
          kind: networkPulse.kind,
        }
      }),
    )

    for (const hop of hops) {
      timers.push(
        window.setTimeout(() => {
          setInformed((current) => {
            const next = new Set(current)
            next.add(hop.toId)
            return next
          })
        }, hop.delayMs),
      )
    }

    const clearAt = (hops[hops.length - 1]?.delayMs ?? 0) + PACKET_MS + PROPAGATION_HOP_MS
    timers.push(
      window.setTimeout(() => {
        setPackets((current) => current.filter((packet) => packet.pulseId !== networkPulse.id))
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
      <div className="relative mx-auto aspect-square w-full max-h-[min(52vh,28rem)]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {edges.map((edge) => {
            const a = byId.get(edge.a)
            const b = byId.get(edge.b)
            if (!a || !b) {
              return null
            }
            const ends = edgeEndpoints(a.x, a.y, b.x, b.y, EDGE_PAD)
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
          const body = (
            <div
              className={`relative flex flex-col items-center gap-1 ${
                hot ? 'scale-105' : ''
              } transition`}
            >
              {syncing && (
                <span
                  className="absolute -inset-1.5 rounded-full border-2 border-accent/35"
                  style={{
                    background: `conic-gradient(var(--color-accent, #f7931a) ${syncProgress * 360}deg, transparent 0)`,
                    mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
                    WebkitMask:
                      'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
                  }}
                />
              )}
              <span
                className={`rounded-full p-0.5 ${
                  node.kind === 'own'
                    ? 'ring-2 ring-accent'
                    : node.kind === 'exchange'
                      ? 'ring-2 ring-amber-400/80'
                      : ''
                } ${hot ? 'ring-offset-1 ring-offset-bg-secondary' : ''}`}
              >
                <BitcoinNodeIcon className="h-9 w-9 md:h-11 md:w-11" title={node.name} />
              </span>
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
          )

          const tipText =
            node.kind === 'exchange'
              ? t('layers.nodeExchangeTip')
              : node.kind === 'public'
                ? t('layers.nodePublicTip')
                : node.kind === 'npc'
                  ? t('layers.nodeNpcTip')
                  : null

          return (
            <div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              {tipText ? (
                <Tooltip text={tipText} side="top">
                  {body}
                </Tooltip>
              ) : (
                body
              )}
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
      r={kind === 'block' ? 1.5 : 1.25}
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
