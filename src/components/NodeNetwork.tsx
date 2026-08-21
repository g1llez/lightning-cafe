import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { sandboxBlockInterval } from '../simulation/chain'
import {
  MEMPOOL_NODE_ID,
  NODE_DISC_RADIUS,
  OWN_NODE_ID,
  PROPAGATION_HOP_MS,
  isOwnNodeReady,
  ownNodeProgress,
  ownNodeProgressPercent,
  propagationHops,
  visibleEdges,
  visibleNetwork,
} from '../simulation/nodes'
import type { GraphPacket } from '../simulation/livingGraph'
import { useSimulation } from '../simulation/SimulationProvider'
import { BitcoinNodeIcon } from './BitcoinNodeIcon'
import { NetworkCanvas } from './NetworkCanvas'
import { mempoolFlyId, nodeFlyId } from './SatsFlight'
import { Tooltip } from './Tooltip'

const TX_ORIGIN_HOLD_MS = 480

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
  const delivered = useRef(new Set<string>())
  const pulseKey = useRef<string | null>(null)
  const pulseRef = useRef(networkPulse)
  pulseRef.current = networkPulse

  const tip = chain.confirmed[0]?.height ?? chain.nextHeight - 1
  const blockFill = 1 - secondsLeft / sandboxBlockInterval()
  const catalog = useMemo(() => visibleNetwork(player.ownNode), [player.ownNode])
  const nodeIds = useMemo(() => catalog.map((node) => node.id), [catalog])
  const edges = useMemo(() => visibleEdges(new Set(nodeIds)), [nodeIds])
  const byMeta = useMemo(() => new Map(catalog.map((node) => [node.id, node])), [catalog])

  const [packets, setPackets] = useState<GraphPacket[]>([])

  useEffect(() => {
    if (!networkPulse || networkPulse.id === pulseKey.current) {
      return
    }
    if (!nodeIds.includes(networkPulse.originId)) {
      return
    }

    const pulse = networkPulse
    pulseKey.current = pulse.id
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const hold = pulse.kind === 'tx' && !reduced ? TX_ORIGIN_HOLD_MS : 0
    const hops = propagationHops(pulse.originId, edges)
    const born = Date.now()
    const kind = pulse.kind === 'block' ? 'block' : 'tx'

    setPackets(
      hops.map((hop, index) => ({
        id: `${pulse.id}-${index}`,
        fromId: hop.fromId,
        toId: hop.toId,
        kind,
        bornAt: born + hold + hop.delayMs - PROPAGATION_HOP_MS,
        duration: PROPAGATION_HOP_MS,
        tag: pulse.txId,
      })),
    )

    if (reduced && pulse.kind === 'tx' && pulse.txId) {
      revealRef.current(pulse.txId)
      onSatsSentRef.current(
        tRef.current('services.flyingSats', { sats: (pulse.sats ?? 0).toLocaleString() }),
        mempoolFlyId(pulse.lane ?? 'high'),
        nodeFlyId(MEMPOOL_NODE_ID),
      )
    }
  }, [networkPulse, nodeIds, edges])

  const own = player.ownNode
  const ownReady = own ? isOwnNodeReady(own, tip) : false
  const syncPercent = own ? ownNodeProgressPercent(own, tip, ownReady ? 0 : blockFill) : 0
  const syncProgress = own ? ownNodeProgress(own, tip, ownReady ? 0 : blockFill) : 1

  function handleArrive(packet: GraphPacket) {
    if (packet.kind !== 'tx' || packet.toId !== MEMPOOL_NODE_ID || !packet.tag) {
      return
    }
    if (delivered.current.has(packet.tag)) {
      return
    }
    delivered.current.add(packet.tag)
    revealRef.current(packet.tag)
    const pulse = pulseRef.current
    const lane = pulse?.txId === packet.tag ? pulse.lane : 'high'
    const sats = pulse?.txId === packet.tag ? pulse.sats : 0
    onSatsSentRef.current(
      tRef.current('services.flyingSats', { sats: (sats ?? 0).toLocaleString() }),
      mempoolFlyId(lane ?? 'high'),
      nodeFlyId(MEMPOOL_NODE_ID),
    )
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
        {t('layers.network')}
      </p>
      <NetworkCanvas
        nodeIds={nodeIds}
        edges={edges}
        discRadius={NODE_DISC_RADIUS}
        spawnId={OWN_NODE_ID}
        spawnFrom='[data-fly="node-table"]'
        extraPackets={packets}
        onPacketArrive={handleArrive}
        renderNode={(id) => {
          const node = byMeta.get(id)
          if (!node) {
            return null
          }
          const syncing = node.kind === 'own' && own && !ownReady
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

          const icon = (
            <span data-fly={nodeFlyId(node.id)} className="inline-flex">
              <BitcoinNodeIcon className="block h-10 w-10" title={node.name} />
            </span>
          )

          return (
            <div className="relative h-0 w-0">
              <div className="absolute left-0 top-0 h-10 w-10 -translate-x-1/2 -translate-y-1/2">
                {syncing && (
                  <span
                    className="pointer-events-none absolute -inset-1 rounded-full"
                    style={{
                      background: `conic-gradient(var(--color-accent, #f7931a) ${syncProgress * 360}deg, transparent 0)`,
                      mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
                      WebkitMask:
                        'radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 2px))',
                    }}
                  />
                )}
                {tipText ? (
                  <Tooltip text={tipText} side="top">
                    {icon}
                  </Tooltip>
                ) : (
                  icon
                )}
              </div>
              <div className="absolute left-0 top-[22px] flex -translate-x-1/2 flex-col items-center gap-0.5">
                <span className="max-w-[6.5rem] truncate text-center text-xs font-medium text-text-primary md:text-[13px]">
                  {node.name}
                </span>
                {node.kind === 'own' && own && (
                  <Tooltip
                    text={ownReady ? t('layers.nodeOwnTip') : t('layers.nodeSyncingTip')}
                    side="top"
                  >
                    <span className="flex cursor-help flex-col items-center font-mono text-[11px] leading-tight text-text-muted">
                      {ownReady ? (
                        t('assets.nodeReady')
                      ) : (
                        <>
                          <span>{t('assets.nodeSyncing', { percent: syncPercent })}</span>
                          <span>{t('assets.nodeValidating')}</span>
                        </>
                      )}
                    </span>
                  </Tooltip>
                )}
              </div>
            </div>
          )
        }}
      />
    </div>
  )
}
