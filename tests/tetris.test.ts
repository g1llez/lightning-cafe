import { describe, expect, it } from 'vitest'
import {
  TETRIS_COLS,
  TETRIS_DROP_SHARE,
  TETRIS_ROWS,
  tetrisFilledCount,
  tetrisPlan,
  tetrisPlanPaintedCount,
  tetrisScenarioCount,
  tetrisSnapshot,
  tetrisSpawnY,
} from '../src/simulation/tetris'

describe('block tetris scenarios', () => {
  it('loads the six lab recordings', () => {
    expect(tetrisScenarioCount()).toBe(6)
  })

  it('paints each recording onto the well by the end of the minute', () => {
    for (const seed of ['u-0', 'u-1', 'u-2', 'u-3', 'u-4', 'u-5', 'cafe', 'block-a']) {
      const plan = tetrisPlan(seed, 2_300)
      const done = tetrisSnapshot(plan, 1)
      expect(done.falling).toBeNull()
      expect(tetrisFilledCount(done.landed)).toBe(tetrisPlanPaintedCount(plan))
      expect(tetrisFilledCount(done.landed)).toBeGreaterThan(0)
      expect(tetrisFilledCount(done.landed)).toBeLessThanOrEqual(TETRIS_COLS * TETRIS_ROWS)
      expect(plan.length).toBeGreaterThanOrEqual(8)
    }
  })

  it('only falls through empty cells onto the recorded seat', () => {
    for (const seed of ['u-0', 'u-1', 'u-2', 'u-3', 'u-4', 'u-5']) {
      const plan = tetrisPlan(seed, 2_300)
      for (let index = 0; index < plan.length; index += 1) {
        const piece = plan[index]!
        const spawn = tetrisSpawnY(plan, index)
        expect(spawn).toBeLessThanOrEqual(piece.landY)
        const snapStart = tetrisSnapshot(plan, index / plan.length)
        // Mid-fall y stays between spawn and seat
        const mid = tetrisSnapshot(plan, (index + TETRIS_DROP_SHARE * 0.5) / plan.length)
        if (mid.falling && spawn < piece.landY) {
          expect(mid.falling.y).toBeGreaterThanOrEqual(spawn)
          expect(mid.falling.y).toBeLessThanOrEqual(piece.landY)
        }
        void snapStart
      }
    }
  })

  it('starts empty with a piece falling from its spawn', () => {
    const plan = tetrisPlan('u-2', 2_300)
    const start = tetrisSnapshot(plan, 0)
    expect(tetrisFilledCount(start.landed)).toBe(0)
    expect(start.falling?.y).toBe(tetrisSpawnY(plan, 0))
    expect(start.falling?.x).toBe(plan[0]?.x)
  })

  it('drops a piece then pauses, never sideways', () => {
    const plan = tetrisPlan('u-8', 2_000)
    const slot = 1 / plan.length
    const during = tetrisSnapshot(plan, slot * TETRIS_DROP_SHARE * 0.4)
    const later = tetrisSnapshot(plan, slot * TETRIS_DROP_SHARE * 0.8)
    const rest = tetrisSnapshot(plan, slot * 0.8)
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

  it('keeps mixed-color scenarios available', () => {
    const colorCounts = ['u-0', 'u-1', 'u-2', 'u-3', 'u-4', 'u-5', 'u-6', 'u-7', 'u-8', 'u-9'].map((seed) => {
      return new Set(tetrisPlan(seed, 2_300).map((piece) => piece.color)).size
    })
    expect(Math.max(...colorCounts)).toBeGreaterThanOrEqual(3)
  })

  it('paints the last landed pieces as yours', () => {
    const plain = tetrisSnapshot(tetrisPlan('u-2', 2_300, 0), 1).landed
    const mine = tetrisSnapshot(tetrisPlan('u-2', 2_300, 2), 1).landed
    expect(plain.flat().filter((cell) => cell?.kind === 'mine')).toHaveLength(0)
    expect(mine.flat().filter((cell) => cell?.kind === 'mine').length).toBeGreaterThan(0)
  })
})
