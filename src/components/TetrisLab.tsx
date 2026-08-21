import { useCallback, useEffect, useState } from 'react'
import {
  createLabState,
  formatLabTapes,
  labApply,
  labColorHex,
  labFilledCount,
  labIsPreviewRow,
  labToTape,
  LAB_COLS,
  LAB_MOVES_PER_TICK,
  LAB_ROWS,
  type LabAction,
  type LabState,
  type LabTape,
} from '../simulation/tetrisLab'

/**
 * Local recorder: 2 moves then gravity. Exports action tapes for café replay.
 */
export function TetrisLab() {
  const [state, setState] = useState<LabState>(() => createLabState())
  const [saved, setSaved] = useState<LabTape[]>([])
  const [message, setMessage] = useState('')

  const apply = useCallback((action: LabAction) => {
    setState((current) => labApply(current, action))
  }, [])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const key = event.key.toLowerCase()
      if (key === 'w') {
        event.preventDefault()
        apply('rotCw')
        return
      }
      if (key === 'x') {
        event.preventDefault()
        apply('rotCcw')
        return
      }
      if (key === 'a') {
        event.preventDefault()
        apply('left')
        return
      }
      if (key === 'd') {
        event.preventDefault()
        apply('right')
        return
      }
      if (key === 's') {
        event.preventDefault()
        apply('soft')
        return
      }
      if (key === ' ' || key === 'enter') {
        event.preventDefault()
        apply('drop')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [apply])

  async function saveScenario() {
    if (state.lockedCount === 0 && state.events.length === 0) {
      setMessage('Joue un peu avant de sauver.')
      return
    }
    const tape = labToTape(state)
    const next = [...saved, tape]
    setSaved(next)
    const text = formatLabTapes(next)
    const filled = labFilledCount(state)
    const note =
      state.status === 'full'
        ? 'plein'
        : state.status === 'stuck'
          ? `bloqué · ${filled}/64`
          : `${filled}/64`
    try {
      await navigator.clipboard.writeText(text)
      setMessage(`Tape ${next.length} ajoutée (${note}). Bloc complet copié.`)
    } catch {
      setMessage(`Tape ${next.length} ajoutée (${note}). Copie le bloc ci-dessous.`)
    }
  }

  async function copyAll() {
    if (saved.length === 0) {
      setMessage('Aucune tape sauvée.')
      return
    }
    const text = formatLabTapes(saved)
    try {
      await navigator.clipboard.writeText(text)
      setMessage(`${saved.length} tape(s) — bloc unique copié.`)
    } catch {
      setMessage('Copie manuelle ci-dessous.')
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-bg-primary text-text-primary">
      <header className="border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold">Tetris lab — enregistreur d’actions</h1>
        <p className="mt-1 text-sm text-text-muted">
          {LAB_MOVES_PER_TICK} moves (W/X/A/D), puis gravité auto. S = soft drop · Space = hard drop. Le Café rejoue chaque step.
        </p>
        <p className="mt-1 font-mono text-xs text-accent">
          moves left: {state.movesLeft} · events: {state.events.length}
        </p>
      </header>

      <div className="flex flex-1 flex-col items-center gap-4 px-4 py-6 md:flex-row md:items-start md:justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="grid gap-px rounded-md bg-bg-secondary p-1"
            style={{
              gridTemplateColumns: `repeat(${LAB_COLS}, 1.75rem)`,
              gridTemplateRows: `repeat(${LAB_ROWS}, 1.75rem)`,
            }}
          >
            {Array.from({ length: LAB_ROWS }, (_, y) =>
              Array.from({ length: LAB_COLS }, (_, x) => {
                let color = state.occupied[y]?.[x] ?? null
                if (state.active) {
                  for (const [dx, dy] of state.active.cells) {
                    if (state.active.x + dx === x && state.active.y + dy === y) {
                      color = state.active.color
                    }
                  }
                }
                const preview = labIsPreviewRow(y)
                return (
                  <span
                    key={`${x}-${y}`}
                    className={`rounded-[2px] border border-black/20 ${preview ? 'opacity-70' : ''}`}
                    style={{
                      backgroundColor: color ? labColorHex(color) : preview ? '#12141f' : '#1a1c2a',
                      boxShadow: y === 1 ? 'inset 0 -1px 0 0 #f7931a66' : undefined,
                    }}
                  />
                )
              }),
            )}
          </div>

          <p className="font-mono text-sm text-text-muted">
            {labFilledCount(state)} / 64 · lock {state.lockedCount}
            {state.status === 'full' ? ' · PLEIN' : ''}
            {state.status === 'stuck' ? ' · BLOQUÉ' : ''}
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            <button type="button" className="rounded border border-border px-3 py-1.5 text-sm" onClick={() => apply('rotCcw')}>
              X −90°
            </button>
            <button type="button" className="rounded border border-border px-3 py-1.5 text-sm" onClick={() => apply('rotCw')}>
              W +90°
            </button>
            <button type="button" className="rounded border border-border px-3 py-1.5 text-sm" onClick={() => apply('left')}>
              A ←
            </button>
            <button type="button" className="rounded border border-border px-3 py-1.5 text-sm" onClick={() => apply('right')}>
              D →
            </button>
            <button type="button" className="rounded border border-border px-3 py-1.5 text-sm" onClick={() => apply('soft')}>
              S ↓
            </button>
            <button
              type="button"
              className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-bg-primary"
              onClick={() => apply('drop')}
            >
              Space drop
            </button>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className="rounded border border-border px-3 py-1.5 text-sm"
              onClick={() => {
                setState(createLabState())
                setMessage('')
              }}
            >
              Nouvelle partie
            </button>
            <button
              type="button"
              className="rounded bg-accent px-3 py-1.5 text-sm font-medium text-bg-primary disabled:opacity-40"
              disabled={state.events.length === 0}
              onClick={() => void saveScenario()}
            >
              Sauver (+ bloc)
            </button>
            <button
              type="button"
              className="rounded border border-border px-3 py-1.5 text-sm disabled:opacity-40"
              disabled={saved.length === 0}
              onClick={() => void copyAll()}
            >
              Tout copier
            </button>
          </div>
          {message ? <p className="max-w-sm text-center text-sm text-accent">{message}</p> : null}
        </div>

        <aside className="w-full max-w-lg">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-text-muted">
            Bloc TAPES ({saved.length})
          </h2>
          {saved.length === 0 ? (
            <p className="text-sm text-text-muted">
              Sauve des parties : un seul bloc `[ ... ]` à coller dans `tetris.ts` → `TAPES`.
            </p>
          ) : (
            <pre className="max-h-[28rem] overflow-auto rounded-md border border-border bg-bg-secondary p-2 font-mono text-[10px] text-text-muted">
              {formatLabTapes(saved)}
            </pre>
          )}
        </aside>
      </div>
    </div>
  )
}
