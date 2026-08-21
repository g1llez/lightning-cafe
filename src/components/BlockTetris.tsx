import { useEffect, useMemo, useRef, useState } from 'react'
import { toneForFee } from '../simulation/chain'
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
  /** 0..1 position in the current block window (unscaled). */
  fill: number
  txCount: number
  minePieces: number
  interval: number
  /** Pack speed vs high lane (1 = full tape over `interval`). Default 1. */
  pace?: number
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
 * Replays a lab action tape step-by-step.
 * Clock is locked to seed/interval/pace — not to every parent `fill` tick (that caused pose flicker).
 */
export function BlockTetris({ seed, fill, txCount, minePieces, interval, pace = 1 }: BlockTetrisProps) {
  const fillRef = useRef(fill)
  fillRef.current = fill
  const [progress, setProgress] = useState(() => Math.min(1, fill * pace))
  const tape = useMemo(() => tetrisPlan(seed, txCount), [seed, txCount])
  const frozen = interval <= 0
  const paceSafe = Math.min(1, Math.max(0.01, pace))

  useEffect(() => {
    if (frozen) {
      setProgress(Math.min(1, fillRef.current * paceSafe))
      return
    }

    // Sync once to the block window; then RAF only (ignore per-second fill updates).
    const started = performance.now() - fillRef.current * interval * 1000
    let frame = 0
    const tick = (now: number) => {
      const blockProgress = Math.min(1, Math.max(0, (now - started) / (interval * 1000)))
      setProgress(Math.min(1, blockProgress * paceSafe))
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [seed, interval, frozen, paceSafe])

  useEffect(() => {
    if (frozen) {
      setProgress(Math.min(1, fill * paceSafe))
    }
  }, [frozen, fill, paceSafe])

  const snap = tetrisSnapshot(tape, progress, minePieces)
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
                className={`absolute rounded-[1px] ${look.className}`}
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

/** Frozen 20px replica of a confirmed block — used on the gossip graph. */
export function MiniBlockChip({
  seed,
  txCount,
  feeRate,
}: {
  seed: string
  txCount: number
  feeRate: number
}) {
  const tape = useMemo(() => tetrisPlan(seed, txCount), [seed, txCount])
  const snap = useMemo(() => tetrisSnapshot(tape, 1, 0), [tape])
  return (
    <div
      className={`h-5 w-5 overflow-hidden rounded-[3px] shadow-md ${toneForFee(feeRate)}`}
      aria-hidden="true"
    >
      <div
        className="grid h-full w-full gap-px p-px"
        style={{
          gridTemplateColumns: `repeat(${TETRIS_COLS}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${TETRIS_ROWS}, minmax(0, 1fr))`,
        }}
      >
        {snap.landed.flatMap((row, y) =>
          row.map((cell, x) => {
            const look = cellStyle(cell)
            return <span key={`${x}-${y}`} className={look.className} style={look.style} />
          }),
        )}
      </div>
    </div>
  )
}
