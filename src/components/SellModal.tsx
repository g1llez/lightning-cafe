import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { estimateFeeSats, type Priority } from '../simulation/chain'
import {
  exchangeAddress,
  EXCHANGE_CONFIRMATIONS,
  formatCad,
  planSend,
  satsToCad,
  shortAddress,
  walletSats,
} from '../simulation/player'
import { useSimulation } from '../simulation/SimulationProvider'
import { AmountSats, SEND_PRESETS } from './AmountSats'
import { FeePicker, feeRateFor } from './FeePicker'
import { Modal } from './Modal'
import { mempoolFlyId } from './SatsFlight'
import { InfoMark } from './Tooltip'

type SellModalProps = {
  onClose: () => void
  onMessage: (message: string) => void
  onSatsSent: (label: string, target: string) => void
}

export function SellModal({ onClose, onMessage, onSatsSent }: SellModalProps) {
  const { t } = useTranslation()
  const { chain, player, btcPriceCad, sellBtc } = useSimulation()
  const deposit = exchangeAddress()
  const funded = player.wallets.filter((wallet) => walletSats(wallet) > 0)
  const [walletId, setWalletId] = useState(funded[0]?.id ?? player.wallets[0]?.id ?? '')
  const wallet = player.wallets.find((item) => item.id === walletId)
  const available = wallet ? walletSats(wallet) : 0
  const [priority, setPriority] = useState<Priority>('high')
  const fee = estimateFeeSats(feeRateFor(chain.marketRate, priority))
  const maxSend = Math.max(0, available - fee)
  const [amount, setAmount] = useState(Math.min(SEND_PRESETS[0], maxSend) || maxSend)

  const amountOk = amount > 0 && amount <= maxSend
  const safeAmount = Math.min(amount, maxSend)
  const plan = wallet
    ? planSend(wallet, safeAmount, feeRateFor(chain.marketRate, priority))
    : { payment: 0, fee, change: 0, changeAddress: null as string | null }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(deposit)
      onMessage(t('services.sellDepositCopied'))
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

  function handleSell() {
    if (!wallet || !amountOk) {
      return
    }

    const feeRate = feeRateFor(chain.marketRate, priority)
    sellBtc(wallet.id, safeAmount, feeRate)
    onSatsSent(t('services.flyingSats', { sats: safeAmount.toLocaleString() }), mempoolFlyId(priority))
    onMessage(t('services.sellSent'))
    onClose()
  }

  return (
    <Modal title={t('services.sellTitle')} closeLabel={t('common.close')} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-1.5 text-[12px] leading-relaxed text-text-muted">
          {t('services.sellConfirmations', { count: EXCHANGE_CONFIRMATIONS })}
          <InfoMark text={t('services.sellConfirmationsTip', { count: EXCHANGE_CONFIRMATIONS })} />
        </p>

        {player.wallets.length === 0 ? (
          <p className="text-[12px] text-text-muted">{t('services.sellNoWallet')}</p>
        ) : (
          <>
            {player.wallets.length > 1 && (
              <div>
                <p className="mb-1.5 text-xs uppercase tracking-[0.14em] text-text-muted">
                  {t('services.sellFrom')}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  {player.wallets.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setWalletId(item.id)}
                      className={`rounded-md border px-2.5 py-1.5 text-xs transition ${
                        item.id === walletId
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border text-text-muted hover:border-accent/60 hover:text-accent'
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

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
                {t('services.sellDeposit')}
              </p>
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 break-all font-mono text-[11px] text-text-primary">
                  {deposit}
                </p>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted transition hover:border-accent/60 hover:text-accent"
                >
                  {t('assets.copy')}
                </button>
              </div>
            </div>

            <FeePicker
              marketRate={chain.marketRate}
              value={priority}
              onChange={handlePriority}
              priceCad={btcPriceCad}
              payer="you"
            />

            {wallet && (
              <ul className="flex flex-col gap-1 rounded-md border border-border bg-bg-secondary px-2.5 py-2 font-mono text-[11px] leading-relaxed text-text-muted">
                <li>{t('assets.sendOutputPay', { sats: plan.payment.toLocaleString() })}</li>
                <li>{t('assets.sendOutputFee', { sats: plan.fee.toLocaleString() })}</li>
                <li>
                  {t('assets.sendOutputChange', {
                    sats: plan.change.toLocaleString(),
                    address: plan.changeAddress ? shortAddress(plan.changeAddress) : '—',
                  })}
                </li>
              </ul>
            )}

            <button
              type="button"
              onClick={handleSell}
              disabled={!amountOk}
              className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg-primary transition disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('services.sellConfirm', {
                sats: safeAmount.toLocaleString(),
                cad: formatCad(satsToCad(safeAmount, btcPriceCad)),
              })}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}
