import { seededRandom } from './chain'

export const TETRIS_COLS = 8
export const TETRIS_ROWS = 8

export type TetrisScenario = 'squares' | 'rows' | 'columns' | 'split'
export type TetrisCell = 'empty' | 'npc' | 'mine'
export type TetrisKind = 'npc' | 'mine'

export type TetrisPiece = {
  cells: [number, number][]
  x: number
  landY: number
  kind: TetrisKind
}

export type TetrisFalling = {
  cells: [number, number][]
  x: number
  y: number
  kind: TetrisKind
}

const O: [number, number][] = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
]
const I_ROW: [number, number][] = [
  [0, 0],
  [1, 0],
  [2, 0],
  [3, 0],
]
const I_COL: [number, number][] = [
  [0, 0],
  [0, 1],
  [0, 2],
  [0, 3],
]

function emptyGrid(): TetrisCell[][] {
  return Array.from({ length: TETRIS_ROWS }, () => Array.from({ length: TETRIS_COLS }, () => 'empty' as const))
}

function piece(cells: [number, number][], x: number, landY: number): Omit<TetrisPiece, 'kind'> {
  return { cells, x, landY }
}

/** Four ways to tile the 8×8 well completely. No sliding, no rotating — only fall. */
export function pickTetrisScenario(seed: string, txCount: number): TetrisScenario {
  const names: TetrisScenario[] = ['squares', 'rows', 'columns', 'split']
  const spin = txCount >= 2_800 ? 2 : txCount <= 1_800 ? 0 : 1
  const pick = Math.floor(seededRandom(`${seed}|scene`)() * 4 + spin) % 4
  return names[pick] ?? 'squares'
}

function tiling(scenario: TetrisScenario): Omit<TetrisPiece, 'kind'>[] {
  if (scenario === 'squares') {
    const placed: Omit<TetrisPiece, 'kind'>[] = []
    for (let y = TETRIS_ROWS - 2; y >= 0; y -= 2) {
      for (let x = 0; x < TETRIS_COLS; x += 2) {
        placed.push(piece(O, x, y))
      }
    }
    return placed
  }

  if (scenario === 'rows') {
    const placed: Omit<TetrisPiece, 'kind'>[] = []
    for (let y = TETRIS_ROWS - 1; y >= 0; y -= 1) {
      placed.push(piece(I_ROW, 0, y), piece(I_ROW, 4, y))
    }
    return placed
  }

  if (scenario === 'columns') {
    const placed: Omit<TetrisPiece, 'kind'>[] = []
    for (let x = 0; x < TETRIS_COLS; x += 1) {
      placed.push(piece(I_COL, x, TETRIS_ROWS - 4))
    }
    for (let x = 0; x < TETRIS_COLS; x += 1) {
      placed.push(piece(I_COL, x, 0))
    }
    return placed
  }

  const placed: Omit<TetrisPiece, 'kind'>[] = []
  for (let y = TETRIS_ROWS - 1; y >= 4; y -= 1) {
    placed.push(piece(I_ROW, 0, y), piece(I_ROW, 4, y))
  }
  for (let x = 0; x < TETRIS_COLS; x += 1) {
    placed.push(piece(I_COL, x, 0))
  }
  return placed
}

function stamp(grid: TetrisCell[][], item: { cells: [number, number][]; x: number; y: number; kind: TetrisKind }) {
  for (const [dx, dy] of item.cells) {
    const row = grid[Math.round(item.y) + dy]
    const x = item.x + dx
    if (row && x >= 0 && x < TETRIS_COLS) {
      row[x] = item.kind
    }
  }
}

/** Drop order for one block: already in the right column, gravity only. Fills every cell. */
export function tetrisPlan(seed: string, txCount: number, minePieces = 0): TetrisPiece[] {
  const plan = tiling(pickTetrisScenario(seed, txCount))
  const mineFrom = Math.max(0, plan.length - Math.max(0, minePieces))
  return plan.map((item, index) => ({
    ...item,
    kind: index >= mineFrom ? 'mine' : 'npc',
  }))
}

/**
 * `progress` 0..1 over the block interval. Landed pieces stay put; one piece
 * falls from the top to its locked row (no lateral move, no rotate).
 */
export function tetrisSnapshot(plan: TetrisPiece[], progress: number): {
  landed: TetrisCell[][]
  falling: TetrisFalling | null
} {
  const t = Math.min(1, Math.max(0, progress))
  const n = t * plan.length
  const landedCount = t >= 1 ? plan.length : Math.min(plan.length, Math.floor(n))
  const grid = emptyGrid()
  for (const item of plan.slice(0, landedCount)) {
    stamp(grid, { ...item, y: item.landY })
  }

  if (landedCount >= plan.length) {
    return { landed: grid, falling: null }
  }

  const current = plan[landedCount]
  if (!current) {
    return { landed: grid, falling: null }
  }

  const frac = n - landedCount
  return {
    landed: grid,
    falling: {
      cells: current.cells,
      x: current.x,
      y: frac * current.landY,
      kind: current.kind,
    },
  }
}

export function tetrisFilledCount(grid: TetrisCell[][]): number {
  return grid.reduce((sum, row) => sum + row.filter((cell) => cell !== 'empty').length, 0)
}

export function tetrisGrid(seed: string, fill: number, txCount: number, minePieces = 0): TetrisCell[][] {
  const snap = tetrisSnapshot(tetrisPlan(seed, txCount, minePieces), fill)
  if (!snap.falling) {
    return snap.landed
  }
  const copy = snap.landed.map((row) => [...row])
  stamp(copy, snap.falling)
  return copy
}
