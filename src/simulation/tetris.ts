import { seededRandom } from './chain'

export const TETRIS_COLS = 8
export const TETRIS_ROWS = 8
/** Default spawn above the well when the drop path is clear. */
export const TETRIS_SPAWN_Y = -2
/** First slice of each piece's time slot is the fall; the rest is a pause. */
export const TETRIS_DROP_SHARE = 0.5

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

type Raw = Omit<TetrisPiece, 'kind'>

/**
 * Lab recordings (tetris-lab). Blocks need not be perfect / full.
 * landY may be negative when a piece locked in the lab preview rows.
 */
const RECORDED: Raw[][] = [
  [
    { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], x: 0, landY: 7, color: 'cyan' },
    { cells: [[2, 1], [1, 1], [0, 1], [1, 0]], x: 0, landY: 5, color: 'purple' },
    { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], x: 3, landY: 5, color: 'yellow' },
    { cells: [[1, 0], [1, 1], [1, 2], [0, 2]], x: 4, landY: 5, color: 'blue' },
    { cells: [[0, 0], [0, 1], [0, 2], [1, 2]], x: 6, landY: 5, color: 'orange' },
    { cells: [[0, 2], [0, 1], [1, 1], [1, 0]], x: 2, landY: 3, color: 'red' },
    { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], x: 0, landY: 3, color: 'green' },
    { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], x: 5, landY: 3, color: 'green' },
    { cells: [[0, 2], [0, 1], [1, 1], [1, 0]], x: 4, landY: 2, color: 'red' },
    { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], x: 1, landY: 2, color: 'cyan' },
    { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], x: 6, landY: 1, color: 'yellow' },
    { cells: [[2, 1], [1, 1], [0, 1], [1, 0]], x: 3, landY: 0, color: 'purple' },
  ],
  [
    { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], x: 5, landY: 6, color: 'red' },
    { cells: [[2, 1], [1, 1], [0, 1], [0, 0]], x: 3, landY: 6, color: 'blue' },
    { cells: [[0, 1], [0, 0], [1, 2], [1, 1]], x: 3, landY: 4, color: 'green' },
    { cells: [[0, 3], [0, 2], [0, 1], [0, 0]], x: 0, landY: 4, color: 'cyan' },
    { cells: [[0, 0], [0, 1], [0, 2], [1, 2]], x: 1, landY: 5, color: 'orange' },
    { cells: [[1, 0], [1, 1], [1, 2], [0, 1]], x: 4, landY: 3, color: 'purple' },
    { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], x: 6, landY: 4, color: 'yellow' },
    { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], x: 3, landY: 2, color: 'green' },
    { cells: [[1, 0], [1, 1], [1, 2], [0, 1]], x: 0, landY: 2, color: 'purple' },
    { cells: [[0, 2], [0, 1], [1, 1], [1, 0]], x: 2, landY: 1, color: 'red' },
    { cells: [[0, 0], [0, 1], [0, 2], [1, 2]], x: 5, landY: -1, color: 'orange' },
    { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], x: 3, landY: -2, color: 'cyan' },
  ],
  [
    { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], x: 5, landY: 6, color: 'red' },
    { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], x: 2, landY: 7, color: 'cyan' },
    { cells: [[1, 0], [1, 1], [1, 2], [0, 1]], x: 5, landY: 3, color: 'purple' },
    { cells: [[1, 0], [1, 1], [1, 2], [0, 2]], x: 0, landY: 5, color: 'blue' },
    { cells: [[0, 0], [0, 1], [0, 2], [1, 2]], x: 2, landY: 4, color: 'orange' },
    { cells: [[0, 1], [0, 0], [1, 2], [1, 1]], x: 3, landY: 4, color: 'green' },
    { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], x: 0, landY: 3, color: 'yellow' },
    { cells: [[0, 3], [0, 2], [0, 1], [0, 0]], x: 4, landY: 1, color: 'cyan' },
    { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], x: 2, landY: 2, color: 'yellow' },
    { cells: [[0, 2], [0, 1], [1, 1], [1, 0]], x: 0, landY: 0, color: 'red' },
    { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], x: 2, landY: 0, color: 'green' },
    { cells: [[0, 0], [1, 0], [2, 0], [1, 1]], x: 3, landY: -2, color: 'purple' },
  ],
  [
    { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], x: 5, landY: 6, color: 'red' },
    { cells: [[0, 1], [0, 0], [1, 1], [1, 0]], x: 0, landY: 6, color: 'yellow' },
    { cells: [[2, 1], [1, 1], [0, 1], [0, 0]], x: 3, landY: 6, color: 'blue' },
    { cells: [[0, 3], [0, 2], [0, 1], [0, 0]], x: 2, landY: 4, color: 'cyan' },
    { cells: [[0, 0], [1, 0], [2, 0], [1, 1]], x: 3, landY: 5, color: 'purple' },
    { cells: [[0, 1], [0, 0], [1, 2], [1, 1]], x: 6, landY: 4, color: 'green' },
    { cells: [[0, 0], [0, 1], [0, 2], [1, 2]], x: 0, landY: 3, color: 'orange' },
    { cells: [[0, 2], [0, 1], [1, 1], [1, 0]], x: 1, landY: 2, color: 'red' },
    { cells: [[0, 1], [1, 1], [2, 1], [2, 0]], x: 3, landY: 3, color: 'orange' },
    { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], x: 3, landY: 2, color: 'yellow' },
    { cells: [[1, 0], [1, 1], [1, 2], [0, 2]], x: 6, landY: 1, color: 'blue' },
    { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], x: 3, landY: 1, color: 'cyan' },
    { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], x: 0, landY: 1, color: 'green' },
    { cells: [[0, 0], [1, 0], [2, 0], [1, 1]], x: 1, landY: -1, color: 'purple' },
    { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], x: 3, landY: -2, color: 'cyan' },
  ],
  [
    { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], x: 0, landY: 7, color: 'cyan' },
    { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], x: 3, landY: 6, color: 'red' },
    { cells: [[2, 1], [1, 1], [0, 1], [0, 0]], x: 0, landY: 5, color: 'blue' },
    { cells: [[0, 0], [0, 1], [0, 2], [1, 2]], x: 6, landY: 5, color: 'orange' },
    { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], x: 1, landY: 4, color: 'yellow' },
    { cells: [[1, 0], [1, 1], [1, 2], [0, 1]], x: 4, landY: 4, color: 'purple' },
    { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], x: 3, landY: 3, color: 'green' },
    { cells: [[1, 0], [1, 1], [1, 2], [0, 2]], x: 6, landY: 2, color: 'blue' },
    { cells: [[2, 1], [1, 1], [0, 1], [1, 0]], x: 0, landY: 2, color: 'purple' },
    { cells: [[2, 0], [1, 0], [0, 0], [0, 1]], x: 3, landY: 2, color: 'orange' },
    { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], x: 4, landY: 1, color: 'cyan' },
    { cells: [[0, 1], [0, 0], [1, 2], [1, 1]], x: 1, landY: 0, color: 'green' },
    { cells: [[0, 2], [0, 1], [1, 1], [1, 0]], x: 2, landY: -2, color: 'red' },
  ],
  [
    { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], x: 0, landY: 7, color: 'cyan' },
    { cells: [[2, 1], [1, 1], [0, 1], [1, 0]], x: 4, landY: 6, color: 'purple' },
    { cells: [[0, 1], [0, 0], [1, 2], [1, 1]], x: 6, landY: 5, color: 'green' },
    { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], x: 3, landY: 5, color: 'yellow' },
    { cells: [[0, 1], [1, 1], [2, 1], [2, 0]], x: 0, landY: 5, color: 'orange' },
    { cells: [[0, 2], [0, 1], [1, 1], [1, 0]], x: 5, landY: 3, color: 'red' },
    { cells: [[1, 0], [1, 1], [1, 2], [0, 2]], x: 0, landY: 3, color: 'blue' },
    { cells: [[2, 1], [1, 1], [0, 1], [1, 0]], x: 2, landY: 3, color: 'purple' },
    { cells: [[1, 0], [1, 1], [1, 2], [0, 2]], x: 4, landY: 1, color: 'blue' },
    { cells: [[0, 0], [1, 0], [2, 0], [3, 0]], x: 0, landY: 2, color: 'cyan' },
    { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], x: 0, landY: 0, color: 'yellow' },
    { cells: [[0, 0], [1, 0], [1, 1], [2, 1]], x: 2, landY: 0, color: 'red' },
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

function cover(occ: boolean[][], cells: [number, number][], x: number, y: number) {
  for (const [dx, dy] of cells) {
    const px = x + dx
    const py = y + dy
    const row = occ[py]
    if (row && px >= 0 && px < TETRIS_COLS) {
      row[px] = true
    }
  }
}

function paintsInWell(piece: Raw): boolean {
  return piece.cells.some(([dx, dy]) => {
    const px = piece.x + dx
    const py = piece.landY + dy
    return px >= 0 && px < TETRIS_COLS && py >= 0 && py < TETRIS_ROWS
  })
}

const BUILT: TetrisPiece[][] = RECORDED.map((raw) =>
  raw.filter(paintsInWell).map((item) => ({ ...item, kind: 'npc' as const })),
).filter((plan) => plan.length > 0)

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

function occupiedBefore(plan: TetrisPiece[], index: number): boolean[][] {
  const occ = emptyOcc()
  for (const item of plan.slice(0, index)) {
    cover(occ, item.cells, item.x, item.landY)
  }
  return occ
}

/** True if every intermediate drop pose from spawn sits only on empty cells. */
export function tetrisPathClear(plan: TetrisPiece[], index: number): boolean {
  const piece = plan[index]
  if (!piece) {
    return false
  }
  return tetrisSpawnY(plan, index) <= TETRIS_SPAWN_Y
}

/**
 * Highest Y from which the final pose can fall straight down onto landY
 * without overlapping already-landed tiles. No cosmetic hop through the stack:
 * if the piece was packed sideways in the lab, the fall starts just above the seat.
 */
export function tetrisSpawnY(plan: TetrisPiece[], index: number): number {
  const piece = plan[index]
  if (!piece) {
    return TETRIS_SPAWN_Y
  }
  const occ = occupiedBefore(plan, index)
  let spawn = piece.landY
  for (let y = piece.landY - 1; y >= TETRIS_SPAWN_Y; y -= 1) {
    let clear = true
    for (let t = y; t <= piece.landY; t += 1) {
      if (!fits(occ, piece.cells, piece.x, t)) {
        clear = false
        break
      }
    }
    if (!clear) {
      break
    }
    spawn = y
  }
  return spawn
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

  const spawnY = tetrisSpawnY(plan, index)
  const dropT = frac / TETRIS_DROP_SHARE
  const travel = current.landY - spawnY

  return {
    landed: grid,
    falling: {
      cells: current.cells,
      x: current.x,
      y: spawnY + dropT * travel,
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

/** Lab recordings are allowed to be imperfect / not full. */
export function tetrisWellsAreFull(): boolean {
  return false
}

export function tetrisScenarioCount(): number {
  return BUILT.length
}

/** Expected painted cells for a finished plan (in-bounds only). */
export function tetrisPlanPaintedCount(plan: TetrisPiece[]): number {
  const grid = emptyGrid()
  for (const item of plan) {
    stamp(grid, { ...item, y: item.landY })
  }
  return tetrisFilledCount(grid)
}
