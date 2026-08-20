import { useEffect, useRef, useState } from 'react'
import {
  tetrisPlan,
  tetrisSnapshot,
  TETRIS_COLS,
  TETRIS_ROWS,
  type TetrisCell,
  type TetrisFalling,
} from '../simulation/tetris'

type BlockTetrisProps = {
  seed: string
  fill: number
  txCount: number
  minePieces: number
  interval: number
}

function cellClass(cell: TetrisCell | TetrisFalling['kind']): string {
  if (cell === 'mine') {
    return 'bg-accent'
  }
  if (cell === 'npc') {
    return 'bg-bg-primary/55'
  }
  return 'bg-black/25'
}

export function BlockTetris({ seed, fill, txCount, minePieces, interval }: BlockTetrisProps) {
  const fillRef = useRef(fill)
  fillRef.current = fill
  const [progress, setProgress] = useState(fill)
  const plan = tetrisPlan(seed, txCount, minePieces)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || interval <= 0) {
      setProgress(fillRef.current)
      return
    }

    const started = performance.now() - fillRef.current * interval * 1000
    let frame = 0
    const tick = (now: number) => {
      setProgress(Math.min(1, Math.max(0, (now - started) / (interval * 1000))))
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [seed, interval])

  const snap = tetrisSnapshot(plan, progress)

  return (
    <div className="relative h-full w-full" aria-hidden="true">
      <div
        className="grid h-full w-full gap-px p-0.5"
        style={{
          gridTemplateColumns: `repeat(${TETRIS_COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${TETRIS_ROWS}, minmax(0, 1fr))`,
        }}
      >
        {snap.landed.flatMap((row, y) =>
          row.map((cell, x) => <span key={`${x}-${y}`} className={`rounded-[1px] ${cellClass(cell)}`} />),
        )}
      </div>
      {snap.falling ? <FallingPiece piece={snap.falling} /> : null}
    </div>
  )
}

function FallingPiece({ piece }: { piece: TetrisFalling }) {
  const width = 100 / TETRIS_COLS
  const height = 100 / TETRIS_ROWS

  return (
    <div className="pointer-events-none absolute inset-0.5">
      {piece.cells.map(([dx, dy]) => (
        <span
          key={`${dx}-${dy}`}
          className={`absolute rounded-[1px] ${cellClass(piece.kind)}`}
          style={{
            left: `${(piece.x + dx) * width}%`,
            top: `${(piece.y + dy) * height}%`,
            width: `${width}%`,
            height: `${height}%`,
          }}
        />
      ))}
    </div>
  )
}
