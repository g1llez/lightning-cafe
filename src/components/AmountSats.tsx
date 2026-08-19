import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCad, satsToCad } from '../simulation/player'

export const SAT_PRESETS = [100_000, 250_000, 500_000]

type AmountSatsProps = {
  value: number
  onChange: (sats: number) => void
  presets?: number[]
  max: number
  priceCad: number
  allLabel?: string
  onAll?: () => void
  hint?: ReactNode
}

export function AmountSats({
  value,
  onChange,
  presets = SAT_PRESETS,
  max,
  priceCad,
  allLabel,
  onAll,
  hint,
}: AmountSatsProps) {
  const { t } = useTranslation()
  const cad = satsToCad(Math.max(0, value), priceCad)

  return (
    <div>
      <p className="mb-1.5 text-xs uppercase tracking-[0.14em] text-text-muted">
        {t('services.amount')}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {presets
          .filter((preset) => preset <= max)
          .map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              className={`rounded-md border px-2.5 py-1.5 font-mono text-xs transition ${
                value === preset
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-muted hover:border-accent/60'
              }`}
            >
              {preset.toLocaleString()}
            </button>
          ))}
        {onAll && allLabel ? (
          <button
            type="button"
            onClick={onAll}
            className={`rounded-md border px-2.5 py-1.5 font-mono text-xs transition ${
              value === max
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-text-muted hover:border-accent/60'
            }`}
          >
            {allLabel}
          </button>
        ) : null}
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <input
            type="number"
            min={1}
            max={max}
            value={value}
            onChange={(event) => onChange(Number(event.target.value))}
            className="min-w-0 w-28 rounded-md border border-border bg-bg-primary px-2 py-1.5 text-right font-mono text-xs outline-none focus:border-accent"
          />
          <span className="shrink-0 text-[11px] text-text-muted">sats</span>
        </div>
      </div>
      <p className="mt-1.5 font-mono text-xs text-accent">
        {t('services.cadEquivalent', { cad: formatCad(cad) })}
      </p>
      {hint}
    </div>
  )
}
