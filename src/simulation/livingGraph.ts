/**
 * Living graph: force layout + packets. No Bitcoin/Lightning specifics.
 * x/y live in a {width × height} box (width is always 100). HTML % and SVG
 * viewBox must use the same box so a wide canvas stays aligned.
 */

export const GRAPH_SIZE = 100

export type GraphBox = {
  width: number
  height: number
}

export const DEFAULT_BOX: GraphBox = { width: GRAPH_SIZE, height: GRAPH_SIZE }

export function boxFromElement(widthPx: number, heightPx: number): GraphBox {
  if (widthPx <= 0 || heightPx <= 0) {
    return DEFAULT_BOX
  }
  return { width: GRAPH_SIZE, height: (heightPx / widthPx) * GRAPH_SIZE }
}

export function discRadiusFor(widthPx: number, iconPx: number, box: GraphBox = DEFAULT_BOX): number {
  if (widthPx <= 0) {
    return 5
  }
  return (iconPx / 2 / widthPx) * box.width
}

export type GraphBody = {
  id: string
  x: number
  y: number
  vx: number
  vy: number
}

export type GraphLink = {
  a: string
  b: string
}

export type LayoutTuning = {
  repulsion: number
  spring: number
  restLength: number
  gravity: number
  damping: number
  padding: number
}

export const DEFAULT_LAYOUT: LayoutTuning = {
  repulsion: 300,
  spring: 0.04,
  restLength: 22,
  gravity: 0.014,
  damping: 0.88,
  padding: 10,
}

/** Live step: about 1s of leftover motion after the start ring. */
export const LAYOUT_DT = 0.72
export const PACKET_HIDE_T = 0.84

export type PacketKind = 'ambient' | 'tx' | 'block'

export type GraphPacket = {
  id: string
  fromId: string
  toId: string
  kind: PacketKind
  /** Epoch ms when the hop starts. */
  bornAt: number
  duration: number
  /** Optional app tag (e.g. pending tx id). */
  tag?: string
}

export function scatterBodies(
  ids: string[],
  random: () => number = Math.random,
  box: GraphBox = DEFAULT_BOX,
): GraphBody[] {
  const cx = box.width / 2
  const cy = box.height / 2
  const n = Math.max(ids.length, 1)
  const rx = Math.min(box.width * 0.28, 28)
  const ry = Math.min(box.height * 0.34, rx)
  return ids.map((id, index) => {
    const angle = (index / n) * Math.PI * 2 + random() * 0.35
    const jitter = 0.75 + random() * 0.25
    return {
      id,
      x: cx + Math.cos(angle) * rx * jitter,
      y: cy + Math.sin(angle) * ry * jitter,
      vx: (random() - 0.5) * 0.2,
      vy: (random() - 0.5) * 0.2,
    }
  })
}

/** Drop a body in (e.g. flying from a table) and nudge the others to make room. */
export function insertBody(
  bodies: GraphBody[],
  id: string,
  x: number,
  y: number,
  box: GraphBox = DEFAULT_BOX,
): GraphBody[] {
  if (bodies.some((body) => body.id === id)) {
    return bodies
  }
  const cx = box.width / 2
  const cy = box.height / 2
  return [
    ...bodies.map((body) => ({
      ...body,
      vx: body.vx + (body.x - cx) * 0.02,
      vy: body.vy + (body.y - cy) * 0.02,
    })),
    { id, x, y, vx: (cx - x) * 0.04, vy: (cy - y) * 0.04 },
  ]
}

export function dropBody(bodies: GraphBody[], id: string): GraphBody[] {
  return bodies.filter((body) => body.id !== id)
}

/** Keep bodies inside a resized viewBox (wide canvas after the first measure). */
export function remapBodies(bodies: GraphBody[], from: GraphBox, to: GraphBox): GraphBody[] {
  if (from.width === to.width && from.height === to.height) {
    return bodies
  }
  const sx = to.width / (from.width || 1)
  const sy = to.height / (from.height || 1)
  return bodies.map((body) => ({
    ...body,
    x: body.x * sx,
    y: body.y * sy,
  }))
}

export function stepBodies(
  bodies: GraphBody[],
  links: GraphLink[],
  tuning: LayoutTuning = DEFAULT_LAYOUT,
  box: GraphBox = DEFAULT_BOX,
  dt = LAYOUT_DT,
): GraphBody[] {
  if (bodies.length === 0) {
    return bodies
  }

  const next = bodies.map((body) => ({ ...body }))
  const byId = new Map(next.map((body) => [body.id, body]))
  const rest =
    tuning.restLength * Math.max(0.58, Math.min(1, Math.min(box.width, box.height) / 72))

  for (let i = 0; i < next.length; i += 1) {
    for (let j = i + 1; j < next.length; j += 1) {
      const a = next[i]!
      const b = next[j]!
      const dx = b.x - a.x
      const dy = b.y - a.y
      const dist = Math.hypot(dx, dy) || 0.05
      const push = tuning.repulsion / (dist * dist)
      const ux = dx / dist
      const uy = dy / dist
      a.vx -= ux * push
      a.vy -= uy * push
      b.vx += ux * push
      b.vy += uy * push
    }
  }

  for (const link of links) {
    const a = byId.get(link.a)
    const b = byId.get(link.b)
    if (!a || !b) {
      continue
    }
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dist = Math.hypot(dx, dy) || 0.05
    const pull = (dist - rest) * tuning.spring
    const ux = dx / dist
    const uy = dy / dist
    a.vx += ux * pull
    a.vy += uy * pull
    b.vx -= ux * pull
    b.vy -= uy * pull
  }

  const midX = box.width / 2
  const midY = box.height / 2
  const loX = tuning.padding
  const hiX = box.width - tuning.padding
  const loY = Math.min(tuning.padding, box.height * 0.18)
  const hiY = box.height - loY

  for (const body of next) {
    body.vx += (midX - body.x) * tuning.gravity
    body.vy += (midY - body.y) * tuning.gravity
    if (body.x < loX) {
      body.vx += (loX - body.x) * 0.12
    }
    if (body.x > hiX) {
      body.vx -= (body.x - hiX) * 0.12
    }
    if (body.y < loY) {
      body.vy += (loY - body.y) * 0.12
    }
    if (body.y > hiY) {
      body.vy -= (body.y - hiY) * 0.12
    }
    body.vx *= tuning.damping
    body.vy *= tuning.damping
    body.x += body.vx * dt
    body.y += body.vy * dt
    body.x = Math.min(hiX, Math.max(loX, body.x))
    body.y = Math.min(hiY, Math.max(loY, body.y))
  }

  return next
}

export function settleBodies(
  bodies: GraphBody[],
  links: GraphLink[],
  ticks = 90,
  tuning: LayoutTuning = DEFAULT_LAYOUT,
  box: GraphBox = DEFAULT_BOX,
): GraphBody[] {
  let current = bodies
  for (let i = 0; i < ticks; i += 1) {
    current = stepBodies(current, links, tuning, box, 1)
  }
  return current
}

export function energyOf(bodies: GraphBody[]): number {
  return bodies.reduce((sum, body) => sum + body.vx * body.vx + body.vy * body.vy, 0)
}

/** Slow orbit so a settled graph still feels alive. */
export function idleOffset(id: string, nowMs: number): { x: number; y: number } {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  const phase = (hash % 1000) / 1000
  return {
    x: Math.sin(nowMs * 0.00055 + phase * 6.2) * 1.15,
    y: Math.cos(nowMs * 0.0007 + phase * 4.1) * 1.15,
  }
}

export function displayedPosition(
  body: GraphBody,
  nowMs: number,
  idle: boolean,
): { x: number; y: number } {
  if (!idle) {
    return { x: body.x, y: body.y }
  }
  const offset = idleOffset(body.id, nowMs)
  return { x: body.x + offset.x, y: body.y + offset.y }
}

export function edgeEnds(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  pad: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  if (len <= pad * 2) {
    return { x1, y1, x2, y2 }
  }
  const ux = dx / len
  const uy = dy / len
  return {
    x1: x1 + ux * pad,
    y1: y1 + uy * pad,
    x2: x2 - ux * pad,
    y2: y2 - uy * pad,
  }
}

export function packetT(packet: GraphPacket, nowMs: number): number | null {
  if (nowMs < packet.bornAt) {
    return null
  }
  return Math.min(1, (nowMs - packet.bornAt) / packet.duration)
}

export function packetXY(
  packet: GraphPacket,
  from: { x: number; y: number },
  to: { x: number; y: number },
  nowMs: number,
  pad: number,
  hideT = PACKET_HIDE_T,
): { x: number; y: number } | null {
  const t = packetT(packet, nowMs)
  if (t == null || t >= hideT) {
    return null
  }
  const ends = edgeEnds(from.x, from.y, to.x, to.y, pad)
  const u = t / hideT
  return {
    x: ends.x1 + (ends.x2 - ends.x1) * u,
    y: ends.y1 + (ends.y2 - ends.y1) * u,
  }
}

export function neighborIds(id: string, links: GraphLink[]): string[] {
  const out: string[] = []
  for (const link of links) {
    if (link.a === id) {
      out.push(link.b)
    } else if (link.b === id) {
      out.push(link.a)
    }
  }
  return out
}

/** One node broadcasts to every neighbor at once. */
export function fanoutFrom(fromId: string, links: GraphLink[]): { fromId: string; toId: string }[] {
  return neighborIds(fromId, links).map((toId) => ({ fromId, toId }))
}

/**
 * Gossip flood: when a node learns the tx it announces to every neighbor
 * except the peer it heard it from. Already-informed peers still get a hop
 * so the second wave is visible.
 */
export function floodHops(
  originId: string,
  links: GraphLink[],
  hopMs: number,
): { fromId: string; toId: string; delayMs: number }[] {
  const hops: { fromId: string; toId: string; delayMs: number }[] = []
  const informedAt = new Map<string, number>([[originId, 0]])
  const parent = new Map<string, string | null>([[originId, null]])
  const queue: string[] = [originId]

  while (queue.length > 0) {
    const current = queue.shift()!
    const t = informedAt.get(current) ?? 0
    const from = parent.get(current)
    for (const next of neighborIds(current, links)) {
      if (next === from) {
        continue
      }
      hops.push({ fromId: current, toId: next, delayMs: t + hopMs })
      if (!informedAt.has(next)) {
        informedAt.set(next, t + hopMs)
        parent.set(next, current)
        queue.push(next)
      }
    }
  }

  return hops
}

export function pickAmbientFanout(
  links: GraphLink[],
  random: () => number = Math.random,
): { fromId: string; toId: string }[] {
  const ids = [...new Set(links.flatMap((link) => [link.a, link.b]))]
  if (ids.length === 0) {
    return []
  }
  const fromId = ids[Math.floor(random() * ids.length)]!
  return fanoutFrom(fromId, links)
}

export function pickAmbientHop(
  links: GraphLink[],
  random: () => number = Math.random,
): { fromId: string; toId: string } | null {
  const hops = pickAmbientFanout(links, random)
  return hops[0] ?? null
}

export function mapClientToGraph(
  box: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
  graph: GraphBox = DEFAULT_BOX,
): { x: number; y: number } {
  if (box.width <= 0 || box.height <= 0) {
    return { x: graph.width / 2, y: graph.height / 2 }
  }
  return {
    x: ((clientX - box.left) / box.width) * graph.width,
    y: ((clientY - box.top) / box.height) * graph.height,
  }
}

export function htmlPercent(pos: { x: number; y: number }, graph: GraphBox): { left: number; top: number } {
  return {
    left: (pos.x / graph.width) * 100,
    top: (pos.y / graph.height) * 100,
  }
}
