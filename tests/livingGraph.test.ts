import { describe, expect, it } from 'vitest'
import {
  DEFAULT_BOX,
  DEFAULT_LAYOUT,
  PACKET_HIDE_T,
  boxFromElement,
  edgeEnds,
  floodHops,
  htmlPercent,
  insertBody,
  mapClientToGraph,
  packetT,
  packetXY,
  pickAmbientFanout,
  pickAmbientHop,
  remapBodies,
  scatterBodies,
  settleBodies,
} from '../src/simulation/livingGraph'

describe('living graph layout', () => {
  it('scatters every id near the center', () => {
    const bodies = scatterBodies(['a', 'b', 'c'], () => 0.25)
    expect(bodies.map((body) => body.id)).toEqual(['a', 'b', 'c'])
    for (const body of bodies) {
      expect(body.x).toBeGreaterThan(30)
      expect(body.x).toBeLessThan(70)
      expect(body.y).toBeGreaterThan(30)
      expect(body.y).toBeLessThan(70)
    }
  })

  it('settles connected nodes inside the padded box', () => {
    const ids = ['a', 'b', 'c', 'd', 'e']
    const links = [
      { a: 'a', b: 'b' },
      { a: 'b', b: 'c' },
      { a: 'c', b: 'd' },
      { a: 'd', b: 'e' },
      { a: 'e', b: 'a' },
    ]
    const settled = settleBodies(scatterBodies(ids, () => 0.4), links, 120)
    const pad = DEFAULT_LAYOUT.padding
    for (const body of settled) {
      expect(body.x).toBeGreaterThanOrEqual(pad)
      expect(body.x).toBeLessThanOrEqual(100 - pad)
      expect(body.y).toBeGreaterThanOrEqual(pad)
      expect(body.y).toBeLessThanOrEqual(100 - pad)
    }
  })

  it('inserts a new body and lets the others make room', () => {
    const start = scatterBodies(['a', 'b'], () => 0.5)
    const next = insertBody(start, 'own', 8, 12)
    expect(next.some((body) => body.id === 'own' && body.x === 8 && body.y === 12)).toBe(true)
    expect(next).toHaveLength(3)
    const moved = settleBodies(
      next,
      [
        { a: 'a', b: 'own' },
        { a: 'b', b: 'own' },
      ],
      40,
    )
    const own = moved.find((body) => body.id === 'own')!
    expect(own.x).toBeGreaterThan(8)
  })

  it('picks a real hop on an existing link', () => {
    const hop = pickAmbientHop(
      [
        { a: 'a', b: 'b' },
        { a: 'b', b: 'c' },
      ],
      () => 0,
    )
    expect(hop).toEqual({ fromId: 'a', toId: 'b' })
  })

  it('maps screen coords to graph % without letterboxing on a square', () => {
    const box = { left: 100, top: 50, width: 400, height: 400 }
    expect(mapClientToGraph(box, 300, 250)).toEqual({ x: 50, y: 50 })
    expect(mapClientToGraph(box, 100, 50)).toEqual({ x: 0, y: 0 })
  })

  it('keeps packet progress in [0, 1]', () => {
    const packet = { id: 'p', fromId: 'a', toId: 'b', kind: 'ambient' as const, bornAt: 1000, duration: 500 }
    expect(packetT(packet, 900)).toBeNull()
    expect(packetT(packet, 1000)).toBe(0)
    expect(packetT(packet, 1250)).toBe(0.5)
    expect(packetT(packet, 2000)).toBe(1)
  })

  it('shortens edges to the disc rim', () => {
    const ends = edgeEnds(0, 0, 100, 0, 10)
    expect(ends.x1).toBeCloseTo(10)
    expect(ends.x2).toBeCloseTo(90)
  })

  it('fans out from a node to every neighbor at the same delay', () => {
    const hops = floodHops(
      'a',
      [
        { a: 'a', b: 'b' },
        { a: 'a', b: 'c' },
        { a: 'b', b: 'd' },
        { a: 'c', b: 'd' },
      ],
      500,
    )
    const first = hops.filter((hop) => hop.fromId === 'a')
    expect(first.map((hop) => hop.toId).sort()).toEqual(['b', 'c'])
    expect(first[0]?.delayMs).toBe(500)
    expect(first[1]?.delayMs).toBe(500)
    const second = hops.filter((hop) => hop.fromId !== 'a')
    expect(second).toHaveLength(1)
    expect(second[0]?.toId).toBe('d')
    expect(second[0]?.delayMs).toBe(1000)
  })

  it('picks a one-hop broadcast from a node', () => {
    const hops = pickAmbientFanout(
      [
        { a: 'hub', b: 'a' },
        { a: 'hub', b: 'b' },
        { a: 'hub', b: 'c' },
      ],
      () => 0,
    )
    expect(hops).toHaveLength(3)
    expect(hops.every((hop) => hop.fromId === 'hub')).toBe(true)
  })

  it('hides a packet before it reaches the destination rim', () => {
    const packet = { id: 'p', fromId: 'a', toId: 'b', kind: 'tx' as const, bornAt: 1000, duration: 500 }
    expect(packetXY(packet, { x: 0, y: 0 }, { x: 100, y: 0 }, 1000, 10)).toEqual({ x: 10, y: 0 })
    expect(packetXY(packet, { x: 0, y: 0 }, { x: 100, y: 0 }, 1000 + 500 * PACKET_HIDE_T, 10)).toBeNull()
    expect(packetXY(packet, { x: 0, y: 0 }, { x: 100, y: 0 }, 1600, 10)).toBeNull()
  })

  it('maps a wide canvas without letterboxing', () => {
    const graph = boxFromElement(800, 400)
    expect(graph).toEqual({ width: 100, height: 50 })
    const box = { left: 0, top: 0, width: 800, height: 400 }
    expect(mapClientToGraph(box, 400, 200, graph)).toEqual({ x: 50, y: 25 })
    expect(htmlPercent({ x: 50, y: 25 }, graph)).toEqual({ left: 50, top: 50 })
    expect(htmlPercent({ x: 50, y: 50 }, DEFAULT_BOX)).toEqual({ left: 50, top: 50 })
  })

  it('remaps bodies when the canvas becomes a wide rectangle', () => {
    const wide = { width: 100, height: 40 }
    const moved = remapBodies(
      [{ id: 'a', x: 50, y: 50, vx: 0, vy: 0 }],
      DEFAULT_BOX,
      wide,
    )
    expect(moved[0]?.x).toBe(50)
    expect(moved[0]?.y).toBe(20)
    expect(htmlPercent(moved[0]!, wide)).toEqual({ left: 50, top: 50 })
  })
})
