import { useEffect, useMemo, useRef, useState } from 'react'
import {
  tetrisCellFill,
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

function cellStyle(cell: TetrisCell | Pick<TetrisFalling, 'color' | 'kind'>, falling = false): {
  className: string
  style?: { backgroundColor: string; boxShadow?: string }
} {
  if (!cell) {
    return { className: 'bg-black/35' }
  }
  return {
    className: falling ? 'brightness-125' : '',
    style: {
      backgroundColor: tetrisCellFill(cell, falling),
      boxShadow: falling ? 'inset 0 0 0 1px rgba(255,255,255,0.35)' : undefined,
    },
  }
}

export function BlockTetris({ seed, fill, txCount, minePieces, interval }: BlockTetrisProps) {
  const fillRef = useRef(fill)
  fillRef.current = fill
  const [progress, setProgress] = useState(fill)
  const plan = useMemo(() => tetrisPlan(seed, txCount, minePieces), [seed, txCount, minePieces])
  const frozen = interval <= 0 || fill >= 1

  useEffect(() => {
    if (frozen) {
      setProgress(1)
      return
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      setProgress(fillRef.current)
      return
    }

    // Smooth clock for this block: fill only seeds the start (do not restart every second).
    const started = performance.now() - fillRef.current * interval * 1000
    let frame = 0
    const tick = (now: number) => {
      setProgress(Math.min(1, Math.max(0, (now - started) / (interval * 1000))))
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [seed, interval, frozen])

  const snap = tetrisSnapshot(plan, frozen ? 1 : progress)

  return (
    <div className="relative h-full w-full bg-bg-primary/80" aria-hidden="true">
      <div
        className="grid h-full w-full gap-px p-0.5"
        style={{
          gridTemplateColumns: `repeat(${TETRIS_COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${TETRIS_ROWS}, minmax(0, 1fr))`,
        }}
      >
        {snap.landed.flatMap((row, y) =>
          row.map((cell, x) => {
            const look = cellStyle(cell)
            return <span key={`${x}-${y}`} className={`rounded-[1px] ${look.className}`} style={look.style} />
          }),
        )}
      </div>
      {!frozen && snap.falling ? <FallingPiece piece={snap.falling} /> : null}
    </div>
  )
}

function FallingPiece({ piece }: { piece: TetrisFalling }) {
  const width = 100 / TETRIS_COLS
  const height = 100 / TETRIS_ROWS
  const look = cellStyle(piece, true)

  return (
    <div className="pointer-events-none absolute inset-0.5">
      {piece.cells.map(([dx, dy]) => (
        <span
          key={`${dx}-${dy}`}
          className={`absolute rounded-[1px] ${look.className}`}
          style={{
            ...look.style,
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
