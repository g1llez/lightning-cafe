import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cadToSats, receiveAddress } from '../simulation/player'
import { useSimulation } from '../simulation/SimulationProvider'
import { Modal } from './Modal'

const PRESETS = [100, 250, 500]

type BuyModalProps = {
  onClose: () => void
  onMessage: (message: string) => void
}

export function BuyModal({ onClose, onMessage }: BuyModalProps) {
  const { t } = useTranslation()
  const { player, btcPriceCad, buyBtc } = useSimulation()
  const [amount, setAmount] = useState(100)
  const [walletId, setWalletId] = useState(player.wallets[0]?.id ?? '')

  const wallet = player.wallets.find((item) => item.id === walletId) ?? player.wallets[0]
  const amountOk = amount > 0 && amount <= player.cad

  function handleBuy() {
    if (!wallet) {
      onMessage(t('services.needWallet'))
      return
    }
    if (!amountOk) {
      onMessage(t('services.needFunds'))
      return
    }

    buyBtc(wallet.id, amount)
    onMessage(t('services.buyOk'))
    onClose()
  }

  return (
    <Modal
      title={t('services.buyTitle')}
      subtitle={t('services.buySubtitle')}
      closeLabel={t('common.close')}
      onClose={onClose}
    >
      {!wallet ? (
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
            <p className="mt-1.5 font-mono text-xs text-accent">
              ≈ {cadToSats(amountOk ? amount : 0, btcPriceCad).toLocaleString()} sats
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-xs uppercase tracking-[0.14em] text-text-muted">
              {t('services.destination')}
            </p>
            <select
              value={wallet.id}
              onChange={(event) => setWalletId(event.target.value)}
              className="w-full rounded-md border border-border bg-bg-primary px-2 py-1.5 text-sm outline-none focus:border-accent"
            >
              {player.wallets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-text-muted">{t('services.walletAddress')}</p>
            <p className="mt-0.5 flex items-center gap-1.5 break-all rounded-md border border-border bg-bg-secondary px-2 py-1.5 font-mono text-[11px] text-text-muted">
              <span className="text-accent">✓</span>
              {receiveAddress(wallet)}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
              {t('services.destinationHint')}
            </p>
          </div>

          <button
            type="button"
            onClick={handleBuy}
            disabled={!amountOk}
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
