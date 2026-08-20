import { tetrisGrid, TETRIS_COLS, TETRIS_ROWS, type TetrisCell } from '../simulation/tetris'

type BlockTetrisProps = {
  seed: string
  fill: number
  txCount: number
  minePieces: number
}

function cellClass(cell: TetrisCell): string {
  if (cell === 'mine') {
    return 'bg-accent'
  }
  if (cell === 'npc') {
    return 'bg-bg-primary/55'
  }
  return 'bg-black/25'
}

export function BlockTetris({ seed, fill, txCount, minePieces }: BlockTetrisProps) {
  const grid = tetrisGrid(seed, fill, txCount, minePieces)

  return (
    <div
      className="grid h-full w-full gap-px p-0.5"
      style={{
        gridTemplateColumns: `repeat(${TETRIS_COLS}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${TETRIS_ROWS}, minmax(0, 1fr))`,
      }}
      aria-hidden="true"
    >
      {grid.flatMap((row, y) =>
        row.map((cell, x) => (
          <span key={`${x}-${y}`} className={`rounded-[1px] ${cellClass(cell)}`} />
        )),
      )}
    </div>
  )
}
