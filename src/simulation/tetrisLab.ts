import {
  TETRIS_COLS,
  TETRIS_PALETTE,
  TETRIS_ROWS,
  type TetrisColor,
  type TetrisPiece,
} from './tetris'

/** Extra rows above the café 8×8 so you can aim; export / anim stay 8×8. */
export const LAB_PREVIEW_ROWS = 2
export const LAB_ROWS = TETRIS_ROWS + LAB_PREVIEW_ROWS
export const LAB_COLS = TETRIS_COLS

export type LabColor = Exclude<TetrisColor, 'mine'>

/** landY is in café coords (0..7), same as tetris.ts replay. */
export type LabLocked = {
  cells: [number, number][]
  x: number
  landY: number
  color: LabColor
}

export type LabActive = {
  cells: [number, number][]
  x: number
  y: number
  color: LabColor
}

export type LabState = {
  occupied: (LabColor | null)[][]
  active: LabActive | null
  locked: LabLocked[]
  bag: LabColor[]
  status: 'play' | 'full' | 'stuck'
}

const BASE_SHAPES: { color: LabColor; cells: [number, number][] }[] = [
  {
    color: 'yellow',
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
  },
  {
    color: 'cyan',
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ],
  },
  {
    color: 'purple',
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [1, 1],
    ],
  },
  {
    color: 'orange',
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
      [1, 2],
    ],
  },
  {
    color: 'blue',
    cells: [
      [1, 0],
      [1, 1],
      [1, 2],
      [0, 2],
    ],
  },
  {
    color: 'green',
    cells: [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
  },
  {
    color: 'red',
    cells: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  },
]

function emptyBoard(): (LabColor | null)[][] {
  return Array.from({ length: LAB_ROWS }, () => Array.from({ length: LAB_COLS }, () => null))
}

function normalize(cells: [number, number][]): [number, number][] {
  const minX = Math.min(...cells.map(([x]) => x))
  const minY = Math.min(...cells.map(([, y]) => y))
  return cells.map(([x, y]) => [x - minX, y - minY] as [number, number])
}

function rotateCw(cells: [number, number][]): [number, number][] {
  return normalize(cells.map(([x, y]) => [y, -x] as [number, number]))
}

function rotateCcw(cells: [number, number][]): [number, number][] {
  return normalize(cells.map(([x, y]) => [-y, x] as [number, number]))
}

function fits(board: (LabColor | null)[][], cells: [number, number][], x: number, y: number): boolean {
  return cells.every(([dx, dy]) => {
    const px = x + dx
    const py = y + dy
    if (px < 0 || px >= LAB_COLS || py >= LAB_ROWS) {
      return false
    }
    if (py < 0) {
      return true
    }
    return board[py]?.[px] === null
  })
}

function refillBag(bag: LabColor[]): LabColor[] {
  const next = [...bag]
  if (next.length > 0) {
    return next
  }
  const fresh = BASE_SHAPES.map((shape) => shape.color)
  for (let index = fresh.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1))
    const a = fresh[index]!
    fresh[index] = fresh[swap]!
    fresh[swap] = a
  }
  return fresh
}

function shapeForColor(color: LabColor): [number, number][] {
  return BASE_SHAPES.find((shape) => shape.color === color)?.cells ?? BASE_SHAPES[0]!.cells
}

function spawn(board: (LabColor | null)[][], bag: LabColor[]): { active: LabActive | null; bag: LabColor[]; stuck: boolean } {
  const filled = refillBag(bag)
  const color = filled[0]!
  const rest = filled.slice(1)
  const cells = shapeForColor(color)
  const width = Math.max(...cells.map(([x]) => x)) + 1
  const x = Math.max(0, Math.floor((LAB_COLS - width) / 2))
  const y = 0
  if (!fits(board, cells, x, y)) {
    return { active: null, bag: rest, stuck: true }
  }
  return { active: { cells, x, y, color }, bag: rest, stuck: false }
}

export function createLabState(): LabState {
  const occupied = emptyBoard()
  const spawned = spawn(occupied, [])
  return {
    occupied,
    active: spawned.active,
    locked: [],
    bag: spawned.bag,
    status: spawned.stuck ? 'stuck' : 'play',
  }
}

function hardDropY(board: (LabColor | null)[][], cells: [number, number][], x: number, y: number): number {
  let land = y
  while (fits(board, cells, x, land + 1)) {
    land += 1
  }
  return land
}

function cafeIsFull(occupied: (LabColor | null)[][]): boolean {
  for (let y = LAB_PREVIEW_ROWS; y < LAB_ROWS; y += 1) {
    const row = occupied[y]
    if (!row || row.some((cell) => cell === null)) {
      return false
    }
  }
  return true
}

function lockAt(state: LabState, landYLab: number): LabState {
  const active = state.active
  if (!active) {
    return state
  }
  const occupied = state.occupied.map((row) => [...row])
  for (const [dx, dy] of active.cells) {
    const row = occupied[landYLab + dy]
    if (row) {
      row[active.x + dx] = active.color
    }
  }
  const locked: LabLocked[] = [
    ...state.locked,
    {
      cells: active.cells,
      x: active.x,
      landY: landYLab - LAB_PREVIEW_ROWS,
      color: active.color,
    },
  ]
  if (cafeIsFull(occupied)) {
    return { ...state, occupied, active: null, locked, status: 'full' }
  }
  const spawned = spawn(occupied, state.bag)
  return {
    occupied,
    active: spawned.active,
    locked,
    bag: spawned.bag,
    status: spawned.stuck ? 'stuck' : 'play',
  }
}

export type LabAction = 'left' | 'right' | 'rotCw' | 'rotCcw' | 'noop' | 'drop'

/** After a successful action (incl. S), piece falls 1; if it can't, it locks. Space = hard-drop + lock. */
export function labApply(state: LabState, action: LabAction): LabState {
  if (state.status !== 'play' || !state.active) {
    return state
  }
  if (action === 'drop') {
    const landYLab = hardDropY(state.occupied, state.active.cells, state.active.x, state.active.y)
    return lockAt(state, landYLab)
  }

  const active = state.active
  let cells = active.cells
  let x = active.x
  let y = active.y

  if (action === 'left') {
    x -= 1
  } else if (action === 'right') {
    x += 1
  } else if (action === 'rotCw') {
    cells = rotateCw(cells)
  } else if (action === 'rotCcw') {
    cells = rotateCcw(cells)
  }
  // noop: pose unchanged

  if (action !== 'noop' && !fits(state.occupied, cells, x, y)) {
    return state
  }

  // Gravity: one row down after the action
  if (fits(state.occupied, cells, x, y + 1)) {
    return { ...state, active: { ...active, cells, x, y: y + 1 } }
  }
  return lockAt({ ...state, active: { ...active, cells, x, y } }, y)
}

/** Filled cells inside the café 8×8 only. */
export function labFilledCount(state: LabState): number {
  let sum = 0
  for (let y = LAB_PREVIEW_ROWS; y < LAB_ROWS; y += 1) {
    const row = state.occupied[y]
    if (!row) {
      continue
    }
    sum += row.filter((cell) => cell !== null).length
  }
  return sum
}

/** Clipboard / paste format for SCENARIOS in tetris.ts */
export function formatLabScenario(locked: LabLocked[]): string {
  const body = locked
    .map((piece) => {
      const cells = JSON.stringify(piece.cells)
      return `    { cells: ${cells} as [number, number][], x: ${piece.x}, landY: ${piece.landY}, color: '${piece.color}' },`
    })
    .join('\n')
  return `[\n${body}\n  ]`
}

export function labLockedToPieces(locked: LabLocked[]): Omit<TetrisPiece, 'kind'>[] {
  return locked.map((piece) => ({
    cells: piece.cells,
    x: piece.x,
    landY: piece.landY,
    color: piece.color,
  }))
}

export function labColorHex(color: LabColor): string {
  return TETRIS_PALETTE[color]
}

export function labIsPreviewRow(y: number): boolean {
  return y < LAB_PREVIEW_ROWS
}
