import { useTranslation } from 'react-i18next'
import { estimateFeeSats, marketQuotes, type Priority } from '../simulation/chain'
import { formatCad, satsToCad } from '../simulation/player'
import { InfoMark } from './Tooltip'

const SPEEDS: Priority[] = ['high', 'medium', 'low']

type FeePickerProps = {
  marketRate: number
  value: Priority
  onChange: (priority: Priority) => void
  priceCad: number
  payer: 'you' | 'exchange'
}

/** High / medium / low copy the current market quotes as a bid. */
export function FeePicker({ marketRate, value, onChange, priceCad, payer }: FeePickerProps) {
  const { t } = useTranslation()
  const quotes = marketQuotes(marketRate)

  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-text-muted">
        {t('services.speed')}
        <InfoMark
          text={
            <>
              {t('services.feePreview')} {t(`services.feePayer.${payer}`)} {t('services.speedHint')}
            </>
          }
        />
      </p>
      <div className="grid grid-cols-3 gap-2">
        {SPEEDS.map((option) => {
          const fee = estimateFeeSats(quotes[option])
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`flex flex-col gap-0.5 rounded-md border px-2 py-2 text-left transition ${
                value === option
                  ? 'border-accent bg-accent/10'
                  : 'border-border hover:border-accent/60'
              }`}
            >
              <span
                className={`text-xs font-semibold ${
                  value === option ? 'text-accent' : 'text-text-primary'
                }`}
              >
                {t(`services.speedName.${option}`)}
              </span>
              <span className="font-mono text-[11px] text-text-muted">{quotes[option]} sat/vB</span>
              <span className="font-mono text-[10px] leading-tight text-text-muted">
                {t('services.feeAmount', {
                  sats: fee.toLocaleString(),
                  cad: formatCad(satsToCad(fee, priceCad)),
                })}
              </span>
              <span className="text-[11px] leading-tight text-text-muted">
                {t(`services.speedWait.${option}`)}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function feeRateFor(marketRate: number, priority: Priority): number {
  return marketQuotes(marketRate)[priority]
}
