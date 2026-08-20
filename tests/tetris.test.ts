/**
 * One-off well coverage check — run via vitest.
 */
import { describe, expect, it } from 'vitest'
import {
  TETRIS_COLS,
  TETRIS_DROP_SHARE,
  TETRIS_ROWS,
  TETRIS_SPAWN_ROWS,
  tetrisFilledCount,
  tetrisPlan,
  tetrisShapeKey,
  tetrisSnapshot,
  tetrisWellsAreFull,
} from '../src/simulation/tetris'

describe('block tetris packing', () => {
  it('keeps every hand-packed well full with no overlaps', () => {
    expect(tetrisWellsAreFull()).toBe(true)
  })

  it('fills every cell by the end of the minute', () => {
    for (const seed of ['u-2', 'u-8', 'block-a', 'cafe']) {
      const plan = tetrisPlan(seed, 2_300)
      const done = tetrisSnapshot(plan, 1)
      expect(done.falling).toBeNull()
      expect(tetrisFilledCount(done.landed)).toBe(TETRIS_COLS * TETRIS_ROWS)
      expect(plan).toHaveLength(16)
    }
  })

  it('starts empty with a piece falling from above the well', () => {
    const plan = tetrisPlan('u-2', 2_300)
    const start = tetrisSnapshot(plan, 0)
    expect(tetrisFilledCount(start.landed)).toBe(0)
    expect(start.falling?.y).toBe(-TETRIS_SPAWN_ROWS)
    expect(start.falling?.x).toBe(plan[0]?.x)
    expect(start.falling?.cells).toEqual(plan[0]?.cells)
  })

  it('drops a piece quickly then pauses, never sideways', () => {
    const plan = tetrisPlan('u-8', 2_000)
    const slot = 1 / plan.length
    const during = tetrisSnapshot(plan, slot * TETRIS_DROP_SHARE * 0.4)
    const later = tetrisSnapshot(plan, slot * TETRIS_DROP_SHARE * 0.8)
    const rest = tetrisSnapshot(plan, slot * 0.5)
    expect(during.falling?.x).toBe(plan[0]?.x)
    expect(later.falling?.x).toBe(plan[0]?.x)
    expect(later.falling?.y ?? 0).toBeGreaterThan(during.falling?.y ?? 0)
    expect(later.falling?.y ?? 0).toBeLessThan(plan[0]?.landY ?? 0)
    expect(rest.falling).toBeNull()
    expect(tetrisFilledCount(rest.landed)).toBe(4)
  })

  it('replays the same drops for the same block id', () => {
    expect(tetrisPlan('u-2', 2_300)).toEqual(tetrisPlan('u-2', 2_300))
    expect(tetrisPlan('u-2', 2_300)).not.toEqual(tetrisPlan('u-8', 2_300))
  })

  it('uses mixed tetrominoes, never only squares or only bars', () => {
    for (const seed of ['u-0', 'u-1', 'u-2', 'u-3', 'u-4', 'u-5', 'u-6', 'u-7', 'u-8', 'cafe', 'block-a']) {
      const plan = tetrisPlan(seed, 2_300)
      const colors = new Set(plan.map((piece) => piece.color))
      expect(colors.size).toBeGreaterThanOrEqual(4)
      expect(plan.filter((piece) => piece.color === 'cyan').length).toBeLessThanOrEqual(4)
      expect(plan.filter((piece) => piece.color === 'yellow').length).toBeLessThanOrEqual(4)
    }
    const keys = new Set<string>()
    for (const seed of ['u-0', 'u-1', 'u-2', 'u-3', 'u-4', 'u-5']) {
      for (const piece of tetrisPlan(seed, 2_300)) {
        keys.add(tetrisShapeKey(piece.cells))
      }
    }
    expect(keys.size).toBeGreaterThan(4)
  })

  it('paints the last landed pieces as yours', () => {
    const plain = tetrisSnapshot(tetrisPlan('u-2', 2_300, 0), 1).landed
    const mine = tetrisSnapshot(tetrisPlan('u-2', 2_300, 2), 1).landed
    expect(plain.flat().filter((cell) => cell?.kind === 'mine')).toHaveLength(0)
    expect(mine.flat().filter((cell) => cell?.kind === 'mine').length).toBeGreaterThan(0)
  })

  it('keeps a colored mosaic for the same block id after it is full', () => {
    const plan = tetrisPlan('u-2', 2_300)
    const done = tetrisSnapshot(plan, 1)
    const colors = new Set(done.landed.flat().map((cell) => cell?.color).filter(Boolean))
    expect(colors.size).toBeGreaterThan(1)
    expect(tetrisPlan('u-2', 2_300).map((piece) => piece.color)).toEqual(plan.map((piece) => piece.color))
  })
})
