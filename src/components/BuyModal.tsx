import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { marketQuotes, type Priority } from '../simulation/chain'
import { cadToSats, findWalletByAddress, looksLikeAddress } from '../simulation/player'
import { useSimulation } from '../simulation/SimulationProvider'
import { Modal } from './Modal'
import { mempoolFlyId } from './SatsFlight'

const PRESETS = [100, 250, 500]

/** Fastest first: the player reads the trade-off from left to right. */
const SPEEDS: Priority[] = ['high', 'medium', 'low']

type BuyModalProps = {
  onClose: () => void
  onMessage: (message: string) => void
  onSatsSent: (label: string, target: string) => void
}

export function BuyModal({ onClose, onMessage, onSatsSent }: BuyModalProps) {
  const { t } = useTranslation()
  const { chain, player, btcPriceCad, buyBtc } = useSimulation()
  const [amount, setAmount] = useState(100)
  const [addressDraft, setAddressDraft] = useState('')
  const [priority, setPriority] = useState<Priority>('high')

  const hasWallet = player.wallets.length > 0
  const owner = findWalletByAddress(player, addressDraft)
  const amountOk = amount > 0 && amount <= player.cad
  const sats = cadToSats(amountOk ? amount : 0, btcPriceCad)
  const quotes = marketQuotes(chain.marketRate)

  function addressError() {
    if (!addressDraft.trim() || owner) {
      return ''
    }
    return looksLikeAddress(addressDraft) ? t('services.addressUnknown') : t('services.addressInvalid')
  }

  function feeRateFor(option: Priority) {
    return quotes[option]
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      setAddressDraft(text.trim())
    } catch {
      onMessage(t('services.pasteFailed'))
    }
  }

  function handleBuy() {
    if (!owner || !amountOk) {
      return
    }

    const feeRate = feeRateFor(priority)
    buyBtc(addressDraft, amount, feeRate)
    onSatsSent(t('services.flyingSats', { sats: sats.toLocaleString() }), mempoolFlyId(priority))
    onMessage(t('services.buySent'))
    onClose()
  }

  return (
    <Modal
      title={t('services.buyTitle')}
      subtitle={t('services.buySubtitle')}
      closeLabel={t('common.close')}
      onClose={onClose}
    >
      {!hasWallet ? (
        <p className="rounded-md border border-border bg-bg-secondary px-3 py-3 text-sm text-text-muted">
          {t('services.needWallet')}
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-1.5 text-xs uppercase tracking-[0.14em] text-text-muted">
              {t('services.amount')}
            </p>
            <div className="flex items-center gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`rounded-md border px-2.5 py-1.5 font-mono text-xs transition ${
                    amount === preset
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-text-muted hover:border-accent/60'
                  }`}
                >
                  {preset} $
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={player.cad}
                value={amount}
                onChange={(event) => setAmount(Number(event.target.value))}
                className="w-24 rounded-md border border-border bg-bg-primary px-2 py-1.5 text-right font-mono text-xs outline-none focus:border-accent"
              />
            </div>
            <p className="mt-1.5 font-mono text-xs text-accent">≈ {sats.toLocaleString()} sats</p>
          </div>

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
                className={`min-w-0 flex-1 rounded-md border bg-bg-primary px-2 py-1.5 font-mono text-[11px] outline-none ${
                  addressError() ? 'border-danger' : 'border-border focus:border-accent'
                }`}
              />
              <button
                type="button"
                onClick={handlePaste}
                className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted transition hover:border-accent/60 hover:text-accent"
              >
                {t('services.paste')}
              </button>
            </div>
            {addressError() ? (
              <p className="mt-1 text-[11px] leading-relaxed text-danger">{addressError()}</p>
            ) : owner ? (
              <p className="mt-1 text-[11px] text-accent">
                {t('services.addressOwned', { wallet: owner.name })}
              </p>
            ) : (
              <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
                {t('services.destinationHint')}
              </p>
            )}
          </div>

          <div>
            <p className="mb-1.5 text-xs uppercase tracking-[0.14em] text-text-muted">
              {t('services.speed')}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {SPEEDS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setPriority(option)}
                  className={`flex flex-col gap-0.5 rounded-md border px-2 py-2 text-left transition ${
                    priority === option
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-accent/60'
                  }`}
                >
                  <span
                    className={`text-xs font-semibold ${
                      priority === option ? 'text-accent' : 'text-text-primary'
                    }`}
                  >
                    {t(`services.speedName.${option}`)}
                  </span>
                  <span className="font-mono text-[11px] text-text-muted">
                    {feeRateFor(option)} sat/vB
                  </span>
                  <span className="text-[11px] leading-tight text-text-muted">
                    {t(`services.speedWait.${option}`)}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-text-muted">
              {t('services.speedHint')}
            </p>
          </div>

          <p className="rounded-md border border-border bg-bg-secondary px-2.5 py-2 text-[11px] leading-relaxed text-text-muted">
            {t('services.mempoolNote')}
          </p>

          <button
            type="button"
            onClick={handleBuy}
            disabled={!amountOk || !owner}
            className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg-primary transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('services.confirmBuy', { amount: amount.toLocaleString() })}
          </button>

          <p className="border-t border-border pt-2.5 text-[11px] leading-relaxed text-text-muted">
            {t('services.kycNote')}
          </p>
        </div>
      )}
    </Modal>
  )
}
