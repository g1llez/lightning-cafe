import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LAYOUT,
  edgeEnds,
  insertBody,
  mapClientToGraph,
  packetT,
  pickAmbientHop,
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
})
