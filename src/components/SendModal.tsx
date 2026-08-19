import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { estimateFeeSats, type Priority } from '../simulation/chain'
import {
  findWalletByAddress,
  formatCad,
  receiveAddress,
  satsToCad,
  walletSats,
} from '../simulation/player'
import { useSimulation } from '../simulation/SimulationProvider'
import { AmountSats } from './AmountSats'
import { FeePicker, feeRateFor } from './FeePicker'
import { Modal } from './Modal'
import { mempoolFlyId } from './SatsFlight'

const SEND_PRESETS = [10_000, 50_000, 100_000]

type SendModalProps = {
  walletId: string
  onClose: () => void
  onMessage: (message: string) => void
  onSatsSent: (label: string, target: string) => void
}

export function SendModal({ walletId, onClose, onMessage, onSatsSent }: SendModalProps) {
  const { t } = useTranslation()
  const { chain, player, btcPriceCad, sendBtc } = useSimulation()
  const wallet = player.wallets.find((item) => item.id === walletId)
  const available = wallet ? walletSats(wallet) : 0
  const [priority, setPriority] = useState<Priority>('high')
  const fee = estimateFeeSats(feeRateFor(chain.marketRate, priority))
  const maxSend = Math.max(0, available - fee)
  const [amount, setAmount] = useState(Math.min(10_000, maxSend) || maxSend)
  const [addressDraft, setAddressDraft] = useState('')

  const owner = findWalletByAddress(player, addressDraft)
  const others = player.wallets.filter((item) => item.id !== walletId)
  const amountOk = amount > 0 && amount <= maxSend
  const addressOk = addressDraft.trim().length > 0
  const totalDebit = Math.max(0, amount) + fee
  const safeAmount = Math.min(amount, maxSend)

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      setAddressDraft(text.trim())
    } catch {
      onMessage(t('services.pasteFailed'))
    }
  }

  function handlePriority(next: Priority) {
    const nextFee = estimateFeeSats(feeRateFor(chain.marketRate, next))
    const nextMax = Math.max(0, available - nextFee)
    setPriority(next)
    setAmount((current) => Math.min(current, nextMax))
  }

  function handleSend() {
    if (!wallet || !amountOk || !addressOk) {
      return
    }

    const feeRate = feeRateFor(chain.marketRate, priority)
    sendBtc(walletId, addressDraft, safeAmount, feeRate)
    onSatsSent(t('services.flyingSats', { sats: safeAmount.toLocaleString() }), mempoolFlyId(priority))
    onMessage(t('assets.sendSent'))
    onClose()
  }

  return (
    <Modal title={t('assets.sendTitle')} closeLabel={t('common.close')} onClose={onClose}>
      <div className="flex flex-col gap-4">
          <AmountSats
            value={amount}
            onChange={setAmount}
            presets={SEND_PRESETS}
            max={maxSend}
            priceCad={btcPriceCad}
            allLabel={t('assets.sendAll')}
            onAll={() => setAmount(maxSend)}
            hint={
              <p className="mt-1 font-mono text-[11px] text-text-muted">
                {t('assets.sendAvailable', { sats: available.toLocaleString() })}
              </p>
            }
          />

          <div>
            <p className="mb-1.5 text-xs uppercase tracking-[0.14em] text-text-muted">
              {t('assets.sendDestination')}
            </p>
            {others.length > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {others.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    data-testid={`send-to-${item.id}`}
                    onClick={() => setAddressDraft(receiveAddress(item))}
                    className={`rounded-md border px-2.5 py-1.5 text-xs transition ${
                      owner?.id === item.id
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border text-text-muted hover:border-accent/60 hover:text-accent'
                    }`}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            )}
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

          <FeePicker
            marketRate={chain.marketRate}
            value={priority}
            onChange={handlePriority}
            priceCad={btcPriceCad}
            payer="you"
          />

          <p className="rounded-md border border-border bg-bg-secondary px-2.5 py-2 font-mono text-[11px] leading-relaxed text-text-muted">
            {t('assets.sendTotal', {
              sats: totalDebit.toLocaleString(),
              cad: formatCad(satsToCad(totalDebit, btcPriceCad)),
            })}
          </p>

          <button
            type="button"
            onClick={handleSend}
            disabled={!amountOk || !addressOk}
            className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg-primary transition disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t('assets.sendConfirm', {
              sats: safeAmount.toLocaleString(),
              cad: formatCad(satsToCad(safeAmount, btcPriceCad)),
            })}
          </button>
      </div>
    </Modal>
  )
}
