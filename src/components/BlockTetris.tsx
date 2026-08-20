import { useEffect, useMemo, useRef } from 'react'
import {
  tetrisPlan,
  tetrisSnapshot,
  TETRIS_COLS,
  TETRIS_DROP_SHARE,
  TETRIS_ROWS,
  TETRIS_SPAWN_ROWS,
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

function cellClass(cell: TetrisCell | TetrisFalling['kind'], falling = false): string {
  if (cell === 'mine') {
    return falling ? 'bg-accent brightness-125' : 'bg-accent'
  }
  if (cell === 'npc') {
    return falling ? 'bg-white/80' : 'bg-bg-primary/60'
  }
  return 'bg-black/25'
}

export function BlockTetris({ seed, fill, txCount, minePieces, interval }: BlockTetrisProps) {
  const plan = useMemo(() => tetrisPlan(seed, txCount, minePieces), [seed, txCount, minePieces])
  const snap = tetrisSnapshot(plan, fill)
  const dropMs = Math.max(280, (interval / Math.max(1, plan.length)) * TETRIS_DROP_SHARE * 1000)

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
      {snap.falling ? (
        <FallingPiece key={`${seed}-${snap.falling.x}-${snap.falling.landY}`} piece={snap.falling} dropMs={dropMs} />
      ) : null}
    </div>
  )
}

function FallingPiece({ piece, dropMs }: { piece: TetrisFalling; dropMs: number }) {
  const layerRef = useRef<HTMLDivElement>(null)
  const seekRef = useRef(piece.dropT)
  const width = 100 / TETRIS_COLS
  const height = 100 / TETRIS_ROWS
  const from = ((-TETRIS_SPAWN_ROWS - piece.landY) / TETRIS_ROWS) * 100

  useEffect(() => {
    const layer = layerRef.current
    if (!layer) {
      return
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      layer.style.transform = 'translateY(0)'
      return
    }

    const animation = layer.animate(
      [{ transform: `translateY(${from}%)` }, { transform: 'translateY(0)' }],
      {
        duration: dropMs,
        delay: -seekRef.current * dropMs,
        easing: 'linear',
        fill: 'both',
      },
    )
    return () => animation.cancel()
  }, [dropMs, from])

  return (
    <div
      ref={layerRef}
      className="pointer-events-none absolute inset-0.5"
      style={{ transform: `translateY(${from}%)` }}
    >
      {piece.cells.map(([dx, dy]) => (
        <span
          key={`${dx}-${dy}`}
          className={`absolute rounded-[1px] ${cellClass(piece.kind, true)}`}
          style={{
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
