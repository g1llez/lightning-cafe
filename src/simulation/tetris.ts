import { seededRandom } from './chain'

export const TETRIS_COLS = 8
export const TETRIS_ROWS = 8
/** Fall from this many rows above the well so every piece travels. */
export const TETRIS_SPAWN_ROWS = 4
/** First slice of each piece's time slot is the fall; the rest is a pause. */
export const TETRIS_DROP_SHARE = 0.28

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

export type TetrisPaint = {
  color: Exclude<TetrisColor, 'mine'>
  kind: TetrisKind
}

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

type Raw = Omit<TetrisPiece, "kind">

function emptyGrid(): TetrisCell[][] {
  return Array.from({ length: TETRIS_ROWS }, () => Array.from({ length: TETRIS_COLS }, () => null))
}

/** Pre-packed mixed wells — never all-O or all-I. */
const MIXED_WELLS: Raw[][] = [
  [
    { color: "red", x: 0, landY: 0, cells: [[0,0],[1,0],[1,1],[2,1]] },
    { color: "red", x: 2, landY: 0, cells: [[0,0],[1,0],[1,1],[2,1]] },
    { color: "purple", x: 4, landY: 0, cells: [[0,0],[1,0],[2,0],[1,1]] },
    { color: "purple", x: 6, landY: 0, cells: [[1,0],[0,1],[1,1],[1,2]] },
    { color: "purple", x: 0, landY: 1, cells: [[0,0],[0,1],[1,1],[0,2]] },
    { color: "green", x: 1, landY: 2, cells: [[1,0],[2,0],[0,1],[1,1]] },
    { color: "green", x: 3, landY: 2, cells: [[1,0],[2,0],[0,1],[1,1]] },
    { color: "purple", x: 6, landY: 2, cells: [[0,0],[0,1],[1,1],[0,2]] },
    { color: "orange", x: 5, landY: 3, cells: [[0,0],[0,1],[0,2],[1,2]] },
    { color: "red", x: 0, landY: 4, cells: [[0,0],[1,0],[1,1],[2,1]] },
    { color: "purple", x: 2, landY: 4, cells: [[0,0],[1,0],[2,0],[1,1]] },
    { color: "blue", x: 6, landY: 4, cells: [[1,0],[1,1],[1,2],[0,2]] },
    { color: "purple", x: 0, landY: 5, cells: [[0,0],[0,1],[1,1],[0,2]] },
    { color: "purple", x: 3, landY: 5, cells: [[1,0],[0,1],[1,1],[2,1]] },
    { color: "purple", x: 1, landY: 6, cells: [[1,0],[0,1],[1,1],[2,1]] },
    { color: "cyan", x: 4, landY: 7, cells: [[0,0],[1,0],[2,0],[3,0]] },
  ],
  [
    { color: "red", x: 0, landY: 0, cells: [[0,0],[1,0],[1,1],[2,1]] },
    { color: "red", x: 2, landY: 0, cells: [[0,0],[1,0],[1,1],[2,1]] },
    { color: "purple", x: 4, landY: 0, cells: [[0,0],[1,0],[2,0],[1,1]] },
    { color: "purple", x: 6, landY: 0, cells: [[1,0],[0,1],[1,1],[1,2]] },
    { color: "purple", x: 0, landY: 1, cells: [[0,0],[0,1],[1,1],[0,2]] },
    { color: "purple", x: 1, landY: 2, cells: [[1,0],[0,1],[1,1],[1,2]] },
    { color: "red", x: 3, landY: 2, cells: [[0,0],[1,0],[1,1],[2,1]] },
    { color: "red", x: 5, landY: 2, cells: [[0,0],[1,0],[1,1],[2,1]] },
    { color: "blue", x: 2, landY: 3, cells: [[1,0],[1,1],[1,2],[0,2]] },
    { color: "cyan", x: 0, landY: 4, cells: [[0,0],[0,1],[0,2],[0,3]] },
    { color: "orange", x: 1, landY: 4, cells: [[0,0],[0,1],[0,2],[1,2]] },
    { color: "blue", x: 3, landY: 4, cells: [[1,0],[1,1],[1,2],[0,2]] },
    { color: "purple", x: 5, landY: 4, cells: [[0,0],[1,0],[2,0],[1,1]] },
    { color: "purple", x: 5, landY: 5, cells: [[0,0],[0,1],[1,1],[0,2]] },
    { color: "blue", x: 6, landY: 5, cells: [[1,0],[1,1],[1,2],[0,2]] },
    { color: "cyan", x: 1, landY: 7, cells: [[0,0],[1,0],[2,0],[3,0]] },
  ],
  [
    { color: "purple", x: 0, landY: 0, cells: [[0,0],[1,0],[2,0],[1,1]] },
    { color: "purple", x: 3, landY: 0, cells: [[0,0],[1,0],[2,0],[1,1]] },
    { color: "green", x: 5, landY: 0, cells: [[1,0],[2,0],[0,1],[1,1]] },
    { color: "orange", x: 0, landY: 1, cells: [[0,0],[0,1],[0,2],[1,2]] },
    { color: "green", x: 1, landY: 1, cells: [[1,0],[2,0],[0,1],[1,1]] },
    { color: "purple", x: 6, landY: 1, cells: [[1,0],[0,1],[1,1],[1,2]] },
    { color: "purple", x: 3, landY: 2, cells: [[0,0],[1,0],[2,0],[1,1]] },
    { color: "green", x: 1, landY: 3, cells: [[1,0],[2,0],[0,1],[1,1]] },
    { color: "green", x: 4, landY: 3, cells: [[1,0],[2,0],[0,1],[1,1]] },
    { color: "purple", x: 0, landY: 4, cells: [[0,0],[0,1],[1,1],[0,2]] },
    { color: "purple", x: 2, landY: 4, cells: [[1,0],[0,1],[1,1],[1,2]] },
    { color: "cyan", x: 6, landY: 4, cells: [[0,0],[0,1],[0,2],[0,3]] },
    { color: "cyan", x: 7, landY: 4, cells: [[0,0],[0,1],[0,2],[0,3]] },
    { color: "yellow", x: 4, landY: 5, cells: [[0,0],[1,0],[0,1],[1,1]] },
    { color: "green", x: 0, landY: 6, cells: [[1,0],[2,0],[0,1],[1,1]] },
    { color: "cyan", x: 2, landY: 7, cells: [[0,0],[1,0],[2,0],[3,0]] },
  ],
  [
    { color: "purple", x: 0, landY: 0, cells: [[0,0],[0,1],[1,1],[0,2]] },
    { color: "red", x: 1, landY: 0, cells: [[0,0],[1,0],[1,1],[2,1]] },
    { color: "red", x: 3, landY: 0, cells: [[0,0],[1,0],[1,1],[2,1]] },
    { color: "purple", x: 5, landY: 0, cells: [[0,0],[1,0],[2,0],[1,1]] },
    { color: "blue", x: 6, landY: 1, cells: [[1,0],[1,1],[1,2],[0,2]] },
    { color: "purple", x: 1, landY: 2, cells: [[0,0],[0,1],[1,1],[0,2]] },
    { color: "red", x: 2, landY: 2, cells: [[0,0],[1,0],[1,1],[2,1]] },
    { color: "purple", x: 4, landY: 2, cells: [[0,0],[1,0],[2,0],[1,1]] },
    { color: "orange", x: 0, landY: 3, cells: [[0,0],[0,1],[0,2],[1,2]] },
    { color: "purple", x: 2, landY: 4, cells: [[0,0],[0,1],[1,1],[0,2]] },
    { color: "red", x: 3, landY: 4, cells: [[0,0],[1,0],[1,1],[2,1]] },
    { color: "purple", x: 5, landY: 4, cells: [[0,0],[1,0],[2,0],[1,1]] },
    { color: "blue", x: 6, landY: 5, cells: [[1,0],[1,1],[1,2],[0,2]] },
    { color: "yellow", x: 0, landY: 6, cells: [[0,0],[1,0],[0,1],[1,1]] },
    { color: "purple", x: 2, landY: 6, cells: [[1,0],[0,1],[1,1],[2,1]] },
    { color: "purple", x: 4, landY: 6, cells: [[0,0],[1,0],[2,0],[1,1]] },
  ],
]

function coversExactly(raw: Raw[]): boolean {
  if (raw.length !== 16) {
    return false
  }
  const grid = emptyGrid()
  for (const item of raw) {
    for (const [dx, dy] of item.cells) {
      const x = item.x + dx
      const y = item.landY + dy
      if (x < 0 || x >= TETRIS_COLS || y < 0 || y >= TETRIS_ROWS) {
        return false
      }
      const row = grid[y]
      if (!row || row[x] !== null) {
        return false
      }
      row[x] = { color: item.color, kind: "npc" }
    }
  }
  return grid.every((row) => row.every((cell) => cell !== null))
}

function isVaried(raw: Raw[]): boolean {
  const colors = new Set(raw.map((item) => item.color))
  if (colors.size < 4) {
    return false
  }
  const cyan = raw.filter((item) => item.color === "cyan").length
  const yellow = raw.filter((item) => item.color === "yellow").length
  return cyan <= 4 && yellow <= 4
}

const SAFE_WELLS = MIXED_WELLS.filter(coversExactly).filter(isVaried)

/** Instant pick among mixed wells — no search on the UI thread. */
function pickWell(seed: string, txCount: number): Raw[] {
  const random = seededRandom(`${seed}|${txCount}|tiles`)
  if (SAFE_WELLS.length === 0) {
    throw new Error('No mixed tetris wells available')
  }
  return SAFE_WELLS[Math.floor(random() * SAFE_WELLS.length)]!
}

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

/** Drop order: already in the right column, gravity only. Fills every cell. */
export function tetrisPlan(seed: string, txCount: number, minePieces = 0): TetrisPiece[] {
  const raw = [...pickWell(seed, txCount)].sort((left, right) => {
    const deep =
      Math.max(...right.cells.map(([, y]) => right.landY + y)) - Math.max(...left.cells.map(([, y]) => left.landY + y))
    if (deep !== 0) {
      return deep
    }
    return left.x - right.x
  })
  const mineFrom = Math.max(0, raw.length - Math.max(0, minePieces))
  return raw.map((item, index) => ({
    ...item,
    kind: index >= mineFrom ? 'mine' : 'npc',
  }))
}

/**
 * `progress` 0..1 over the block interval. A piece drops quickly, then waits.
 * No lateral move, no rotate.
 */
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
  const travel = current.landY + TETRIS_SPAWN_ROWS

  return {
    landed: grid,
    falling: {
      cells: current.cells,
      x: current.x,
      y: -TETRIS_SPAWN_ROWS + dropT * travel,
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

export function tetrisCellFill(cell: TetrisCell | Pick<TetrisFalling, 'color' | 'kind'>, falling = false): string {
  if (!cell || typeof cell !== 'object') {
    return 'transparent'
  }
  if ('kind' in cell && cell.kind === 'mine') {
    return TETRIS_PALETTE.mine
  }
  const hex = TETRIS_PALETTE[cell.color]
  return falling ? hex : hex
}

export function tetrisWellsAreFull(): boolean {
  return SAFE_WELLS.length > 0 && SAFE_WELLS.every(coversExactly)
}
