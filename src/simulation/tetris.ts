import { seededRandom } from './chain'

export const TETRIS_COLS = 8
export const TETRIS_ROWS = 8
/** Fall from this many rows above the well so every piece travels. */
export const TETRIS_SPAWN_ROWS = 4
/** First slice of each piece's time slot is the fall; the rest is a pause. */
export const TETRIS_DROP_SHARE = 0.35

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
  landY: number
  kind: TetrisKind
  /** 0 at spawn, 1 as it locks. */
  dropT: number
}

const SHAPES: [number, number][][] = [
  [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [1, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 2],
  ],
  [
    [1, 0],
    [1, 1],
    [1, 2],
    [0, 2],
  ],
  [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
]

const SQUARES: Omit<TetrisPiece, 'kind'>[] = (() => {
  const placed: Omit<TetrisPiece, 'kind'>[] = []
  for (let y = TETRIS_ROWS - 2; y >= 0; y -= 2) {
    for (let x = 0; x < TETRIS_COLS; x += 2) {
      placed.push({
        cells: [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ],
        x,
        landY: y,
      })
    }
  }
  return placed
})()

function emptyOcc(): boolean[][] {
  return Array.from({ length: TETRIS_ROWS }, () => Array.from({ length: TETRIS_COLS }, () => false))
}

function emptyGrid(): TetrisCell[][] {
  return Array.from({ length: TETRIS_ROWS }, () => Array.from({ length: TETRIS_COLS }, () => 'empty' as const))
}

function rotate(cells: [number, number][]): [number, number][] {
  const next = cells.map(([x, y]) => [y, -x] as [number, number])
  const minX = Math.min(...next.map(([x]) => x))
  const minY = Math.min(...next.map(([, y]) => y))
  return next.map(([x, y]) => [x - minX, y - minY] as [number, number])
}

function rotations(cells: [number, number][]): [number, number][][] {
  const seen = new Set<string>()
  const out: [number, number][][] = []
  let current = cells
  for (let step = 0; step < 4; step += 1) {
    const key = current
      .map(([x, y]) => `${x},${y}`)
      .sort()
      .join(';')
    if (!seen.has(key)) {
      seen.add(key)
      out.push(current)
    }
    current = rotate(current)
  }
  return out
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

function tileWell(random: () => number): [number, number][][] {
  const occ = emptyOcc()
  const placed: [number, number][][] = []
  const bag = shuffle(SHAPES, random).flatMap(rotations)
  let steps = 0

  function solve(): boolean {
    steps += 1
    if (steps > 8_000) {
      return false
    }
    const hole = firstEmpty(occ)
    if (!hole) {
      return true
    }
    const [emptyX, emptyY] = hole
    for (const cells of bag) {
      for (const [px, py] of cells) {
        const originX = emptyX - px
        const originY = emptyY - py
        if (!fits(occ, cells, originX, originY)) {
          continue
        }
        cover(occ, cells, originX, originY, true)
        placed.push(cells.map(([dx, dy]) => [originX + dx, originY + dy] as [number, number]))
        if (solve()) {
          return true
        }
        placed.pop()
        cover(occ, cells, originX, originY, false)
      }
    }
    return false
  }

  return solve() ? placed : []
}

function toPiece(cells: [number, number][]): Omit<TetrisPiece, 'kind'> {
  const minX = Math.min(...cells.map(([x]) => x))
  const minY = Math.min(...cells.map(([, y]) => y))
  return {
    x: minX,
    landY: minY,
    cells: cells.map(([x, y]) => [x - minX, y - minY] as [number, number]),
  }
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

/** Drop order: already in the right column, gravity only. Fills every cell. */
export function tetrisPlan(seed: string, txCount: number, minePieces = 0): TetrisPiece[] {
  const tiled = tileWell(seededRandom(`${seed}|${txCount}|tiles`))
  const raw = tiled.length === 16 ? tiled : SQUARES.map((item) => item.cells.map(([dx, dy]) => [item.x + dx, item.landY + dy] as [number, number]))
  raw.sort((left, right) => {
    const deep = Math.max(...right.map(([, y]) => y)) - Math.max(...left.map(([, y]) => y))
    if (deep !== 0) {
      return deep
    }
    return Math.min(...left.map(([x]) => x)) - Math.min(...right.map(([x]) => x))
  })
  const plan = raw.map(toPiece)
  const mineFrom = Math.max(0, plan.length - Math.max(0, minePieces))
  return plan.map((item, index) => ({
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
      landY: current.landY,
      kind: current.kind,
      dropT,
    },
  }
}

export function tetrisFilledCount(grid: TetrisCell[][]): number {
  return grid.reduce((sum, row) => sum + row.filter((cell) => cell !== 'empty').length, 0)
}

export function tetrisShapeKey(cells: [number, number][]): string {
  return [...cells.map(([x, y]) => `${x},${y}`)].sort().join(';')
}
