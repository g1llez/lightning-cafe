import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  DEFAULT_BOX,
  boxFromElement,
  discRadiusFor,
  displayedPosition,
  edgeEnds,
  energyOf,
  htmlPercent,
  insertBody,
  mapClientToGraph,
  packetXY,
  pickAmbientFanout,
  remapBodies,
  scatterBodies,
  settleBodies,
  stepBodies,
  type GraphBody,
  type GraphBox,
  type GraphLink,
  type GraphPacket,
} from '../simulation/livingGraph'

const EAT_MS = 420
const AMBIENT_MS = 1100
const ENERGY_IDLE = 0.35
const ICON_PX = 40
/** Extra graph-units so a tx disc hides before the Bitcoin rim. */
const PACKET_RIM_PAD = 1.85

export type NetworkCanvasProps = {
  nodeIds: string[]
  edges: GraphLink[]
  /** Fallback disc radius until the box is measured. */
  discRadius: number
  renderNode: (id: string, eating: boolean) => ReactNode
  /** data-fly selector used as the entry point when `spawnId` first appears. */
  spawnFrom?: string
  spawnId?: string | null
  extraPackets?: GraphPacket[]
  ambient?: boolean
  onPacketArrive?: (packet: GraphPacket) => void
}

export function NetworkCanvas({
  nodeIds,
  edges,
  discRadius,
  renderNode,
  spawnFrom,
  spawnId,
  extraPackets = [],
  ambient = true,
  onPacketArrive,
}: NetworkCanvasProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const bodiesRef = useRef<GraphBody[]>([])
  const knownRef = useRef(new Set<string>())
  const arriveRef = useRef(onPacketArrive)
  arriveRef.current = onPacketArrive
  const seenPackets = useRef(new Set<string>())
  const edgesRef = useRef(edges)
  edgesRef.current = edges
  const graphRef = useRef<GraphBox>(DEFAULT_BOX)
  const idKey = nodeIds.join('|')

  const [bodies, setBodies] = useState<GraphBody[]>([])
  const [now, setNow] = useState(() => Date.now())
  const [ambientPackets, setAmbientPackets] = useState<GraphPacket[]>([])
  const [eatingUntil, setEatingUntil] = useState<Record<string, number>>({})
  const [idle, setIdle] = useState(false)
  const [graph, setGraph] = useState<GraphBox>(DEFAULT_BOX)
  const [pad, setPad] = useState(discRadius)
  const [boxReady, setBoxReady] = useState(false)

  useEffect(() => {
    const el = boxRef.current
    if (!el) {
      return
    }
    const apply = () => {
      const widthPx = el.clientWidth
      const heightPx = el.clientHeight
      if (widthPx < 8 || heightPx < 8) {
        return
      }
      const next = boxFromElement(widthPx, heightPx)
      const prev = graphRef.current
      if (
        bodiesRef.current.length > 0 &&
        (prev.width !== next.width || prev.height !== next.height)
      ) {
        const remapped = remapBodies(bodiesRef.current, prev, next)
        bodiesRef.current = remapped
        setBodies(remapped)
      }
      graphRef.current = next
      setGraph(next)
      setPad(discRadiusFor(widthPx, ICON_PX, next))
      setBoxReady(true)
    }
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!boxReady) {
      return
    }
    const ids = nodeIds
    const known = knownRef.current
    const added = ids.filter((id) => !known.has(id))
    const removed = [...known].filter((id) => !ids.includes(id))

    if (added.length === 0 && removed.length === 0 && bodiesRef.current.length > 0) {
      return
    }

    const reduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const box = graphRef.current

    let next: GraphBody[]
    if (known.size === 0) {
      next = scatterBodies(ids, Math.random, box)
    } else {
      next = dropBodyMany(bodiesRef.current, removed)
      for (const id of added) {
        const spawn = id === spawnId ? spawnPoint(boxRef.current, spawnFrom, box) : null
        const x = spawn?.x ?? box.width / 2 + (Math.random() - 0.5) * 10
        const y = spawn?.y ?? box.height / 2 + (Math.random() - 0.5) * 6
        next = insertBody(next, id, x, clamp(y, 8, box.height - 8), box)
      }
    }

    if (reduced) {
      next = settleBodies(next, edgesRef.current, 90, undefined, box)
    }

    bodiesRef.current = next
    knownRef.current = new Set(ids)
    setBodies(next)
    setIdle(false)
  }, [boxReady, idKey, spawnId, spawnFrom])

  useEffect(() => {
    let frame = 0
    const tick = () => {
      const current = stepBodies(bodiesRef.current, edgesRef.current, undefined, graphRef.current)
      bodiesRef.current = current
      setBodies(current)
      const stamp = Date.now()
      setNow(stamp)
      setIdle(energyOf(current) < ENERGY_IDLE)
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!ambient) {
      return
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      return
    }

    let timer = 0
    const loop = () => {
      const hops = pickAmbientFanout(edges)
      if (hops.length > 0) {
        const bornAt = Date.now()
        const wave: GraphPacket[] = hops.map((hop, index) => ({
          id: `amb-${bornAt}-${hop.fromId}-${hop.toId}-${index}`,
          fromId: hop.fromId,
          toId: hop.toId,
          kind: 'ambient',
          bornAt,
          duration: AMBIENT_MS,
        }))
        setAmbientPackets((current) => [...current.slice(-6), ...wave])
      }
      timer = window.setTimeout(loop, 900 + Math.random() * 1100)
    }
    timer = window.setTimeout(loop, 700)
    return () => window.clearTimeout(timer)
  }, [ambient, edges])

  const packets = [...ambientPackets, ...extraPackets]

  useEffect(() => {
    const stamp = now
    const fresh: GraphPacket[] = []
    for (const packet of packets) {
      if (stamp < packet.bornAt + packet.duration) {
        continue
      }
      if (seenPackets.current.has(packet.id)) {
        continue
      }
      seenPackets.current.add(packet.id)
      fresh.push(packet)
    }
    if (fresh.length === 0) {
      return
    }
    setAmbientPackets((current) =>
      current.filter((packet) => stamp < packet.bornAt + packet.duration),
    )
    setEatingUntil((current) => {
      const next = { ...current }
      for (const packet of fresh) {
        next[packet.toId] = stamp + EAT_MS
        arriveRef.current?.(packet)
      }
      return next
    })
  }, [now, packets])

  const byId = new Map(
    bodies.map((body) => [body.id, displayedPosition(body, now, idle)]),
  )

  return (
    <div
      ref={boxRef}
      className="relative mx-auto h-[min(46vh,26rem)] w-full"
      style={{ containerType: 'size' }}
    >
      <svg
        viewBox={`0 0 ${graph.width} ${graph.height}`}
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full overflow-visible"
      >
        {edges.map((edge) => {
          const a = byId.get(edge.a)
          const b = byId.get(edge.b)
          if (!a || !b) {
            return null
          }
          const ends = edgeEnds(a.x, a.y, b.x, b.y, pad)
          return (
            <line
              key={`${edge.a}-${edge.b}`}
              x1={ends.x1}
              y1={ends.y1}
              x2={ends.x2}
              y2={ends.y2}
              className="stroke-border/80"
              strokeWidth={0.55}
              strokeLinecap="round"
            />
          )
        })}
        {packets.map((packet) => {
          const from = byId.get(packet.fromId)
          const to = byId.get(packet.toId)
          if (!from || !to) {
            return null
          }
          const extra = packet.kind === 'tx' ? PACKET_RIM_PAD : packet.kind === 'block' ? 1.2 : 0.55
          const pos = packetXY(packet, from, to, now, pad + extra)
          if (!pos) {
            return null
          }
          return <PacketDot key={packet.id} packet={packet} x={pos.x} y={pos.y} />
        })}
      </svg>

      {nodeIds.map((id) => {
        const pos = byId.get(id)
        if (!pos) {
          return null
        }
        const eating = (eatingUntil[id] ?? 0) > now
        const pct = htmlPercent(pos, graph)
        return (
          <div
            key={id}
            className="absolute z-[1]"
            style={{ left: `${pct.left}%`, top: `${pct.top}%`, width: 0, height: 0 }}
          >
            <div
              className="origin-center transition-transform duration-200 ease-out"
              style={{ transform: `scale(${eating ? 1.2 : 1})` }}
            >
              {renderNode(id, eating)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PacketDot({
  packet,
  x,
  y,
}: {
  packet: GraphPacket
  x: number
  y: number
}) {
  const own = packet.kind === 'tx'
  const radius = own ? 1.35 : packet.kind === 'block' ? 1.15 : 0.62
  const fill = own ? '#fbbf24' : packet.kind === 'block' ? '#f7931a' : '#f8fafc'
  return <circle cx={x} cy={y} r={radius} fill={fill} opacity={own ? 0.95 : 0.8} />
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value))
}

function dropBodyMany(bodies: GraphBody[], ids: string[]): GraphBody[] {
  if (ids.length === 0) {
    return bodies
  }
  const drop = new Set(ids)
  return bodies.filter((body) => !drop.has(body.id))
}

function spawnPoint(
  box: HTMLDivElement | null,
  selector: string | undefined,
  graph: GraphBox,
): { x: number; y: number } | null {
  if (!box || !selector) {
    return null
  }
  const source = document.querySelector(selector)
  if (!source) {
    return null
  }
  const from = source.getBoundingClientRect()
  return mapClientToGraph(
    box.getBoundingClientRect(),
    from.left + from.width / 2,
    from.top + from.height / 2,
    graph,
  )
}
