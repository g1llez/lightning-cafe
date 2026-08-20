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

type Raw = Omit<TetrisPiece, 'kind'>

type Shape = { cells: [number, number][]; color: Exclude<TetrisColor, 'mine'> }

const O: Shape = {
  color: 'yellow',
  cells: [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
}
const I_H: Shape = {
  color: 'cyan',
  cells: [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ],
}
const I_V: Shape = {
  color: 'cyan',
  cells: [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
  ],
}
const T_U: Shape = {
  color: 'purple',
  cells: [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
  ],
}
const T_D: Shape = {
  color: 'purple',
  cells: [
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
}
const T_L: Shape = {
  color: 'purple',
  cells: [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, 2],
  ],
}
const T_R: Shape = {
  color: 'purple',
  cells: [
    [0, 0],
    [0, 1],
    [1, 1],
    [0, 2],
  ],
}
const L: Shape = {
  color: 'orange',
  cells: [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 2],
  ],
}
const J: Shape = {
  color: 'blue',
  cells: [
    [1, 0],
    [1, 1],
    [1, 2],
    [0, 2],
  ],
}
const S: Shape = {
  color: 'green',
  cells: [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ],
}
const Z: Shape = {
  color: 'red',
  cells: [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
}

const SHAPES: Shape[] = [O, I_H, I_V, T_U, T_D, T_L, T_R, L, J, S, Z]

function emptyOcc(): boolean[][] {
  return Array.from({ length: TETRIS_ROWS }, () => Array.from({ length: TETRIS_COLS }, () => false))
}

function emptyGrid(): TetrisCell[][] {
  return Array.from({ length: TETRIS_ROWS }, () => Array.from({ length: TETRIS_COLS }, () => null))
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    const a = next[index]
    const b = next[swap]
    if (a !== undefined && b !== undefined) {
      next[index] = b
      next[swap] = a
    }
  }
  return next
}

function firstEmpty(occ: boolean[][]): [number, number] | null {
  for (let y = 0; y < TETRIS_ROWS; y += 1) {
    for (let x = 0; x < TETRIS_COLS; x += 1) {
      if (!occ[y]?.[x]) {
        return [x, y]
      }
    }
  }
  return null
}

function fits(occ: boolean[][], cells: [number, number][], originX: number, originY: number): boolean {
  return cells.every(([dx, dy]) => {
    const x = originX + dx
    const y = originY + dy
    return x >= 0 && x < TETRIS_COLS && y >= 0 && y < TETRIS_ROWS && !occ[y]?.[x]
  })
}

function cover(occ: boolean[][], cells: [number, number][], originX: number, originY: number, value: boolean) {
  for (const [dx, dy] of cells) {
    const row = occ[originY + dy]
    if (row) {
      row[originX + dx] = value
    }
  }
}

function toRaw(shape: Shape, originX: number, originY: number): Raw {
  return {
    x: originX,
    landY: originY,
    color: shape.color,
    cells: shape.cells.map(([x, y]) => [x, y] as [number, number]),
  }
}

/** Guaranteed full wells — used when the search fails. Never all-O alone. */
function wellRows(): Raw[] {
  const out: Raw[] = []
  for (let y = 0; y < TETRIS_ROWS; y += 1) {
    out.push(toRaw(I_H, 0, y))
    out.push(toRaw(I_H, 4, y))
  }
  return out
}

function wellCols(): Raw[] {
  const out: Raw[] = []
  for (let x = 0; x < TETRIS_COLS; x += 1) {
    out.push(toRaw(I_V, x, 0))
    out.push(toRaw(I_V, x, 4))
  }
  return out
}

function wellZipper(): Raw[] {
  const out: Raw[] = []
  for (let band = 0; band < 4; band += 1) {
    const y = band * 2
    if (band % 2 === 0) {
      for (let x = 0; x < TETRIS_COLS; x += 2) {
        out.push(toRaw(O, x, y))
      }
    } else {
      out.push(toRaw(I_H, 0, y))
      out.push(toRaw(I_H, 4, y))
      out.push(toRaw(I_H, 0, y + 1))
      out.push(toRaw(I_H, 4, y + 1))
    }
  }
  return out
}

function wellCorners(): Raw[] {
  const out: Raw[] = []
  out.push(toRaw(L, 0, 5), toRaw(J, 2, 5), toRaw(L, 4, 5), toRaw(J, 6, 5))
  out.push(toRaw(S, 0, 4), toRaw(Z, 2, 4), toRaw(S, 4, 4), toRaw(Z, 6, 4))
  out.push(toRaw(T_U, 0, 2), toRaw(T_U, 3, 2), toRaw(O, 6, 2))
  out.push(toRaw(I_H, 0, 3), toRaw(I_H, 4, 3))
  out.push(toRaw(O, 0, 0), toRaw(O, 2, 0), toRaw(I_H, 4, 0), toRaw(I_H, 4, 1))
  return out
}

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
      row[x] = { color: item.color, kind: 'npc' }
    }
  }
  return grid.every((row) => row.every((cell) => cell !== null))
}

function searchTile(random: () => number): Raw[] | null {
  const occ = emptyOcc()
  const placed: Raw[] = []
  const bag = shuffle(SHAPES, random)
  let steps = 0

  function solve(): boolean {
    steps += 1
    if (steps > 20_000) {
      return false
    }
    const hole = firstEmpty(occ)
    if (!hole) {
      return true
    }
    const [emptyX, emptyY] = hole
    for (const shape of bag) {
      for (const [px, py] of shape.cells) {
        const originX = emptyX - px
        const originY = emptyY - py
        if (!fits(occ, shape.cells, originX, originY)) {
          continue
        }
        cover(occ, shape.cells, originX, originY, true)
        placed.push(toRaw(shape, originX, originY))
        if (solve()) {
          return true
        }
        placed.pop()
        cover(occ, shape.cells, originX, originY, false)
      }
    }
    return false
  }

  return solve() ? placed : null
}

const SAFE_WELLS = [wellZipper, wellRows, wellCols, wellCorners].map((build) => build()).filter(coversExactly)

function pickWell(seed: string, txCount: number): Raw[] {
  const random = seededRandom(`${seed}|${txCount}|tiles`)
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const found = searchTile(() => random())
    if (found && coversExactly(found)) {
      const keys = new Set(found.map((item) => item.cells.map(([x, y]) => `${x},${y}`).sort().join(';')))
      if (keys.size >= 3) {
        return found
      }
    }
  }
  return SAFE_WELLS[Math.floor(random() * SAFE_WELLS.length)] ?? wellZipper()
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
