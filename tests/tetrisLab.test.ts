import { describe, expect, it } from 'vitest'
import {
  createLabState,
  formatLabScenario,
  labApply,
  labFilledCount,
  labLockedToPieces,
  LAB_PREVIEW_ROWS,
  LAB_ROWS,
} from '../src/simulation/tetrisLab'
import { TETRIS_COLS, TETRIS_ROWS, tetrisPathClear } from '../src/simulation/tetris'

describe('tetrisLab', () => {
  it('uses 2 preview rows above the café 8×8', () => {
    expect(LAB_ROWS).toBe(TETRIS_ROWS + LAB_PREVIEW_ROWS)
    expect(LAB_PREVIEW_ROWS).toBe(2)
    const state = createLabState()
    expect(state.occupied).toHaveLength(LAB_ROWS)
    expect(state.active!.y).toBe(0)
  })

  it('starts with an active piece and empty café', () => {
    const state = createLabState()
    expect(state.status).toBe('play')
    expect(state.active).not.toBeNull()
    expect(labFilledCount(state)).toBe(0)
  })

  it('each action drops the piece by 1; S only drops', () => {
    let state = createLabState()
    const y0 = state.active!.y
    state = labApply(state, 'noop')
    expect(state.active!.y).toBe(y0 + 1)
    state = labApply(state, 'rotCw')
    expect(state.active!.y).toBe(y0 + 2)
    const x0 = state.active!.x
    state = labApply(state, 'left')
    expect(state.active!.x).toBe(x0 - 1)
    expect(state.active!.y).toBe(y0 + 3)
  })

  it('locks when it cannot fall after an action', () => {
    let state = createLabState()
    let guard = 0
    while (state.status === 'play' && state.active && guard < 40) {
      state = labApply(state, 'noop')
      guard += 1
    }
    expect(state.locked.length).toBeGreaterThanOrEqual(1)
    expect(state.locked[0]!.landY).toBeGreaterThanOrEqual(0)
    expect(state.locked[0]!.landY).toBeLessThan(TETRIS_ROWS)
  })

  it('blocks moves through occupied cells', () => {
    let state = createLabState()
    state = labApply(state, 'drop')
    expect(state.locked.length).toBe(1)
    expect(labFilledCount(state)).toBe(4)

    expect(state.active).not.toBeNull()
    for (let i = 0; i < TETRIS_COLS; i += 1) {
      state = labApply(state, 'left')
    }
    state = labApply(state, 'drop')
    expect(state.locked.length).toBe(2)

    const cells = new Set<string>()
    for (const piece of state.locked) {
      for (const [dx, dy] of piece.cells) {
        const key = `${piece.x + dx},${piece.landY + dy}`
        expect(cells.has(key)).toBe(false)
        cells.add(key)
      }
    }
  })

  it('formats a full café scenario with path-clear drops', () => {
    let state = createLabState()
    let guard = 0
    while (state.status === 'play' && guard < 120) {
      if (guard % 3 === 0) {
        state = labApply(state, 'left')
      } else if (guard % 3 === 1) {
        state = labApply(state, 'right')
      } else {
        state = labApply(state, 'rotCw')
      }
      if (state.status === 'play') {
        state = labApply(state, 'drop')
      }
      guard += 1
    }
    if (state.status === 'full') {
      expect(labFilledCount(state)).toBe(TETRIS_COLS * TETRIS_ROWS)
      const text = formatLabScenario(state.locked)
      expect(text).toContain('landY:')
      const pieces = labLockedToPieces(state.locked).map((piece) => ({ ...piece, kind: 'npc' as const }))
      for (let i = 0; i < pieces.length; i += 1) {
        expect(tetrisPathClear(pieces, i)).toBe(true)
      }
    } else {
      expect(['stuck', 'play']).toContain(state.status)
    }
  })
})
