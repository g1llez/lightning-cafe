import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  displayedPosition,
  edgeEnds,
  energyOf,
  insertBody,
  mapClientToGraph,
  packetXY,
  pickAmbientHop,
  scatterBodies,
  settleBodies,
  stepBodies,
  type GraphBody,
  type GraphLink,
  type GraphPacket,
} from '../simulation/livingGraph'

const EAT_MS = 280
const AMBIENT_MS = 720
const ENERGY_IDLE = 0.35

export type NetworkCanvasProps = {
  nodeIds: string[]
  edges: GraphLink[]
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
  const knownRef = useRef<Set<string>>(new Set())
  const arriveRef = useRef(onPacketArrive)
  arriveRef.current = onPacketArrive
  const seenPackets = useRef(new Set<string>())
  const edgesRef = useRef(edges)
  edgesRef.current = edges
  const idKey = nodeIds.join('|')

  const [bodies, setBodies] = useState<GraphBody[]>([])
  const [now, setNow] = useState(() => Date.now())
  const [ambientPackets, setAmbientPackets] = useState<GraphPacket[]>([])
  const [eatingUntil, setEatingUntil] = useState<Record<string, number>>({})
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    const ids = nodeIds
    const known = knownRef.current
    const added = ids.filter((id) => !known.has(id))
    const removed = [...known].filter((id) => !ids.includes(id))

    if (added.length === 0 && removed.length === 0 && bodiesRef.current.length > 0) {
      return
    }

    const reduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let next: GraphBody[]
    if (known.size === 0) {
      next = scatterBodies(ids)
    } else {
      next = dropBodyMany(bodiesRef.current, removed)
      for (const id of added) {
        const spawn = id === spawnId ? spawnPoint(boxRef.current, spawnFrom) : null
        next = insertBody(
          next,
          id,
          spawn?.x ?? 50 + (Math.random() - 0.5) * 10,
          spawn?.y ?? 50 + (Math.random() - 0.5) * 10,
        )
      }
    }

    if (reduced) {
      next = settleBodies(next, edgesRef.current)
    }

    bodiesRef.current = next
    knownRef.current = new Set(ids)
    setBodies(next)
    setIdle(false)
  }, [idKey, spawnId, spawnFrom])

  useEffect(() => {
    let frame = 0
    const tick = () => {
      const current = stepBodies(bodiesRef.current, edgesRef.current)
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
      const hop = pickAmbientHop(edges)
      if (hop) {
        const packet: GraphPacket = {
          id: `amb-${Date.now()}-${hop.fromId}`,
          fromId: hop.fromId,
          toId: hop.toId,
          kind: 'ambient',
          bornAt: Date.now(),
          duration: AMBIENT_MS,
        }
        setAmbientPackets((current) => [...current.slice(-4), packet])
      }
      timer = window.setTimeout(loop, 700 + Math.random() * 900)
    }
    timer = window.setTimeout(loop, 600)
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
      className="relative mx-auto aspect-square w-[min(100%,min(52vh,28rem))]"
      style={{ containerType: 'size' }}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
        {edges.map((edge) => {
          const a = byId.get(edge.a)
          const b = byId.get(edge.b)
          if (!a || !b) {
            return null
          }
          const ends = edgeEnds(a.x, a.y, b.x, b.y, discRadius)
          return (
            <line
              key={`${edge.a}-${edge.b}`}
              x1={ends.x1}
              y1={ends.y1}
              x2={ends.x2}
              y2={ends.y2}
              className="stroke-border/80"
              strokeWidth={0.65}
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
          const pos = packetXY(packet, from, to, now, discRadius)
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
        return (
          <div
            key={id}
            className="absolute z-[1]"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
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
  const radius = own ? 1.65 : packet.kind === 'block' ? 1.35 : 0.72
  const fill = own ? '#fbbf24' : packet.kind === 'block' ? '#f7931a' : '#f8fafc'
  return <circle cx={x} cy={y} r={radius} fill={fill} opacity={own ? 0.95 : 0.8} />
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
  selector?: string,
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
  )
}
