import { useTranslation } from 'react-i18next'
import { estimateFeeSats } from '../simulation/chain'
import {
  highlightedInInspect,
  isSettledTx,
  type BlockInspect,
  type KnownTx,
  type OtherTx,
} from '../simulation/inspect'
import { shortAddress, type PlayerState } from '../simulation/player'
import { Modal } from './Modal'

function walletLabel(player: PlayerState, walletId: string | null, fallback: string) {
  if (!walletId) {
    return fallback
  }
  return player.wallets.find((wallet) => wallet.id === walletId)?.name ?? walletId
}

function knownKind(tx: KnownTx): 'send' | 'receive' {
  return tx.fromWalletId ? 'send' : 'receive'
}

export function KnownTxRow({
  player,
  tx,
  testId,
}: {
  player: PlayerState
  tx: KnownTx
  testId?: string
}) {
  const { t } = useTranslation()
  const mine = highlightedInInspect(player, tx)
  const status = isSettledTx(tx)
    ? t('layers.txConfirmed', { height: tx.height })
    : t('layers.txPending')

  return (
    <li
      data-testid={testId}
      data-mine={mine ? 'yes' : 'no'}
      className={`rounded-md px-2 py-1.5 ${
        mine ? 'bg-accent/10 ring-1 ring-accent/50' : 'bg-bg-primary/40'
      }`}
    >
      <div className="flex items-baseline gap-2 text-[11px]">
        <span className="font-semibold text-text-primary">
          {t(knownKind(tx) === 'send' ? 'layers.txSend' : 'layers.txReceive')}
        </span>
        {mine && <span className="text-accent">{t('layers.inspectYours')}</span>}
        <span className="ml-auto font-mono text-text-muted">{status}</span>
      </div>
      <p className="mt-0.5 font-mono text-[11px] leading-snug text-text-primary">
        {t('layers.myTxLine', {
          sats: tx.sats.toLocaleString(),
          feeSats: estimateFeeSats(tx.feeRate).toLocaleString(),
          fee: tx.feeRate,
          address: shortAddress(tx.address),
          wallet: walletLabel(player, tx.walletId, t('layers.unknownAddress')),
        })}
      </p>
      {tx.changeSats > 0 && tx.changeAddress && (
        <p className="font-mono text-[11px] text-text-muted">
          {t('layers.myTxChange', {
            sats: tx.changeSats.toLocaleString(),
            address: shortAddress(tx.changeAddress),
          })}
        </p>
      )}
    </li>
  )
}

function OtherTxRow({ tx }: { tx: OtherTx }) {
  const { t } = useTranslation()
  return (
    <li data-testid={`inspect-other-${tx.id}`} className="rounded-md bg-bg-primary/40 px-2 py-1.5">
      <div className="flex items-baseline gap-2 text-[11px]">
        <span className="font-semibold text-text-muted">{t('layers.txOther')}</span>
        <span className="ml-auto font-mono text-text-muted">{tx.feeRate} sat/vB</span>
      </div>
      <p className="mt-0.5 font-mono text-[11px] leading-snug text-text-muted">
        {tx.sats.toLocaleString()} sats → {shortAddress(tx.address)}
      </p>
    </li>
  )
}

export function TxList({
  player,
  inspect,
  idPrefix,
}: {
  player: PlayerState
  inspect: BlockInspect
  idPrefix: string
}) {
  const { t } = useTranslation()
  const more = inspect.total - inspect.known.length - inspect.others.length

  return (
    <ul className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto">
      {inspect.known.map((tx) => (
        <KnownTxRow
          key={tx.id}
          player={player}
          tx={tx}
          testId={`${idPrefix}-${tx.id}`}
        />
      ))}
      {inspect.others.map((tx) => (
        <OtherTxRow key={tx.id} tx={tx} />
      ))}
      {more > 0 && (
        <li className="px-1 pt-1 text-center text-[11px] text-text-muted">
          {t('layers.inspectMore', { count: more.toLocaleString() })}
        </li>
      )}
    </ul>
  )
}

export function BlockInspectModal({
  title,
  subtitle,
  player,
  inspect,
  onClose,
}: {
  title: string
  subtitle?: string
  player: PlayerState
  inspect: BlockInspect
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <Modal title={title} subtitle={subtitle} closeLabel={t('common.close')} onClose={onClose}>
      <div data-testid="inspect-block">
        <TxList player={player} inspect={inspect} idPrefix="inspect-tx" />
      </div>
    </Modal>
  )
}
