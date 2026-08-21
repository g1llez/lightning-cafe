/** Extra rows above the café 8×8 so you can aim; replay paints the bottom 8×8. */
export const LAB_PREVIEW_ROWS = 2
export const LAB_ROWS = 8 + LAB_PREVIEW_ROWS
export const LAB_COLS = 8
/** Two player moves, then one gravity step. */
export const LAB_MOVES_PER_TICK = 2

export type LabColor = 'cyan' | 'yellow' | 'purple' | 'orange' | 'blue' | 'green' | 'red'

/** Player / gravity events recorded for café replay. */
export type LabEvent = 'L' | 'R' | 'CW' | 'CCW' | 'S' | 'G' | 'HD'

export type LabTape = {
  colors: LabColor[]
  events: LabEvent[]
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
  bag: LabColor[]
  colors: LabColor[]
  events: LabEvent[]
  movesLeft: number
  lockedCount: number
  status: 'play' | 'full' | 'stuck'
}

const LAB_PALETTE: Record<LabColor, string> = {
  cyan: '#00f0f0',
  yellow: '#f0f000',
  purple: '#a000f0',
  orange: '#f0a000',
  blue: '#0000f0',
  green: '#00f000',
  red: '#f00000',
}

const BASE_SHAPES: { color: LabColor; cells: [number, number][] }[] = [
  { color: 'yellow', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { color: 'cyan', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { color: 'purple', cells: [[0, 0], [1, 0], [2, 0], [1, 1]] },
  { color: 'orange', cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },
  { color: 'blue', cells: [[1, 0], [1, 1], [1, 2], [0, 2]] },
  { color: 'green', cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  { color: 'red', cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
]

export function labShapeForColor(color: LabColor): [number, number][] {
  const found = BASE_SHAPES.find((shape) => shape.color === color)?.cells
  return (found ?? BASE_SHAPES[0]!.cells).map(([x, y]) => [x, y] as [number, number])
}

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

export function labFits(
  board: (LabColor | null)[][],
  cells: [number, number][],
  x: number,
  y: number,
): boolean {
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
  if (bag.length > 0) {
    return [...bag]
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

function spawnPiece(
  board: (LabColor | null)[][],
  bag: LabColor[],
): { active: LabActive | null; bag: LabColor[]; color: LabColor | null; stuck: boolean } {
  const filled = refillBag(bag)
  const color = filled[0]!
  const rest = filled.slice(1)
  const cells = labShapeForColor(color)
  const width = Math.max(...cells.map(([x]) => x)) + 1
  const x = Math.max(0, Math.floor((LAB_COLS - width) / 2))
  if (!labFits(board, cells, x, 0)) {
    return { active: null, bag: rest, color, stuck: true }
  }
  return { active: { cells, x, y: 0, color }, bag: rest, color, stuck: false }
}

export function createLabState(): LabState {
  const occupied = emptyBoard()
  const spawned = spawnPiece(occupied, [])
  return {
    occupied,
    active: spawned.active,
    bag: spawned.bag,
    colors: spawned.color ? [spawned.color] : [],
    events: [],
    movesLeft: LAB_MOVES_PER_TICK,
    lockedCount: 0,
    status: spawned.stuck ? 'stuck' : 'play',
  }
}

function hardDropY(board: (LabColor | null)[][], cells: [number, number][], x: number, y: number): number {
  let land = y
  while (labFits(board, cells, x, land + 1)) {
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

function lockActive(state: LabState): LabState {
  const active = state.active
  if (!active) {
    return state
  }
  const occupied = state.occupied.map((row) => [...row])
  for (const [dx, dy] of active.cells) {
    const row = occupied[active.y + dy]
    if (row) {
      row[active.x + dx] = active.color
    }
  }
  const lockedCount = state.lockedCount + 1
  if (cafeIsFull(occupied)) {
    return {
      ...state,
      occupied,
      active: null,
      lockedCount,
      movesLeft: 0,
      status: 'full',
    }
  }
  const spawned = spawnPiece(occupied, state.bag)
  return {
    ...state,
    occupied,
    active: spawned.active,
    bag: spawned.bag,
    colors: spawned.color ? [...state.colors, spawned.color] : state.colors,
    lockedCount,
    movesLeft: LAB_MOVES_PER_TICK,
    status: spawned.stuck ? 'stuck' : 'play',
  }
}

function applyGravity(state: LabState, recordAs: 'G' | 'S' | null): LabState {
  const active = state.active
  if (!active) {
    return state
  }
  const events = recordAs ? [...state.events, recordAs] : state.events
  if (labFits(state.occupied, active.cells, active.x, active.y + 1)) {
    return {
      ...state,
      events,
      active: { ...active, y: active.y + 1 },
      movesLeft: LAB_MOVES_PER_TICK,
    }
  }
  return lockActive({ ...state, events })
}

export type LabAction = 'left' | 'right' | 'rotCw' | 'rotCcw' | 'soft' | 'drop'

/**
 * 2 moves (A/D/W/X) then auto gravity. S = soft drop (G). Space = hard drop.
 * Every applied step is appended to `events` for café replay.
 */
export function labApply(state: LabState, action: LabAction): LabState {
  if (state.status !== 'play' || !state.active) {
    return state
  }

  if (action === 'drop') {
    const active = state.active
    const land = hardDropY(state.occupied, active.cells, active.x, active.y)
    return lockActive({
      ...state,
      events: [...state.events, 'HD'],
      active: { ...active, y: land },
    })
  }

  if (action === 'soft') {
    return applyGravity(state, 'S')
  }

  const active = state.active
  let cells = active.cells
  let x = active.x
  const y = active.y
  let code: LabEvent | null = null

  if (action === 'left') {
    x -= 1
    code = 'L'
  } else if (action === 'right') {
    x += 1
    code = 'R'
  } else if (action === 'rotCw') {
    cells = rotateCw(cells)
    code = 'CW'
  } else if (action === 'rotCcw') {
    cells = rotateCcw(cells)
    code = 'CCW'
  }

  if (!code || !labFits(state.occupied, cells, x, y)) {
    return state
  }

  let next: LabState = {
    ...state,
    events: [...state.events, code],
    active: { ...active, cells, x, y },
    movesLeft: state.movesLeft - 1,
  }

  if (next.movesLeft <= 0) {
    next = applyGravity(next, 'G')
  }
  return next
}

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

export function labToTape(state: LabState): LabTape {
  return { colors: [...state.colors], events: [...state.events] }
}

/** One pasteable block: array of tapes for tetris.ts TAPES. */
export function formatLabTapes(tapes: LabTape[]): string {
  const body = tapes
    .map((tape) => {
      const colors = JSON.stringify(tape.colors)
      const events = JSON.stringify(tape.events)
      return `  { colors: ${colors} as const, events: ${events} as const },`
    })
    .join('\n')
  return `[\n${body}\n]`
}

export function labColorHex(color: LabColor): string {
  return LAB_PALETTE[color]
}

export function labIsPreviewRow(y: number): boolean {
  return y < LAB_PREVIEW_ROWS
}

export type TapeReplay = {
  occupied: (LabColor | null)[][]
  active: LabActive | null
  lockedCount: number
  /** Lock footprints in order (lab coords) for mine tinting. */
  locks: { cells: [number, number][]; x: number; y: number; color: LabColor }[]
  done: boolean
}

type Sim = {
  occupied: (LabColor | null)[][]
  active: LabActive | null
  colorIndex: number
  lockedCount: number
  locks: TapeReplay['locks']
  done: boolean
}

function spawnIndexed(occupied: (LabColor | null)[][], tape: LabTape, colorIndex: number): Pick<Sim, 'active' | 'colorIndex' | 'done'> {
  const color = tape.colors[colorIndex]
  if (!color) {
    return { active: null, colorIndex, done: true }
  }
  const cells = labShapeForColor(color)
  const width = Math.max(...cells.map(([x]) => x)) + 1
  const x = Math.max(0, Math.floor((LAB_COLS - width) / 2))
  if (!labFits(occupied, cells, x, 0)) {
    return { active: null, colorIndex: colorIndex + 1, done: true }
  }
  return { active: { cells, x, y: 0, color }, colorIndex: colorIndex + 1, done: false }
}

function commitLock(sim: Sim, active: LabActive, tape: LabTape): Sim {
  const occupied = sim.occupied.map((row) => [...row])
  for (const [dx, dy] of active.cells) {
    const row = occupied[active.y + dy]
    if (row) {
      row[active.x + dx] = active.color
    }
  }
  const locks = [...sim.locks, { cells: active.cells, x: active.x, y: active.y, color: active.color }]
  const spawned = spawnIndexed(occupied, tape, sim.colorIndex)
  return {
    occupied,
    active: spawned.active,
    colorIndex: spawned.colorIndex,
    lockedCount: sim.lockedCount + 1,
    locks,
    done: spawned.done,
  }
}

/** Simulate the tape through the first `eventCount` events (0 = just spawned). */
export function labSimulateTape(tape: LabTape, eventCount: number): TapeReplay {
  const occupied = emptyBoard()
  const first = spawnIndexed(occupied, tape, 0)
  let sim: Sim = {
    occupied,
    active: first.active,
    colorIndex: first.colorIndex,
    lockedCount: 0,
    locks: [],
    done: first.done,
  }

  const limit = Math.max(0, Math.min(tape.events.length, Math.floor(eventCount)))
  for (let i = 0; i < limit; i += 1) {
    if (sim.done || !sim.active) {
      break
    }
    const event = tape.events[i]!
    const active = sim.active

    if (event === 'HD') {
      const y = hardDropY(sim.occupied, active.cells, active.x, active.y)
      sim = commitLock(sim, { ...active, y }, tape)
      continue
    }

    if (event === 'G' || event === 'S') {
      if (labFits(sim.occupied, active.cells, active.x, active.y + 1)) {
        sim = { ...sim, active: { ...active, y: active.y + 1 } }
      } else {
        sim = commitLock(sim, active, tape)
      }
      continue
    }

    let cells = active.cells
    let x = active.x
    if (event === 'L') {
      x -= 1
    } else if (event === 'R') {
      x += 1
    } else if (event === 'CW') {
      cells = rotateCw(cells)
    } else if (event === 'CCW') {
      cells = rotateCcw(cells)
    }
    if (labFits(sim.occupied, cells, x, active.y)) {
      sim = { ...sim, active: { ...active, cells, x } }
    }
  }

  return {
    occupied: sim.occupied,
    active: sim.active,
    lockedCount: sim.lockedCount,
    locks: sim.locks,
    done: sim.done,
  }
}
