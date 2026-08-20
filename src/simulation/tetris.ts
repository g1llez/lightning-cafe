import { seededRandom } from './chain'

export const TETRIS_COLS = 8
export const TETRIS_ROWS = 8

export type TetrisScenario = 'sparse' | 'classic' | 'packed'
export type TetrisCell = 'empty' | 'npc' | 'mine'

const SHAPES: [number, number][][] = [
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
  ],
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
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
  [
    [1, 0],
    [2, 0],
    [0, 1],
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
]

const PIECES_FOR: Record<TetrisScenario, number> = {
  sparse: 6,
  classic: 10,
  packed: 14,
}

function rotate(cells: [number, number][], turns: number): [number, number][] {
  let next = cells
  for (let step = 0; step < turns % 4; step += 1) {
    next = next.map(([x, y]) => [y, -x] as [number, number])
  }
  const minX = Math.min(...next.map(([x]) => x))
  const minY = Math.min(...next.map(([, y]) => y))
  return next.map(([x, y]) => [x - minX, y - minY] as [number, number])
}

function emptyGrid(): TetrisCell[][] {
  return Array.from({ length: TETRIS_ROWS }, () => Array.from({ length: TETRIS_COLS }, () => 'empty' as const))
}

function collides(grid: TetrisCell[][], cells: [number, number][], originX: number, originY: number): boolean {
  return cells.some(([dx, dy]) => {
    const x = originX + dx
    const y = originY + dy
    return x < 0 || x >= TETRIS_COLS || y < 0 || y >= TETRIS_ROWS || grid[y]?.[x] !== 'empty'
  })
}

function dropY(grid: TetrisCell[][], cells: [number, number][], originX: number): number | null {
  let y = 0
  if (collides(grid, cells, originX, y)) {
    return null
  }
  while (!collides(grid, cells, originX, y + 1)) {
    y += 1
  }
  return y
}

function stamp(grid: TetrisCell[][], cells: [number, number][], originX: number, originY: number, kind: 'npc' | 'mine') {
  for (const [dx, dy] of cells) {
    const row = grid[originY + dy]
    if (row) {
      row[originX + dx] = kind
    }
  }
}

/** Quiet mempool → sparse; busy → packed; otherwise a seeded classic/sparse/packed mix. */
export function pickTetrisScenario(seed: string, txCount: number): TetrisScenario {
  if (txCount >= 2_800) {
    return 'packed'
  }
  if (txCount <= 1_800) {
    return 'sparse'
  }
  const pick = Math.floor(seededRandom(`${seed}|scene`)() * 3)
  return (['sparse', 'classic', 'packed'] as const)[pick] ?? 'classic'
}

/**
 * Pack tetrominoes into the current block template. No line clears:
 * Bitcoin fills a block, it does not delete rows. `fill` 0..1 is how far
 * the minute has gone. `minePieces` paints the last landed pieces as yours.
 */
export function tetrisGrid(seed: string, fill: number, txCount: number, minePieces = 0): TetrisCell[][] {
  const scenario = pickTetrisScenario(seed, txCount)
  const random = seededRandom(`${seed}|${scenario}`)
  const grid = emptyGrid()
  const wanted = PIECES_FOR[scenario]
  const placements: { cells: [number, number][]; x: number; y: number }[] = []

  for (let index = 0; index < wanted * 2 && placements.length < wanted; index += 1) {
    const shape = SHAPES[Math.floor(random() * SHAPES.length)]
    if (!shape) {
      continue
    }
    const cells = rotate(shape, Math.floor(random() * 4))
    const width = Math.max(...cells.map(([x]) => x)) + 1
    const originX = Math.floor(random() * Math.max(1, TETRIS_COLS - width + 1))
    const originY = dropY(grid, cells, originX)
    if (originY == null) {
      continue
    }
    stamp(grid, cells, originX, originY, 'npc')
    placements.push({ cells, x: originX, y: originY })
  }

  const shown = Math.round(Math.min(1, Math.max(0, fill)) * placements.length)
  const visible = emptyGrid()
  const mineFrom = Math.max(0, shown - Math.max(0, minePieces))
  placements.slice(0, shown).forEach((piece, index) => {
    stamp(visible, piece.cells, piece.x, piece.y, index >= mineFrom ? 'mine' : 'npc')
  })
  return visible
}

export function tetrisFilledCount(grid: TetrisCell[][]): number {
  return grid.reduce((sum, row) => sum + row.filter((cell) => cell !== 'empty').length, 0)
}
