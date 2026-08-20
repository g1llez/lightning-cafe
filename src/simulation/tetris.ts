import { seededRandom } from './chain'

export const TETRIS_COLS = 8
export const TETRIS_ROWS = 8
/** Spawn this many rows above the well; gravity keeps the path clear of landed tiles. */
export const TETRIS_SPAWN_Y = -2
/** First slice of each piece's time slot is the fall; the rest is a pause. */
export const TETRIS_DROP_SHARE = 0.5

/** Classic tetromino palette (hex for inline styles). */
export const TETRIS_PALETTE = {
  cyan: '#22d3ee',
  yellow: '#facc15',
  purple: '#c084fc',
  orange: '#fb923c',
  blue: '#60a5fa',
  green: '#4ade80',
  red: '#f87171',
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

type ShapeName = 'O' | 'I_H' | 'I_V' | 'T_U' | 'T_D' | 'L' | 'J' | 'S' | 'Z'

type Shape = { color: Exclude<TetrisColor, 'mine'>; cells: [number, number][] }

/** Add a scenario: ordered drops `{ shape, x }`. landY is computed by gravity. */
type Step = { shape: ShapeName; x: number }

const SHAPES: Record<ShapeName, Shape> = {
  O: {
    color: 'yellow',
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
  },
  I_H: {
    color: 'cyan',
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ],
  },
  I_V: {
    color: 'cyan',
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [0, 3],
    ],
  },
  T_U: {
    color: 'purple',
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
    ],
  },
  T_D: {
    color: 'purple',
    cells: [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  L: {
    color: 'orange',
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
    ],
  },
  J: {
    color: 'blue',
    cells: [
      [1, 0],
      [1, 1],
      [1, 2],
      [0, 2],
    ],
  },
  S: {
    color: 'green',
    cells: [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
  },
  Z: {
    color: 'red',
    cells: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  },
}

/**
 * Scenarios = drop scripts. Easy to edit: append `{ shape, x }` steps.
 * Gravity picks landY so a piece never falls through another.
 */
const SCENARIOS: Step[][] = [
  // zipper — O bands + I rows
  [
    { shape: 'O', x: 0 },
    { shape: 'O', x: 2 },
    { shape: 'O', x: 4 },
    { shape: 'O', x: 6 },
    { shape: 'I_H', x: 0 },
    { shape: 'I_H', x: 4 },
    { shape: 'I_H', x: 0 },
    { shape: 'I_H', x: 4 },
    { shape: 'O', x: 0 },
    { shape: 'O', x: 2 },
    { shape: 'O', x: 4 },
    { shape: 'O', x: 6 },
    { shape: 'I_H', x: 0 },
    { shape: 'I_H', x: 4 },
    { shape: 'I_H', x: 0 },
    { shape: 'I_H', x: 4 },
  ],
  // reverse zipper — I first, then O
  [
    { shape: 'I_H', x: 0 },
    { shape: 'I_H', x: 4 },
    { shape: 'I_H', x: 0 },
    { shape: 'I_H', x: 4 },
    { shape: 'O', x: 0 },
    { shape: 'O', x: 2 },
    { shape: 'O', x: 4 },
    { shape: 'O', x: 6 },
    { shape: 'I_H', x: 0 },
    { shape: 'I_H', x: 4 },
    { shape: 'I_H', x: 0 },
    { shape: 'I_H', x: 4 },
    { shape: 'O', x: 0 },
    { shape: 'O', x: 2 },
    { shape: 'O', x: 4 },
    { shape: 'O', x: 6 },
  ],
  // boots — O pad, L/J feet, plug holes, cap with I
  [
    { shape: 'O', x: 0 },
    { shape: 'O', x: 2 },
    { shape: 'O', x: 4 },
    { shape: 'O', x: 6 },
    { shape: 'O', x: 0 },
    { shape: 'O', x: 2 },
    { shape: 'O', x: 4 },
    { shape: 'O', x: 6 },
    { shape: 'L', x: 0 },
    { shape: 'J', x: 2 },
    { shape: 'L', x: 4 },
    { shape: 'J', x: 6 },
    { shape: 'O', x: 1 },
    { shape: 'O', x: 5 },
    { shape: 'I_H', x: 0 },
    { shape: 'I_H', x: 4 },
  ],
  // boots from the floor up
  [
    { shape: 'L', x: 0 },
    { shape: 'J', x: 2 },
    { shape: 'L', x: 4 },
    { shape: 'J', x: 6 },
    { shape: 'O', x: 1 },
    { shape: 'O', x: 5 },
    { shape: 'I_H', x: 0 },
    { shape: 'I_H', x: 4 },
    { shape: 'O', x: 0 },
    { shape: 'O', x: 2 },
    { shape: 'O', x: 4 },
    { shape: 'O', x: 6 },
    { shape: 'O', x: 0 },
    { shape: 'O', x: 2 },
    { shape: 'O', x: 4 },
    { shape: 'O', x: 6 },
  ],
]

function emptyOcc(): boolean[][] {
  return Array.from({ length: TETRIS_ROWS }, () => Array.from({ length: TETRIS_COLS }, () => false))
}

function emptyGrid(): TetrisCell[][] {
  return Array.from({ length: TETRIS_ROWS }, () => Array.from({ length: TETRIS_COLS }, () => null))
}

function fits(occ: boolean[][], cells: [number, number][], x: number, y: number): boolean {
  return cells.every(([dx, dy]) => {
    const px = x + dx
    const py = y + dy
    if (px < 0 || px >= TETRIS_COLS || py >= TETRIS_ROWS) {
      return false
    }
    if (py < 0) {
      return true
    }
    return !occ[py]?.[px]
  })
}

function onBoard(cells: [number, number][], y: number): boolean {
  return cells.every(([, dy]) => y + dy >= 0)
}

/** Drop onto the current stack. Null if the piece cannot rest fully inside the well. */
export function tetrisLandY(occ: boolean[][], cells: [number, number][], x: number): number | null {
  let y = TETRIS_SPAWN_Y - 2
  if (!fits(occ, cells, x, y)) {
    return null
  }
  while (fits(occ, cells, x, y + 1)) {
    y += 1
  }
  if (!onBoard(cells, y) || !fits(occ, cells, x, y)) {
    return null
  }
  return y
}

function cover(occ: boolean[][], cells: [number, number][], x: number, y: number) {
  for (const [dx, dy] of cells) {
    const row = occ[y + dy]
    if (row) {
      row[x + dx] = true
    }
  }
}

function buildScenario(steps: Step[]): TetrisPiece[] | null {
  const occ = emptyOcc()
  const plan: Omit<TetrisPiece, 'kind'>[] = []
  for (const step of steps) {
    const shape = SHAPES[step.shape]
    const landY = tetrisLandY(occ, shape.cells, step.x)
    if (landY === null) {
      return null
    }
    cover(occ, shape.cells, step.x, landY)
    plan.push({ cells: shape.cells, x: step.x, landY, color: shape.color })
  }
  if (!occ.every((row) => row.every(Boolean))) {
    return null
  }
  return plan.map((item) => ({ ...item, kind: 'npc' as const }))
}

const BUILT = SCENARIOS.map(buildScenario).filter((plan): plan is TetrisPiece[] => plan !== null)

function stamp(
  grid: TetrisCell[][],
  item: { cells: [number, number][]; x: number; y: number; kind: TetrisKind; color: Exclude<TetrisColor, 'mine'> },
) {
  for (const [dx, dy] of item.cells) {
    const row = grid[Math.round(item.y) + dy]
    const x = item.x + dx
    if (row && x >= 0 && x < TETRIS_COLS) {
      row[x] = { color: item.color, kind: item.kind }
    }
  }
}

/** True if every intermediate drop pose sits only on empty cells (no ghosting). */
export function tetrisPathClear(plan: TetrisPiece[], index: number): boolean {
  const occ = emptyOcc()
  for (const item of plan.slice(0, index)) {
    cover(occ, item.cells, item.x, item.landY)
  }
  const current = plan[index]
  if (!current) {
    return false
  }
  for (let y = TETRIS_SPAWN_Y; y <= current.landY; y += 1) {
    if (!fits(occ, current.cells, current.x, y)) {
      return false
    }
  }
  return true
}

export function tetrisPlan(seed: string, txCount: number, minePieces = 0): TetrisPiece[] {
  if (BUILT.length === 0) {
    throw new Error('No tetris scenarios available')
  }
  const random = seededRandom(`${seed}|${txCount}|scene`)
  const base = BUILT[Math.floor(random() * BUILT.length)]!
  const mineFrom = Math.max(0, base.length - Math.max(0, minePieces))
  return base.map((item, index) => ({
    ...item,
    kind: index >= mineFrom ? 'mine' : 'npc',
  }))
}

export function tetrisSnapshot(plan: TetrisPiece[], progress: number): {
  landed: TetrisCell[][]
  falling: TetrisFalling | null
} {
  const t = Math.min(1, Math.max(0, progress))
  const grid = emptyGrid()
  if (plan.length === 0 || t >= 1) {
    for (const item of plan) {
      stamp(grid, { ...item, y: item.landY })
    }
    return { landed: grid, falling: null }
  }

  const pos = t * plan.length
  const index = Math.min(plan.length - 1, Math.floor(pos))
  const frac = pos - Math.floor(pos)
  const locked = frac >= TETRIS_DROP_SHARE ? index + 1 : index
  for (const item of plan.slice(0, locked)) {
    stamp(grid, { ...item, y: item.landY })
  }

  if (frac >= TETRIS_DROP_SHARE) {
    return { landed: grid, falling: null }
  }

  const current = plan[index]
  if (!current) {
    return { landed: grid, falling: null }
  }

  const dropT = frac / TETRIS_DROP_SHARE
  const travel = current.landY - TETRIS_SPAWN_Y

  return {
    landed: grid,
    falling: {
      cells: current.cells,
      x: current.x,
      y: TETRIS_SPAWN_Y + dropT * travel,
      kind: current.kind,
      color: current.color,
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
  return BUILT.length > 0 && BUILT.every((plan) => plan.length === 16)
}

export function tetrisScenarioCount(): number {
  return BUILT.length
}
