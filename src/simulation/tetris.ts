import { seededRandom } from './chain'
import {
  LAB_PREVIEW_ROWS,
  labSimulateTape,
  type LabColor,
  type LabTape,
} from './tetrisLab'

export const TETRIS_COLS = 8
export const TETRIS_ROWS = 8
export const TETRIS_SPAWN_Y = -2
/** Fraction of each event slot spent “in motion” (rest = hold pose). */
export const TETRIS_DROP_SHARE = 0.7

/** Classic tetromino palette — saturated Game Boy / Guideline vibes. */
export const TETRIS_PALETTE = {
  cyan: '#00f0f0',
  yellow: '#f0f000',
  purple: '#a000f0',
  orange: '#f0a000',
  blue: '#0000f0',
  green: '#00f000',
  red: '#f00000',
  mine: '#f7931a',
} as const

export type TetrisColor = keyof typeof TETRIS_PALETTE
export type TetrisKind = 'npc' | 'mine'
export type TetrisPaint = { color: Exclude<TetrisColor, 'mine'>; kind: TetrisKind }
export type TetrisCell = TetrisPaint | null

export type TetrisPiece = {
  cells: [number, number][]
  x: number
  landY: number
  kind: TetrisKind
  color: Exclude<TetrisColor, 'mine'>
}

export type TetrisFalling = {
  cells: [number, number][]
  x: number
  y: number
  kind: TetrisKind
  color: Exclude<TetrisColor, 'mine'>
}

export type TetrisTape = LabTape

/**
 * Paste lab exports here (single block from “Tout copier”).
 */
export const TAPES: TetrisTape[] = [
  { colors: ["orange","purple","green","cyan","yellow","blue","red","purple","blue","green","cyan","yellow","red","orange"] as const, events: ["L","L","G","L","HD","CW","CW","G","HD","L","HD","CW","R","G","R","R","G","R","R","G","HD","R","R","G","R","L","G","HD","CW","CW","G","CW","CW","G","R","R","G","HD","CW","L","G","HD","CW","CW","G","CW","CW","G","L","CW","G","L","HD","CW","CW","G","R","HD","L","L","G","HD","L","R","G","R","CW","G","HD","R","HD","R","R","G","R","HD","R","CW","G"] as const },
  { colors: ["green","red","purple","blue","yellow","cyan","orange","blue","green","red","orange","cyan","yellow","purple","red","green"] as const, events: ["L","L","G","HD","L","CW","G","L","HD","CW","CW","G","R","S","S","S","S","S","S","S","L","HD","R","R","G","HD","R","R","G","L","HD","CW","R","G","R","R","G","R","R","G","HD","CW","CW","G","CW","HD","CW","CW","G","L","HD","CW","R","G","R","R","G","HD","CW","L","G","L","HD","R","R","G","R","HD","CW","R","G","R","HD","L","HD","L","L","G","CW","CW","G","HD"] as const },
  { colors: ["purple","orange","blue","yellow","red","cyan","green","purple","green","orange","cyan","yellow","blue"] as const, events: ["CW","CW","G","HD","L","L","G","L","HD","CW","L","G","L","CW","G","CW","CW","G","HD","R","R","G","R","HD","R","L","G","L","R","G","R","HD","CW","L","G","HD","CW","R","G","R","HD","R","R","G","CW","R","G","R","L","G","CW","CW","G","CW","HD","CW","HD","HD","L","L","G","CW","HD","L","L","G","HD"] as const },
  { colors: ["yellow","blue","green","red","cyan","purple","orange","purple","red","green","yellow","orange","cyan","blue"] as const, events: ["L","L","G","L","HD","CW","CW","G","CW","L","G","HD","CW","HD","R","R","G","HD","R","CW","G","R","R","G","R","R","G","HD","CW","CW","G","CW","R","G","R","R","G","HD","L","L","G","L","HD","R","HD","CW","L","G","HD","L","L","G","HD","HD","R","R","G","R","L","G","CW","HD","L","L","G","HD"] as const },
  { colors: ["purple","red","orange","yellow","blue","green","cyan","red","orange","blue","cyan","green","yellow","purple","orange"] as const, events: ["CW","CW","G","L","L","G","HD","HD","R","R","G","CW","CW","G","CW","CW","G","CW","HD","R","R","G","R","L","G","HD","CW","L","G","HD","CW","R","G","R","R","G","R","HD","HD","CW","L","G","L","HD","CW","CW","G","CW","L","G","L","L","G","HD","CW","CW","G","CW","HD","R","R","G","HD","R","R","G","L","L","G","L","HD","L","L","G","L","HD","R","R","G","R","CW","G"] as const },
  { colors: ["blue","red","green","purple","orange","yellow","cyan","yellow","green","red","blue","cyan","purple","orange","cyan"] as const, events: ["HD","L","CW","G","R","HD","CW","R","G","R","R","G","R","HD","R","R","G","HD","L","L","G","L","HD","L","L","G","HD","R","R","G","CW","R","G","R","R","G","HD","R","R","G","HD","CW","HD","L","L","G","CW","HD","CW","CW","G","R","HD","L","L","G","HD","R","R","G","R","HD","L","CW","G","HD"] as const },
  { colors: ["red","purple","green","cyan","orange","blue","yellow","purple","green","cyan","yellow","blue","red","orange","cyan","yellow","green"] as const, events: ["R","R","G","R","HD","CW","CW","G","S","S","S","S","S","S","S","R","HD","L","L","G","R","HD","CW","L","G","L","HD","CW","CW","G","CW","L","G","L","HD","CW","CW","G","CW","CW","G","CW","R","G","R","HD","R","R","G","R","HD","R","HD","L","HD","L","CW","G","L","HD","R","R","G","R","HD","R","HD","CW","L","G","HD","HD","R","R","G","HD","L","L","G","HD"] as const },
]

function emptyCafe(): TetrisCell[][] {
  return Array.from({ length: TETRIS_ROWS }, () => Array.from({ length: TETRIS_COLS }, () => null))
}

function toCafeGrid(
  occupied: (LabColor | null)[][],
  locks: { cells: [number, number][]; x: number; y: number; color: LabColor }[],
  minePieces: number,
): TetrisCell[][] {
  const grid = emptyCafe()
  for (let y = 0; y < TETRIS_ROWS; y += 1) {
    for (let x = 0; x < TETRIS_COLS; x += 1) {
      const color = occupied[y + LAB_PREVIEW_ROWS]?.[x] ?? null
      if (color) {
        grid[y]![x] = { color, kind: 'npc' }
      }
    }
  }
  if (minePieces <= 0) {
    return grid
  }
  const mineFrom = Math.max(0, locks.length - minePieces)
  for (let i = mineFrom; i < locks.length; i += 1) {
    const lock = locks[i]!
    for (const [dx, dy] of lock.cells) {
      const cafeY = lock.y + dy - LAB_PREVIEW_ROWS
      const cafeX = lock.x + dx
      if (cafeY >= 0 && cafeY < TETRIS_ROWS && cafeX >= 0 && cafeX < TETRIS_COLS && grid[cafeY]?.[cafeX]) {
        grid[cafeY]![cafeX] = { color: lock.color, kind: 'mine' }
      }
    }
  }
  return grid
}

export function tetrisPlan(seed: string, txCount: number, _minePieces = 0): TetrisTape {
  if (TAPES.length === 0) {
    throw new Error('No tetris tapes available')
  }
  const random = seededRandom(`${seed}|${txCount}|scene`)
  return TAPES[Math.floor(random() * TAPES.length)]!
}

export function tetrisSnapshot(
  tape: TetrisTape,
  progress: number,
  minePieces = 0,
): {
  landed: TetrisCell[][]
  falling: TetrisFalling | null
} {
  const t = Math.min(1, Math.max(0, progress))
  const total = Math.max(1, tape.events.length)
  const eventCount = t >= 1 ? total : Math.floor(t * total)
  const state = labSimulateTape(tape, eventCount)
  const landed = toCafeGrid(state.occupied, state.locks, minePieces)

  if (t >= 1 || !state.active) {
    return { landed, falling: null }
  }

  return {
    landed,
    falling: {
      cells: state.active.cells,
      x: state.active.x,
      y: state.active.y - LAB_PREVIEW_ROWS,
      kind: 'npc',
      color: state.active.color,
    },
  }
}

export function tetrisFilledCount(grid: TetrisCell[][]): number {
  return grid.reduce((sum, row) => sum + row.filter((cell) => cell !== null).length, 0)
}

export function tetrisShapeKey(cells: [number, number][]): string {
  return [...cells.map(([x, y]) => `${x},${y}`)].sort().join(';')
}

export function tetrisCellFill(cell: TetrisCell | Pick<TetrisFalling, 'color' | 'kind'>): string {
  if (!cell || typeof cell !== 'object') {
    return 'transparent'
  }
  if ('kind' in cell && cell.kind === 'mine') {
    return TETRIS_PALETTE.mine
  }
  return TETRIS_PALETTE[cell.color]
}

export function tetrisWellsAreFull(): boolean {
  return false
}

export function tetrisScenarioCount(): number {
  return TAPES.length
}

export function tetrisPlanPaintedCount(tape: TetrisTape): number {
  return tetrisFilledCount(tetrisSnapshot(tape, 1).landed)
}

/** Progress (0..1) after N locks — for static low/medium mosaics (~5–6 pieces in). */
export function tetrisProgressAfterLocks(tape: TetrisTape, locks: number): number {
  if (tape.events.length === 0 || locks <= 0) {
    return 0
  }
  for (let count = 1; count <= tape.events.length; count += 1) {
    const state = labSimulateTape(tape, count)
    if (state.lockedCount >= locks) {
      return count / tape.events.length
    }
  }
  return 1
}

/** @deprecated Pose-path helpers — action tapes replay steps instead. */
export function tetrisPathClear(_plan: unknown, _index: number): boolean {
  return true
}

export function tetrisSpawnY(_plan: unknown, _index: number): number {
  return TETRIS_SPAWN_Y
}
