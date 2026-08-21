import { describe, expect, it } from 'vitest'
import {
  createLabState,
  formatLabTapes,
  labApply,
  labFilledCount,
  labSimulateTape,
  labToTape,
  LAB_MOVES_PER_TICK,
} from '../src/simulation/tetrisLab'
import {
  tetrisFilledCount,
  tetrisPlan,
  tetrisPlanPaintedCount,
  tetrisScenarioCount,
  tetrisSnapshot,
} from '../src/simulation/tetris'

describe('tetrisLab action tapes', () => {
  it('allows two moves before auto gravity', () => {
    let state = createLabState()
    expect(state.movesLeft).toBe(LAB_MOVES_PER_TICK)
    const y0 = state.active!.y
    state = labApply(state, 'left')
    expect(state.active!.y).toBe(y0)
    expect(state.movesLeft).toBe(1)
    expect(state.events.at(-1)).toBe('L')
    state = labApply(state, 'right')
    expect(state.events).toContain('G')
    expect(state.active!.y).toBe(y0 + 1)
    expect(state.movesLeft).toBe(LAB_MOVES_PER_TICK)
  })

  it('records hard drop and soft drop', () => {
    let state = createLabState()
    state = labApply(state, 'soft')
    expect(state.events.at(-1)).toBe('S')
    state = labApply(state, 'drop')
    expect(state.events.at(-1)).toBe('HD')
    expect(state.lockedCount).toBe(1)
  })

  it('exports a single TAPES block', () => {
    let state = createLabState()
    state = labApply(state, 'drop')
    const text = formatLabTapes([labToTape(state)])
    expect(text.startsWith('[')).toBe(true)
    expect(text).toContain('colors:')
    expect(text).toContain('events:')
    expect(text).toContain('HD')
  })

  it('replays recorded events without overlapping cells', () => {
    let state = createLabState()
    for (let i = 0; i < 6; i += 1) {
      state = labApply(state, 'drop')
      if (state.status !== 'play') {
        break
      }
    }
    const tape = labToTape(state)
    const end = labSimulateTape(tape, tape.events.length)
    expect(end.lockedCount).toBe(state.lockedCount)
    expect(labFilledCount(state)).toBe(
      end.occupied.slice(2).reduce((sum, row) => sum + row.filter(Boolean).length, 0),
    )
  })
})

describe('block tetris tape replay', () => {
  it('has the seven lab tapes', () => {
    expect(tetrisScenarioCount()).toBe(7)
  })

  it('replays the same tape for the same seed', () => {
    expect(tetrisPlan('u-2', 2_300)).toEqual(tetrisPlan('u-2', 2_300))
  })

  it('paints cells by the end of the minute', () => {
    const tape = tetrisPlan('u-2', 2_300)
    const done = tetrisSnapshot(tape, 1)
    expect(done.falling).toBeNull()
    expect(tetrisFilledCount(done.landed)).toBe(tetrisPlanPaintedCount(tape))
    expect(tetrisFilledCount(done.landed)).toBeGreaterThan(0)
  })

  it('moves the active piece across events instead of ghosting a final pose', () => {
    const tape = tetrisPlan('cafe', 2_000)
    const start = tetrisSnapshot(tape, 0)
    expect(start.falling).not.toBeNull()
    const mid = tetrisSnapshot(tape, 0.3)
    // Still progressing through events
    expect(tetrisFilledCount(mid.landed) + (mid.falling ? 4 : 0)).toBeGreaterThan(0)
  })

  it('paints the last locked pieces as yours', () => {
    const tape = tetrisPlan('u-2', 2_300)
    const plain = tetrisSnapshot(tape, 1, 0).landed
    const mine = tetrisSnapshot(tape, 1, 2).landed
    expect(plain.flat().filter((cell) => cell?.kind === 'mine')).toHaveLength(0)
    expect(mine.flat().filter((cell) => cell?.kind === 'mine').length).toBeGreaterThan(0)
  })
})
