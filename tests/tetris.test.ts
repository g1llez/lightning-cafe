import { describe, expect, it } from 'vitest'
import {
  pickTetrisScenario,
  tetrisFilledCount,
  tetrisGrid,
  TETRIS_COLS,
  TETRIS_ROWS,
} from '../src/simulation/tetris'

describe('block tetris packing', () => {
  it('is empty at the start of the minute and fuller at the end', () => {
    const empty = tetrisGrid('u-2', 0, 2_300)
    const full = tetrisGrid('u-2', 1, 2_300)
    expect(tetrisFilledCount(empty)).toBe(0)
    expect(tetrisFilledCount(full)).toBeGreaterThan(tetrisFilledCount(tetrisGrid('u-2', 0.4, 2_300)))
    expect(full).toHaveLength(TETRIS_ROWS)
    expect(full[0]).toHaveLength(TETRIS_COLS)
  })

  it('replays the same well for the same block id', () => {
    expect(tetrisGrid('u-2', 1, 2_300)).toEqual(tetrisGrid('u-2', 1, 2_300))
    expect(tetrisGrid('u-2', 1, 2_300)).not.toEqual(tetrisGrid('u-8', 1, 2_300))
  })

  it('picks quieter / busier scenarios from the mempool size', () => {
    expect(pickTetrisScenario('same', 1_742)).toBe('sparse')
    expect(pickTetrisScenario('same', 2_905)).toBe('packed')
  })

  it('packs more cells when the mempool is jammed', () => {
    const sparse = tetrisFilledCount(tetrisGrid('block-a', 1, 1_742))
    const packed = tetrisFilledCount(tetrisGrid('block-a', 1, 2_905))
    expect(packed).toBeGreaterThan(sparse)
  })

  it('does not clear lines: cells only stack', () => {
    const grid = tetrisGrid('u-2', 1, 2_318)
    const filled = tetrisFilledCount(grid)
    expect(filled).toBeGreaterThan(0)
    expect(filled).toBeLessThanOrEqual(TETRIS_COLS * TETRIS_ROWS)
  })

  it('paints the last landed pieces as yours', () => {
    const plain = tetrisGrid('u-2', 1, 2_300, 0)
    const mine = tetrisGrid('u-2', 1, 2_300, 2)
    const mineCells = mine.flat().filter((cell) => cell === 'mine').length
    expect(plain.flat().filter((cell) => cell === 'mine')).toHaveLength(0)
    expect(mineCells).toBeGreaterThan(0)
  })
})
