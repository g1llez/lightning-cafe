import { describe, expect, it } from 'vitest'
import {
  pickTetrisScenario,
  tetrisFilledCount,
  tetrisPlan,
  tetrisSnapshot,
  TETRIS_COLS,
  TETRIS_ROWS,
} from '../src/simulation/tetris'

describe('block tetris packing', () => {
  it('fills every cell by the end of the minute', () => {
    const plan = tetrisPlan('u-2', 2_300)
    const done = tetrisSnapshot(plan, 1)
    expect(done.falling).toBeNull()
    expect(tetrisFilledCount(done.landed)).toBe(TETRIS_COLS * TETRIS_ROWS)
  })

  it('starts empty with a piece falling from the top, already in its column', () => {
    const plan = tetrisPlan('u-2', 2_300)
    const start = tetrisSnapshot(plan, 0)
    expect(tetrisFilledCount(start.landed)).toBe(0)
    expect(start.falling?.y).toBe(0)
    expect(start.falling?.x).toBe(plan[0]?.x)
    expect(start.falling?.cells).toEqual(plan[0]?.cells)
  })

  it('only moves the active piece down, never sideways', () => {
    const plan = tetrisPlan('u-8', 2_000)
    const mid = tetrisSnapshot(plan, 0.03)
    const later = tetrisSnapshot(plan, 0.04)
    expect(mid.falling?.x).toBe(later.falling?.x)
    expect(later.falling?.y ?? 0).toBeGreaterThanOrEqual(mid.falling?.y ?? 0)
  })

  it('replays the same drops for the same block id', () => {
    expect(tetrisPlan('u-2', 2_300)).toEqual(tetrisPlan('u-2', 2_300))
    expect(pickTetrisScenario('u-2', 2_300)).not.toBeUndefined()
    expect(tetrisPlan('u-2', 2_300)).not.toEqual(tetrisPlan('u-8', 2_300))
  })

  it('keeps four full tilings (squares, rows, columns, split)', () => {
    const names = new Set(Array.from({ length: 12 }, (_, index) => pickTetrisScenario(`id-${index}`, 2_300)))
    expect(names.size).toBeGreaterThan(1)
    for (const txs of [1_742, 2_318, 2_905]) {
      expect(tetrisFilledCount(tetrisSnapshot(tetrisPlan('pack', txs), 1).landed)).toBe(64)
    }
  })

  it('paints the last landed pieces as yours', () => {
    const plain = tetrisSnapshot(tetrisPlan('u-2', 2_300, 0), 1).landed
    const mine = tetrisSnapshot(tetrisPlan('u-2', 2_300, 2), 1).landed
    expect(plain.flat().filter((cell) => cell === 'mine')).toHaveLength(0)
    expect(mine.flat().filter((cell) => cell === 'mine').length).toBeGreaterThan(0)
  })
})
