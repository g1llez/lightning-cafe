import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  EXCHANGE_NODE_ID,
  OWN_NODE_SYNC_BLOCKS,
  PROPAGATION_HOP_MS,
  isOwnNodeReady,
  ownNodeBlocksSynced,
  ownNodeProgress,
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

type ActivePacket = PropagationHop & {
  key: string
  pulseId: string
  kind: NetworkPulse['kind']
}

export function NodeNetwork() {
  const { t } = useTranslation()
  const { player, chain, networkPulse } = useSimulation()
  const tip = chain.confirmed[0]?.height ?? chain.nextHeight - 1
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
      hops.map((hop, index) => ({
        ...hop,
        key: `${networkPulse.id}-${index}`,
        pulseId: networkPulse.id,
        kind: networkPulse.kind,
      })),
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
  }, [networkPulse, pulseKey, edges, idSet])

  const own = player.ownNode
  const ownReady = own ? isOwnNodeReady(own, tip) : false
  const ownSynced = own ? ownNodeBlocksSynced(own, tip) : 0

  return (
    <div className="mx-auto w-full max-w-xl px-2">
      <p className="mb-1 text-center text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">
        {t('layers.network')}
      </p>
      <div className="relative mx-auto aspect-square w-full max-h-[min(42vh,22rem)]">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {edges.map((edge) => {
            const a = byId.get(edge.a)
            const b = byId.get(edge.b)
            if (!a || !b) {
              return null
            }
            const lit = informed.has(edge.a) && informed.has(edge.b) && informed.size > 0
            return (
              <line
                key={`${edge.a}-${edge.b}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={lit ? 'stroke-accent/70' : 'stroke-border/80'}
                strokeWidth={lit ? 0.9 : 0.55}
              />
            )
          })}
          {packets.map((packet) => {
            const from = byId.get(packet.fromId)
            const to = byId.get(packet.toId)
            if (!from || !to) {
              return null
            }
            return (
              <PacketDot
                key={packet.key}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                delayMs={packet.delayMs}
                kind={packet.kind}
              />
            )
          })}
        </svg>

        {nodes.map((node) => {
          const syncing = node.kind === 'own' && own && !ownReady
          const hot = informed.has(node.id)
          const progress = node.kind === 'own' && own ? ownNodeProgress(own, tip) : 1
          const short =
            node.id === EXCHANGE_NODE_ID
              ? t('layers.nodeExchangeShort')
              : node.kind === 'own'
                ? t('layers.nodeOwnShort')
                : node.name.split(' ')[0]
          const tipText =
            node.kind === 'exchange'
              ? t('layers.nodeExchangeTip')
              : node.kind === 'own' && syncing
                ? t('layers.nodeSyncingTip', {
                    done: ownSynced,
                    total: OWN_NODE_SYNC_BLOCKS,
                  })
                : node.kind === 'own'
                  ? t('layers.nodeOwnTip')
                  : node.kind === 'public'
                    ? t('layers.nodePublicTip')
                    : t('layers.nodeNpcTip')

          return (
            <div
              key={node.id}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              <Tooltip text={tipText} side="bottom">
                <div
                  className={`relative flex flex-col items-center gap-0.5 ${
                    hot ? 'scale-105' : ''
                  } transition`}
                >
                  {syncing && (
                    <span
                      className="absolute -inset-1 rounded-full border-2 border-accent/35"
                      style={{
                        background: `conic-gradient(var(--color-accent, #f7931a) ${progress * 360}deg, transparent 0)`,
                        mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
                        WebkitMask:
                          'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
                      }}
                    />
                  )}
                  <span
                    className={`rounded-full p-0.5 ring-2 ${
                      node.kind === 'own'
                        ? 'ring-accent'
                        : node.kind === 'exchange'
                          ? 'ring-amber-400/80'
                          : node.kind === 'public'
                            ? 'ring-sky-400/70'
                            : 'ring-border'
                    } ${hot ? 'ring-offset-1 ring-offset-bg-secondary' : ''}`}
                  >
                    <BitcoinNodeIcon className="h-7 w-7 md:h-8 md:w-8" title={node.name} />
                  </span>
                  <span className="max-w-[4.5rem] truncate text-center text-[10px] text-text-muted">
                    {short}
                    {syncing ? ` ${ownSynced}/${OWN_NODE_SYNC_BLOCKS}` : ''}
                  </span>
                </div>
              </Tooltip>
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
      r={kind === 'block' ? 1.35 : 1.1}
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
