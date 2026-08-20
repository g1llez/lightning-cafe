import { useEffect, useMemo, useRef, useState } from 'react'
import {
  tetrisCellFill,
  tetrisPlan,
  tetrisSnapshot,
  TETRIS_COLS,
  TETRIS_DROP_SHARE,
  TETRIS_ROWS,
  TETRIS_SPAWN_ROWS,
  type TetrisCell,
  type TetrisFalling,
  type TetrisPiece,
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
      backgroundColor: tetrisCellFill(cell, falling),
      boxShadow: falling ? 'inset 0 0 0 1px rgba(255,255,255,0.45)' : undefined,
    },
  }
}

/**
 * Live packing: a smooth clock picks the piece index; each new piece gets a
 * full CSS drop from above the well (not a per-frame React top=). Confirmed
 * tiles pass interval=0 and render frozen.
 */
export function BlockTetris({ seed, fill, txCount, minePieces, interval }: BlockTetrisProps) {
  const fillRef = useRef(fill)
  fillRef.current = fill
  const [progress, setProgress] = useState(fill)
  const plan = useMemo(() => tetrisPlan(seed, txCount, minePieces), [seed, txCount, minePieces])
  const frozen = interval <= 0

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
  const dropMs = Math.max(600, (interval / Math.max(1, plan.length)) * TETRIS_DROP_SHARE * 1000)
  const fallingIndex =
    snap.falling && plan.length > 0
      ? Math.min(plan.length - 1, Math.floor(Math.min(0.999, progress) * plan.length))
      : -1
  const fallingPiece = fallingIndex >= 0 ? plan[fallingIndex] : null

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
      {!frozen && fallingPiece ? (
        <CssFallingPiece key={`${seed}-${fallingIndex}`} piece={fallingPiece} dropMs={dropMs} />
      ) : null}
    </div>
  )
}

function CssFallingPiece({ piece, dropMs }: { piece: TetrisPiece; dropMs: number }) {
  const layerRef = useRef<HTMLDivElement>(null)
  const width = 100 / TETRIS_COLS
  const height = 100 / TETRIS_ROWS
  const fromPercent = ((-TETRIS_SPAWN_ROWS - piece.landY) / TETRIS_ROWS) * 100
  const look = cellStyle(piece, true)

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) {
      return
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      layer.style.transform = 'translateY(0)'
      return
    }

    // Always play the full drop when this piece mounts — never seek mid-flight.
    const animation = layer.animate(
      [{ transform: `translateY(${fromPercent}%)` }, { transform: 'translateY(0)' }],
      { duration: dropMs, easing: 'linear', fill: 'both' },
    )
    return () => animation.cancel()
  }, [dropMs, fromPercent])

  return (
    <div
      ref={layerRef}
      className="pointer-events-none absolute inset-0.5"
      data-testid="tetris-falling"
      data-y={String(piece.landY)}
      style={{ transform: `translateY(${fromPercent}%)` }}
    >
      {piece.cells.map(([dx, dy]) => (
        <span
          key={`${dx}-${dy}`}
          className={`absolute rounded-[1px] ${look.className}`}
          style={{
            ...look.style,
            left: `${(piece.x + dx) * width}%`,
            top: `${(piece.landY + dy) * height}%`,
            width: `${width}%`,
            height: `${height}%`,
          }}
        />
      ))}
    </div>
  )
}
