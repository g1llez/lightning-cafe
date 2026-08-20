import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSimulation } from '../simulation/SimulationProvider'

export function SessionMenu() {
  const { t } = useTranslation()
  const { roomId, sessionStatus, createCafe, joinCafe, leaveCafe } = useSimulation()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open])

  async function handleCreate() {
    setBusy(true)
    setFailed(false)
    try {
      await createCafe()
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin() {
    setBusy(true)
    setFailed(false)
    try {
      await joinCafe(draft)
      setDraft('')
      setOpen(false)
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  async function handleCopy() {
    if (!roomId) {
      return
    }
    const url = new URL(window.location.href)
    url.searchParams.set('room', roomId)
    try {
      await navigator.clipboard.writeText(url.toString())
      setOpen(false)
    } catch {
      // stay open so they can still copy the id
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((current) => !current)}
        className={`relative z-30 rounded-md border px-3 py-2 text-sm transition ${
          sessionStatus === 'error'
            ? 'border-danger/70 bg-danger/10 text-danger'
            : roomId
              ? 'border-accent/70 bg-accent/10 text-accent'
              : 'border-border bg-bg-panel hover:border-accent/60'
        }`}
      >
        {t('session.button')}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
      {open && (
        <div
          role="dialog"
          aria-label={t('session.button')}
          className="absolute left-0 z-30 mt-2 flex w-72 flex-col gap-2.5 rounded-md border border-border bg-bg-panel p-3 shadow-lg"
        >
          <p className="text-[12px] leading-relaxed text-text-primary">{t('session.invite')}</p>
          {roomId ? (
            <div className="flex flex-col gap-2">
              <p className="font-mono text-[11px] break-all text-text-muted">{roomId}</p>
              <p className="text-[11px] text-text-muted">
                {sessionStatus === 'live'
                  ? t('session.live')
                  : sessionStatus === 'error'
                    ? t('session.failed')
                    : t('session.connecting')}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted hover:border-accent/60 hover:text-accent"
                >
                  {t('session.copyLink')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    leaveCafe()
                    setOpen(false)
                  }}
                  className="rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted hover:border-accent/60 hover:text-accent"
                >
                  {t('session.leave')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleCreate()}
                className="rounded-md bg-accent px-2.5 py-1.5 text-xs font-semibold text-bg-primary disabled:opacity-40"
              >
                {t('session.create')}
              </button>
              <div className="flex gap-2">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={t('session.idPlaceholder')}
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded-md border border-border bg-bg-primary px-2 py-1.5 font-mono text-[11px] outline-none focus:border-accent"
                />
                <button
                  type="button"
                  disabled={busy || !draft.trim()}
                  onClick={() => void handleJoin()}
                  className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted hover:border-accent/60 hover:text-accent disabled:opacity-40"
                >
                  {t('session.join')}
                </button>
              </div>
              {failed && (
                <p className="text-[11px] text-text-muted">{t('session.failed')}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
