import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  cadToSats,
  EXCHANGE_SPREAD,
  exchangeSpreadCad,
  formatCad,
  satsToCad,
} from '../simulation/player'
import { useSimulation } from '../simulation/SimulationProvider'
import { AmountSats, SAT_PRESETS } from './AmountSats'
import { Modal } from './Modal'
import { mempoolFlyId } from './SatsFlight'
import { InfoMark } from './Tooltip'

type BuyModalProps = {
  onClose: () => void
  onMessage: (message: string) => void
  onSatsSent: (label: string, target: string) => void
}

export function BuyModal({ onClose, onMessage, onSatsSent }: BuyModalProps) {
  const { t } = useTranslation()
  const { player, btcPriceCad, buyBtc } = useSimulation()
  const maxCad = Math.floor(player.cad / (1 + EXCHANGE_SPREAD))
  const maxSats = cadToSats(maxCad, btcPriceCad)
  const [amount, setAmount] = useState(Math.min(SAT_PRESETS[0], maxSats) || maxSats)
  const [addressDraft, setAddressDraft] = useState('')

  const cadCost = Math.round(satsToCad(Math.max(0, amount), btcPriceCad))
  const spread = exchangeSpreadCad(cadCost)
  const totalCad = cadCost + spread
  const received = cadToSats(cadCost, btcPriceCad)
  const amountOk = amount > 0 && cadCost >= 1 && totalCad <= player.cad
  const addressOk = addressDraft.trim().length > 0

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      setAddressDraft(text.trim())
    } catch {
      onMessage(t('services.pasteFailed'))
    }
  }

  function handleBuy() {
    if (!addressOk || !amountOk) {
      return
    }

    buyBtc(addressDraft, cadCost)
    onSatsSent(t('services.flyingSats', { sats: received.toLocaleString() }), mempoolFlyId('high'))
    onMessage(t('services.buySent'))
    onClose()
  }

  return (
    <Modal title={t('services.buyTitle')} closeLabel={t('common.close')} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <AmountSats
          value={amount}
          onChange={setAmount}
          max={maxSats}
          priceCad={btcPriceCad}
        />

        <p className="flex items-center gap-1.5 font-mono text-xs text-text-muted">
          {t('services.exchangeSpread', {
            pct: Math.round(EXCHANGE_SPREAD * 100),
            cad: formatCad(spread),
          })}
          <InfoMark text={t('services.exchangeSpreadTip')} />
        </p>

        <div>
          <p className="mb-1.5 text-xs uppercase tracking-[0.14em] text-text-muted">
            {t('services.destination')}
          </p>
          <div className="flex items-center gap-2">
            <input
              value={addressDraft}
              onChange={(event) => setAddressDraft(event.target.value)}
              placeholder={t('services.addressPlaceholder')}
              spellCheck={false}
              className="min-w-0 flex-1 rounded-md border border-border bg-bg-primary px-2 py-1.5 font-mono text-[11px] outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={handlePaste}
              className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted transition hover:border-accent/60 hover:text-accent"
            >
              {t('services.paste')}
            </button>
          </div>
          {addressOk && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-text-muted">
              {t('services.addressWarning')}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleBuy}
          disabled={!amountOk || !addressOk}
          className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg-primary transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('services.confirmBuy', {
            sats: received.toLocaleString(),
            cad: formatCad(totalCad),
          })}
        </button>
      </div>
    </Modal>
  )
}
