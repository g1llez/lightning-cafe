/**
 * Living graph: force layout + packets. No Bitcoin/Lightning specifics.
 * Positions live in a 0–100 box so SVG and HTML % stay aligned on a square.
 */

export const GRAPH_SIZE = 100

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
  repulsion: 380,
  spring: 0.05,
  restLength: 30,
  gravity: 0.018,
  damping: 0.86,
  padding: 14,
}

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
  around = { x: 50, y: 50 },
  spread = 8,
): GraphBody[] {
  return ids.map((id) => ({
    id,
    x: around.x + (random() - 0.5) * spread * 2,
    y: around.y + (random() - 0.5) * spread * 2,
    vx: (random() - 0.5) * 1.4,
    vy: (random() - 0.5) * 1.4,
  }))
}

/** Drop a body in (e.g. flying from a table) and nudge the others to make room. */
export function insertBody(
  bodies: GraphBody[],
  id: string,
  x: number,
  y: number,
): GraphBody[] {
  if (bodies.some((body) => body.id === id)) {
    return bodies
  }
  return [
    ...bodies.map((body) => ({
      ...body,
      vx: body.vx + (body.x - 50) * 0.04,
      vy: body.vy + (body.y - 50) * 0.04,
    })),
    { id, x, y, vx: (50 - x) * 0.08, vy: (50 - y) * 0.08 },
  ]
}

export function dropBody(bodies: GraphBody[], id: string): GraphBody[] {
  return bodies.filter((body) => body.id !== id)
}

export function stepBodies(
  bodies: GraphBody[],
  links: GraphLink[],
  tuning: LayoutTuning = DEFAULT_LAYOUT,
): GraphBody[] {
  if (bodies.length === 0) {
    return bodies
  }

  const next = bodies.map((body) => ({ ...body }))
  const byId = new Map(next.map((body) => [body.id, body]))

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
    const pull = (dist - tuning.restLength) * tuning.spring
    const ux = dx / dist
    const uy = dy / dist
    a.vx += ux * pull
    a.vy += uy * pull
    b.vx -= ux * pull
    b.vy -= uy * pull
  }

  const mid = GRAPH_SIZE / 2
  const lo = tuning.padding
  const hi = GRAPH_SIZE - tuning.padding

  for (const body of next) {
    body.vx += (mid - body.x) * tuning.gravity
    body.vy += (mid - body.y) * tuning.gravity
    if (body.x < lo) {
      body.vx += (lo - body.x) * 0.12
    }
    if (body.x > hi) {
      body.vx -= (body.x - hi) * 0.12
    }
    if (body.y < lo) {
      body.vy += (lo - body.y) * 0.12
    }
    if (body.y > hi) {
      body.vy -= (body.y - hi) * 0.12
    }
    body.vx *= tuning.damping
    body.vy *= tuning.damping
    body.x += body.vx
    body.y += body.vy
    body.x = Math.min(hi, Math.max(lo, body.x))
    body.y = Math.min(hi, Math.max(lo, body.y))
  }

  return next
}

export function settleBodies(
  bodies: GraphBody[],
  links: GraphLink[],
  ticks = 90,
  tuning: LayoutTuning = DEFAULT_LAYOUT,
): GraphBody[] {
  let current = bodies
  for (let i = 0; i < ticks; i += 1) {
    current = stepBodies(current, links, tuning)
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
): { x: number; y: number } | null {
  const t = packetT(packet, nowMs)
  if (t == null) {
    return null
  }
  const ends = edgeEnds(from.x, from.y, to.x, to.y, pad)
  return {
    x: ends.x1 + (ends.x2 - ends.x1) * t,
    y: ends.y1 + (ends.y2 - ends.y1) * t,
  }
}

export function pickAmbientHop(
  links: GraphLink[],
  random: () => number = Math.random,
): { fromId: string; toId: string } | null {
  if (links.length === 0) {
    return null
  }
  const link = links[Math.floor(random() * links.length)]!
  if (random() < 0.5) {
    return { fromId: link.a, toId: link.b }
  }
  return { fromId: link.b, toId: link.a }
}

export function mapClientToGraph(
  box: { left: number; top: number; width: number; height: number },
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  if (box.width <= 0 || box.height <= 0) {
    return { x: 50, y: 50 }
  }
  return {
    x: ((clientX - box.left) / box.width) * GRAPH_SIZE,
    y: ((clientY - box.top) / box.height) * GRAPH_SIZE,
  }
}
