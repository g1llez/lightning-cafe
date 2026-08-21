import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { estimateFeeSats, type Priority } from '../simulation/chain'
import { availableBroadcastNodes, resolveBroadcastNode } from '../simulation/nodes'
import {
  findWalletByAddress,
  formatCad,
  isExchangeAddress,
  EXCHANGE_CONFIRMATIONS,
  planSend,
  receiveAddress,
  satsToCad,
  shortAddress,
  walletSats,
} from '../simulation/player'
import { useSimulation } from '../simulation/SimulationProvider'
import { AmountSats, SEND_PRESETS } from './AmountSats'
import { FeePicker, feeRateFor } from './FeePicker'
import { Modal } from './Modal'
import { nodeFlyId } from './SatsFlight'
import { InfoMark } from './Tooltip'

type SendModalProps = {
  walletId: string
  onClose: () => void
  onMessage: (message: string) => void
  onSatsSent: (label: string, target: string) => void
}

export function SendModal({ walletId, onClose, onMessage, onSatsSent }: SendModalProps) {
  const { t } = useTranslation()
  const { chain, player, btcPriceCad, sendBtc, chooseBroadcastNode } = useSimulation()
  const tip = chain.confirmed[0]?.height ?? chain.nextHeight - 1
  const wallet = player.wallets.find((item) => item.id === walletId)
  const available = wallet ? walletSats(wallet) : 0
  const [priority, setPriority] = useState<Priority>('high')
  const fee = estimateFeeSats(feeRateFor(chain.marketRate, priority))
  const maxSend = Math.max(0, available - fee)
  const [amount, setAmount] = useState(Math.min(10_000, maxSend) || maxSend)
  const [addressDraft, setAddressDraft] = useState('')
  const nodes = availableBroadcastNodes(player.ownNode, tip)
  const selected =
    resolveBroadcastNode(player.selectedNodeId, player.ownNode, tip) ?? nodes[0] ?? null

  const toExchange = isExchangeAddress(addressDraft)
  const owner = findWalletByAddress(player, addressDraft)
  const others = player.wallets.filter((item) => item.id !== walletId)
  const amountOk = amount > 0 && amount <= maxSend
  const addressOk = addressDraft.trim().length > 0
  const nodeOk = Boolean(selected)
  const safeAmount = Math.min(amount, maxSend)
  const plan = wallet
    ? planSend(wallet, safeAmount, feeRateFor(chain.marketRate, priority))
    : { payment: 0, fee, change: 0, changeAddress: null as string | null }

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
    if (!wallet || !amountOk || !addressOk || !selected) {
      return
    }

    chooseBroadcastNode(selected.id)
    const feeRate = feeRateFor(chain.marketRate, priority)
    sendBtc(walletId, addressDraft, safeAmount, feeRate, selected.id)
    onSatsSent(t('services.flyingSats', { sats: safeAmount.toLocaleString() }), nodeFlyId(selected.id))
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
          {addressOk && toExchange && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] leading-relaxed text-text-muted">
              {t('services.sellConfirmations', { count: EXCHANGE_CONFIRMATIONS })}
              <InfoMark text={t('services.sellConfirmationsTip', { count: EXCHANGE_CONFIRMATIONS })} />
            </p>
          )}
          {addressOk && !toExchange && (
            <p className="mt-1.5 text-[11px] leading-relaxed text-text-muted">
              {t('services.addressWarning')}
            </p>
          )}
        </div>

        <div>
          <p className="mb-1.5 flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-text-muted">
            {t('assets.broadcastNode')}
            <InfoMark
              text={
                selected?.kind === 'own' ? t('assets.broadcastOwnHint') : t('assets.broadcastPublicHint')
              }
            />
          </p>
          <div className="flex flex-wrap gap-2">
            {nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                data-testid={`broadcast-${node.id}`}
                onClick={() => chooseBroadcastNode(node.id)}
                className={`rounded-md border px-2.5 py-1.5 text-xs transition ${
                  selected?.id === node.id
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-muted hover:border-accent/60 hover:text-accent'
                }`}
              >
                {node.name}
                <span className="ml-1 font-mono text-[10px] opacity-70">
                  {node.kind === 'own' ? 'own' : 'public'}
                </span>
              </button>
            ))}
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
          onClick={handleSend}
          disabled={!amountOk || !addressOk || !nodeOk}
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
