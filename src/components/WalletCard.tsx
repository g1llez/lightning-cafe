import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  findWalletBySeed,
  parseSeed,
  pendingSats,
  pendingSatsForAddress,
  shortAddress,
  walletSats,
  type Wallet,
} from '../simulation/player'
import { txsForWallet } from '../simulation/inspect'
import { useSimulation } from '../simulation/SimulationProvider'
import { LayerAssetCard } from './LayerAssetCard'
import { Modal } from './Modal'
import { ReceiveModal } from './ReceiveModal'
import { SendModal } from './SendModal'
import { InfoMark } from './Tooltip'
import { KnownTxRow } from './TxInspect'

type SeedStep = 'hidden' | 'warned' | 'shown'

type WalletCardProps = {
  onMessage: (message: string) => void
  onSatsSent: (label: string, target: string, from?: string) => void
}

export function WalletCard({ onMessage, onSatsSent }: WalletCardProps) {
  const { t } = useTranslation()
  const { player, addWallet, renameWallet, newAddress, restoreWallet } = useSimulation()
  const [openWalletId, setOpenWalletId] = useState('')
  const [justCreatedId, setJustCreatedId] = useState('')
  const [sendWalletId, setSendWalletId] = useState('')
  const [receiveWalletId, setReceiveWalletId] = useState('')
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [restoreDraft, setRestoreDraft] = useState('')
  const [editingName, setEditingName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [seedStep, setSeedStep] = useState<SeedStep>('hidden')

  const sendWallet = player.wallets.find((wallet) => wallet.id === sendWalletId)
  const receiveWallet = player.wallets.find((wallet) => wallet.id === receiveWalletId)
  const createdWallet = player.wallets.find((wallet) => wallet.id === justCreatedId)

  function toggleDetail(walletId: string) {
    if (openWalletId === walletId) {
      setOpenWalletId('')
      setRenaming(false)
      setSeedStep('hidden')
      return
    }
    setOpenWalletId(walletId)
    setRenaming(false)
    setSeedStep('hidden')
  }

  function handleAddWallet() {
    const id = `w-${player.nextWalletId}`
    addWallet(t('assets.walletName', { number: player.nextWalletId }))
    setJustCreatedId(id)
    setOpenWalletId(id)
    setRenaming(false)
    setSeedStep('hidden')
  }

  function commitRename(walletId: string) {
    try {
      renameWallet(walletId, editingName)
      onMessage(t('assets.walletRenamed'))
    } catch {
      onMessage(t('assets.walletRenameFailed'))
    }
    setRenaming(false)
  }

  async function copyAddress(address: string) {
    try {
      await navigator.clipboard.writeText(address)
      onMessage(t('assets.addressCopied'))
      return true
    } catch {
      onMessage(address)
      return false
    }
  }

  function handleRestore() {
    try {
      restoreWallet(t('assets.walletName', { number: player.nextWalletId }), restoreDraft)
      onMessage(t('assets.restoreCreated'))
      setRestoreOpen(false)
      setRestoreDraft('')
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      if (code === 'seed-exists') {
        const existed = findWalletBySeed(player, parseSeed(restoreDraft))
        onMessage(t('assets.restoreExists', { wallet: existed?.name ?? '' }))
        setRestoreOpen(false)
        setRestoreDraft('')
        return
      }
      onMessage(t('assets.restoreInvalid'))
    }
  }

  function renderExpand(wallet: Wallet) {
    const utxos = wallet.addresses.filter(
      (item) => item.sats > 0 || pendingSatsForAddress(player, item.value) > 0,
    )
    const history = txsForWallet(player, wallet.id)

    return (
      <div
        data-testid={`wallet-detail-${wallet.id}`}
        className="border-t border-border bg-bg-primary/30 px-2 py-2"
      >
        <div className="flex flex-col gap-2.5">
          {renaming ? (
            <input
              autoFocus
              value={editingName}
              onChange={(event) => setEditingName(event.target.value)}
              onBlur={() => commitRename(wallet.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur()
                }
                if (event.key === 'Escape') {
                  setRenaming(false)
                }
              }}
              className="w-full rounded border border-accent bg-bg-primary px-2 py-1 text-sm outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                setEditingName(wallet.name)
                setRenaming(true)
              }}
              title={t('assets.rename')}
              aria-label={t('assets.rename')}
              className="self-start px-0.5 text-[11px] text-text-muted transition hover:text-accent"
            >
              ✎ {t('assets.rename')}
            </button>
          )}

          <section>
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-[0.14em] text-text-muted">
                {t('assets.utxos', { count: utxos.length })}
              </span>
              <InfoMark text={t('assets.utxoHint')} />
            </div>
            {utxos.length === 0 ? (
              <p className="text-[11px] text-text-muted">{t('assets.utxoEmpty')}</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {utxos.map((item, index) => {
                  const waiting = pendingSatsForAddress(player, item.value)
                  return (
                    <li key={item.value} className="flex items-baseline gap-2 font-mono text-[11px]">
                      <span className="text-text-muted">{index + 1}.</span>
                      <span className="text-text-primary">{shortAddress(item.value)}</span>
                      <span className="ml-auto whitespace-nowrap text-right text-accent">
                        {item.sats.toLocaleString()} sats
                        {waiting > 0 && (
                          <span className="block text-[10px] text-text-muted">
                            {t('assets.pending', { sats: waiting.toLocaleString() })}
                          </span>
                        )}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="border-t border-border pt-2">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-[0.14em] text-text-muted">
                {t('assets.history')}
              </span>
            </div>
            {history.length === 0 ? (
              <p className="text-[11px] text-text-muted">{t('assets.historyEmpty')}</p>
            ) : (
              <ul
                data-testid={`wallet-history-${wallet.id}`}
                className="flex max-h-40 flex-col gap-1.5 overflow-y-auto"
              >
                {history.map((tx) => (
                  <KnownTxRow key={tx.id} player={player} tx={tx} testId={`wallet-tx-${tx.id}`} />
                ))}
              </ul>
            )}
          </section>

          <section className="border-t border-border pt-2">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-[0.14em] text-text-muted">
                {t('assets.backup')}
              </span>
              <InfoMark text={t('assets.secretTip')} />
            </div>

            {seedStep === 'hidden' && (
              <button
                type="button"
                onClick={() => setSeedStep('warned')}
                className="rounded-md border border-border px-2 py-1 text-[11px] text-text-muted transition hover:border-accent/60 hover:text-text-primary"
              >
                {t('assets.revealSeed')}
              </button>
            )}

            {seedStep === 'warned' && (
              <div className="rounded-md border border-danger/60 bg-danger/10 px-2.5 py-2">
                <p className="text-[11px] leading-relaxed text-text-primary">{t('assets.seedWarning')}</p>
                <div className="mt-1.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSeedStep('shown')}
                    className="rounded-md border border-danger/60 px-2 py-1 text-[11px] text-text-primary transition hover:bg-danger/20"
                  >
                    {t('assets.seedShowAnyway')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeedStep('hidden')}
                    className="px-1 text-[11px] text-text-muted transition hover:text-text-primary"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}

            {seedStep === 'shown' && (
              <div>
                <ol className="grid grid-cols-3 gap-1">
                  {wallet.seed.map((word, index) => (
                    <li
                      key={`${word}-${index}`}
                      className="rounded border border-border bg-bg-primary px-1.5 py-1 font-mono text-[11px]"
                    >
                      <span className="text-text-muted">{index + 1}.</span> {word}
                    </li>
                  ))}
                </ol>
                <button
                  type="button"
                  onClick={() => setSeedStep('hidden')}
                  className="mt-1.5 rounded-md border border-border px-2 py-1 text-[11px] text-text-muted transition hover:border-accent/60 hover:text-text-primary"
                >
                  {t('assets.hideSecret')}
                </button>
              </div>
            )}
          </section>
        </div>
      </div>
    )
  }

  return (
    <>
      {createdWallet && (
        <Modal
          title={t('assets.createdTitle')}
          subtitle={t('assets.createdTip')}
          closeLabel={t('common.close')}
          onClose={() => setJustCreatedId('')}
        >
          <div className="flex flex-col gap-3">
            <p className="text-sm leading-relaxed text-text-primary">{t('assets.createdBlurb')}</p>
            <ol className="grid grid-cols-3 gap-1">
              {createdWallet.seed.map((word, index) => (
                <li
                  key={`${word}-${index}`}
                  className="rounded border border-border bg-bg-primary px-1.5 py-1 font-mono text-[11px]"
                >
                  <span className="text-text-muted">{index + 1}.</span> {word}
                </li>
              ))}
            </ol>
            <button
              type="button"
              onClick={() => setJustCreatedId('')}
              className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg-primary transition hover:brightness-110"
            >
              {t('assets.createdOk')}
            </button>
          </div>
        </Modal>
      )}
      {restoreOpen && (
        <Modal
          title={t('assets.restoreTitle')}
          subtitle={t('assets.restoreSubtitle')}
          closeLabel={t('common.close')}
          onClose={() => setRestoreOpen(false)}
        >
          <div className="flex flex-col gap-3">
            <textarea
              value={restoreDraft}
              onChange={(event) => setRestoreDraft(event.target.value)}
              rows={3}
              spellCheck={false}
              placeholder={t('assets.restorePlaceholder')}
              className="w-full resize-none rounded-md border border-border bg-bg-primary px-2 py-1.5 font-mono text-[11px] outline-none focus:border-accent"
            />
            <button
              type="button"
              onClick={handleRestore}
              className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg-primary transition hover:brightness-110"
            >
              {t('assets.restore')}
            </button>
          </div>
        </Modal>
      )}
      {sendWallet && (
        <SendModal
          walletId={sendWallet.id}
          onClose={() => setSendWalletId('')}
          onMessage={onMessage}
          onSatsSent={(label, target) => onSatsSent(label, target, 'wallet')}
        />
      )}
      {receiveWallet && (
        <ReceiveModal
          wallet={receiveWallet}
          onClose={() => setReceiveWalletId('')}
          onCopy={(address) => {
            void copyAddress(address).then((copied) => {
              if (copied) {
                newAddress(receiveWallet.id)
                setReceiveWalletId('')
              }
            })
          }}
          onNewAddress={() => {
            newAddress(receiveWallet.id)
          }}
        />
      )}
      <LayerAssetCard
        title={t('assets.wallets')}
        action={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setRestoreOpen(true)}
              className="rounded-md border border-border px-2 py-1 text-[11px] text-text-muted transition hover:border-accent/60 hover:text-accent"
            >
              {t('assets.restore')}
            </button>
            <button
              type="button"
              onClick={handleAddWallet}
              aria-label={t('assets.addWallet')}
              title={t('assets.addWallet')}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-accent/70 bg-bg-panel text-accent transition hover:bg-accent/10"
            >
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
                <path
                  d="M8 2.5v11M2.5 8h11"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        }
      >
        {player.wallets.length === 0 ? (
          <p className="px-2 py-2 text-sm text-text-muted">{t('assets.noWallets')}</p>
        ) : (
          <div>
            {player.wallets.map((wallet) => {
              const waiting = pendingSats(player, wallet.id)
              const open = openWalletId === wallet.id
              return (
                <div key={wallet.id} className="border-t border-border first:border-t-0">
                  <div
                    data-testid={`wallet-row-${wallet.id}`}
                    onClick={() => toggleDetail(wallet.id)}
                    className="flex cursor-pointer items-center hover:bg-bg-primary/40"
                  >
                    <div className="min-w-0 flex-1 truncate px-2 py-2 text-sm font-medium">
                      {wallet.name}
                    </div>
                    <div className="whitespace-nowrap px-1 py-2 text-right font-mono text-xs">
                      <span data-testid={`wallet-sats-${wallet.id}`}>
                        {walletSats(wallet).toLocaleString()} sats
                      </span>
                      {waiting > 0 && (
                        <span
                          data-testid={`wallet-pending-${wallet.id}`}
                          className="block text-[10px] text-text-muted"
                        >
                          {t('assets.pending', { sats: waiting.toLocaleString() })}
                        </span>
                      )}
                    </div>
                    <div className="whitespace-nowrap pr-1">
                      <button
                        type="button"
                        data-testid={`receive-${wallet.id}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          setReceiveWalletId(wallet.id)
                        }}
                        className="rounded-md border border-border px-2 py-1 text-[11px] text-text-muted transition hover:border-accent/60 hover:text-accent"
                      >
                        {t('assets.receive')}
                      </button>
                    </div>
                    <div className="whitespace-nowrap pr-1">
                      <button
                        type="button"
                        data-testid={`send-${wallet.id}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          setSendWalletId(wallet.id)
                        }}
                        className="rounded-md border border-accent/70 px-2 py-1 text-[11px] font-semibold text-accent transition hover:bg-accent/10"
                      >
                        {t('assets.send')}
                      </button>
                    </div>
                  </div>
                  {open && renderExpand(wallet)}
                </div>
              )
            })}
          </div>
        )}
      </LayerAssetCard>
    </>
  )
}
