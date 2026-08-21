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
    return { className: 'bg-transparent' }
  }
  return {
    className: falling ? 'brightness-125' : '',
    style: {
      backgroundColor: tetrisCellFill(cell),
      boxShadow: falling ? 'inset 0 0 0 1px rgba(255,255,255,0.45)' : undefined,
    },
  }
}

/**
 * Replays a lab action tape step-by-step (moves / rotates / gravity / drops).
 * No vertical ghosting: the active piece is drawn at its recorded pose each event.
 */
export function BlockTetris({ seed, fill, txCount, minePieces, interval }: BlockTetrisProps) {
  const fillRef = useRef(fill)
  fillRef.current = fill
  const [progress, setProgress] = useState(fill)
  const tape = useMemo(() => tetrisPlan(seed, txCount, minePieces), [seed, txCount, minePieces])
  const frozen = interval <= 0

  useEffect(() => {
    if (frozen) {
      setProgress(1)
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
  }, [seed, interval, frozen])

  const snap = tetrisSnapshot(tape, frozen ? 1 : progress, minePieces)
  const width = 100 / TETRIS_COLS
  const height = 100 / TETRIS_ROWS

  return (
    <div className="relative h-full w-full" data-testid="block-tetris" aria-hidden="true">
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
      {!frozen && snap.falling ? (
        <div className="pointer-events-none absolute inset-0.5" data-testid="tetris-falling">
          {snap.falling.cells.map(([dx, dy]) => {
            const look = cellStyle(snap.falling!, true)
            return (
              <span
                key={`${dx}-${dy}`}
                className={`absolute rounded-[1px] transition-[top,left] duration-75 ease-linear ${look.className}`}
                style={{
                  ...look.style,
                  left: `${(snap.falling!.x + dx) * width}%`,
                  top: `${(snap.falling!.y + dy) * height}%`,
                  width: `${width}%`,
                  height: `${height}%`,
                }}
              />
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
