import { useTranslation } from 'react-i18next'
import { estimateFeeSats } from '../simulation/chain'
import { isSettledTx, type FundedAddress, type KnownTx } from '../simulation/inspect'
import { shortAddress, type PlayerState } from '../simulation/player'
import { Modal } from './Modal'
import { Tooltip } from './Tooltip'

export function TxDetailTip({
  player,
  tx,
  sats,
  address,
}: {
  player: PlayerState
  tx: KnownTx
  sats: number
  address: string
}) {
  const { t } = useTranslation()
  const wallet = player.wallets.find((item) => item.id === tx.walletId || item.id === tx.fromWalletId)
  const status = isSettledTx(tx)
    ? t('layers.txConfirmed', { height: tx.height })
    : t('layers.txPending')

  return (
    <div className="flex flex-col gap-0.5 font-mono text-[11px] leading-snug">
      <p>{shortAddress(address)}</p>
      <p>{t('layers.inspectSats', { sats: sats.toLocaleString() })}</p>
      <p className="text-text-muted">
        {t('layers.inspectFee', {
          sats: estimateFeeSats(tx.feeRate).toLocaleString(),
          fee: tx.feeRate,
        })}
      </p>
      <p className="text-text-muted">{status}</p>
      {wallet && <p className="text-text-muted">{wallet.name}</p>}
    </div>
  )
}

export function AddressRow({
  player,
  item,
  testId,
}: {
  player: PlayerState
  item: FundedAddress
  testId?: string
}) {
  const { t } = useTranslation()
  return (
    <li
      data-testid={testId}
      data-mine={item.mine ? 'yes' : 'no'}
      className={`flex items-baseline gap-2 rounded-md px-2 py-1.5 font-mono text-[11px] ${
        item.mine ? 'bg-accent/10 ring-1 ring-accent/50' : 'bg-bg-primary/40'
      }`}
    >
      <Tooltip
        side="top"
        text={<TxDetailTip player={player} tx={item.tx} sats={item.sats} address={item.address} />}
      >
        <span className="min-w-0 truncate text-text-primary">
          {shortAddress(item.address)}
          {item.role === 'change' ? ` · ${t('layers.txChange')}` : ''}
        </span>
      </Tooltip>
      {item.mine && <span className="text-accent">{t('layers.inspectYours')}</span>}
      <span className="ml-auto whitespace-nowrap text-accent">{item.sats.toLocaleString()} sats</span>
    </li>
  )
}

export function BlockInspectModal({
  title,
  subtitle,
  player,
  addresses,
  onClose,
}: {
  title: string
  subtitle?: string
  player: PlayerState
  addresses: FundedAddress[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <Modal title={title} subtitle={subtitle} closeLabel={t('common.close')} onClose={onClose}>
      <div data-testid="inspect-block">
        {addresses.length === 0 ? (
          <p className="text-sm text-text-muted">{t('layers.inspectEmpty')}</p>
        ) : (
          <ul className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto">
            {addresses.map((item) => (
              <AddressRow
                key={`${item.tx.id}-${item.address}-${item.role}`}
                player={player}
                item={item}
                testId={`inspect-addr-${item.address}`}
              />
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
