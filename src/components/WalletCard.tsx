import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { receiveAddress, shortAddress, walletSats, type Wallet } from '../simulation/player'
import { useSimulation } from '../simulation/SimulationProvider'
import { LayerAssetCard } from './LayerAssetCard'
import { Modal } from './Modal'
import { Tooltip } from './Tooltip'

type SeedStep = 'hidden' | 'warned' | 'shown'

type WalletCardProps = {
  onMessage: (message: string) => void
}

export function WalletCard({ onMessage }: WalletCardProps) {
  const { t } = useTranslation()
  const { player, addWallet, renameWallet, newAddress } = useSimulation()
  const [openWalletId, setOpenWalletId] = useState('')
  const [justCreatedId, setJustCreatedId] = useState('')
  const [editingName, setEditingName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [seedStep, setSeedStep] = useState<SeedStep>('hidden')
  const [addressesOpen, setAddressesOpen] = useState(false)

  const openWallet = player.wallets.find((wallet) => wallet.id === openWalletId)

  function openDetail(walletId: string) {
    setOpenWalletId(walletId)
    setRenaming(false)
    setSeedStep('hidden')
    setAddressesOpen(false)
  }

  function closeDetail() {
    setOpenWalletId('')
    setJustCreatedId('')
    setRenaming(false)
  }

  function handleAddWallet() {
    const id = `w-${player.nextWalletId}`
    const name = t('assets.walletName', { number: player.nextWalletId })
    addWallet(name)
    openDetail(id)
    setJustCreatedId(id)
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
    } catch {
      onMessage(address)
    }
  }

  function handleNewAddress(wallet: Wallet) {
    newAddress(wallet.id)
    setAddressesOpen(true)
    onMessage(t('assets.newAddressDone'))
  }

  if (!openWallet) {
    return (
      <LayerAssetCard
        title={t('assets.wallets')}
        action={
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
        }
      >
        {player.wallets.length === 0 ? (
          <p className="px-2 py-2 text-sm text-text-muted">{t('assets.noWallets')}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <tbody>
              {player.wallets.map((wallet) => (
                <tr
                  key={wallet.id}
                  onClick={() => openDetail(wallet.id)}
                  className="cursor-pointer border-t border-border first:border-t-0 hover:bg-bg-primary/40"
                >
                  <td className="truncate px-2 py-2 font-medium">{wallet.name}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-right font-mono text-xs">
                    {walletSats(wallet).toLocaleString()} sats
                  </td>
                  <td className="w-4 pr-1 text-right text-text-muted">›</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </LayerAssetCard>
    )
  }

  const address = receiveAddress(openWallet)

  return (
    <>
      {justCreatedId === openWallet.id && (
        <Modal
          title={t('assets.createdTitle')}
          closeLabel={t('common.close')}
          onClose={() => setJustCreatedId('')}
        >
          <div className="flex flex-col gap-2.5 text-sm leading-relaxed">
            <p>{t('assets.createdRandom')}</p>
            <p>{t('assets.createdWords')}</p>
            <p className="rounded-md border border-danger/60 bg-danger/10 px-2.5 py-2 text-[13px]">
              {t('assets.createdRealLife')}
            </p>
            <p className="text-xs text-text-muted">{t('assets.createdWhere')}</p>
            <button
              type="button"
              onClick={() => setJustCreatedId('')}
              className="mt-1 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg-primary transition hover:brightness-110"
            >
              {t('assets.createdOk')}
            </button>
          </div>
        </Modal>
      )}

      <LayerAssetCard
        title={openWallet.name}
        onBack={closeDetail}
        backLabel={t('assets.backToWallets')}
        action={
          <button
            type="button"
            onClick={() => {
              setEditingName(openWallet.name)
              setRenaming(true)
            }}
            title={t('assets.rename')}
            aria-label={t('assets.rename')}
            className="shrink-0 px-1 text-xs text-text-muted transition hover:text-accent"
          >
            ✎
          </button>
        }
      >
        <div className="flex flex-col gap-3 px-1 pb-1">
          {renaming && (
            <input
              autoFocus
              value={editingName}
              onChange={(event) => setEditingName(event.target.value)}
              onBlur={() => commitRename(openWallet.id)}
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
          )}

          <p className="font-mono text-sm text-accent">
            {walletSats(openWallet).toLocaleString()} sats
          </p>

          <section>
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-[0.14em] text-text-muted">
                {t('assets.receive')}
              </span>
              <Tooltip text={t('assets.publicTip')}>
                <span className="text-[11px] text-text-muted">ⓘ</span>
              </Tooltip>
            </div>
            <p className="break-all rounded-md border border-border bg-bg-primary px-2 py-1.5 font-mono text-[11px]">
              {address}
            </p>
            <div className="mt-1.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void copyAddress(address)}
                className="rounded-md border border-border px-2 py-1 text-[11px] text-text-muted transition hover:border-accent/60 hover:text-text-primary"
              >
                {t('assets.copy')}
              </button>
              <button
                type="button"
                onClick={() => handleNewAddress(openWallet)}
                className="rounded-md border border-border px-2 py-1 text-[11px] text-text-muted transition hover:border-accent/60 hover:text-text-primary"
              >
                {t('assets.newAddress')}
              </button>
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-text-muted">
              {t('assets.receiveHint')}
            </p>
          </section>

          <section>
            <button
              type="button"
              onClick={() => setAddressesOpen((open) => !open)}
              className="flex w-full items-center justify-between text-[11px] uppercase tracking-[0.14em] text-text-muted transition hover:text-text-primary"
            >
              <span>{t('assets.myAddresses', { count: openWallet.addresses.length })}</span>
              <span>{addressesOpen ? '−' : '+'}</span>
            </button>
            {addressesOpen && (
              <ul className="mt-1.5 flex flex-col gap-1">
                {openWallet.addresses.map((item, index) => (
                  <li key={item.value} className="flex items-baseline gap-2 font-mono text-[11px]">
                    <span className="text-text-muted">{index}.</span>
                    <span className={item.value === address ? 'text-text-primary' : 'text-text-muted'}>
                      {shortAddress(item.value)}
                    </span>
                    {item.value === address && (
                      <span className="text-[10px] uppercase tracking-wide text-accent">
                        {t('assets.currentAddress')}
                      </span>
                    )}
                    <span
                      className={`ml-auto whitespace-nowrap ${
                        item.sats > 0 ? 'text-accent' : 'text-text-muted/60'
                      }`}
                    >
                      {item.sats.toLocaleString()} sats
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {addressesOpen && (
              <p className="mt-1.5 text-[11px] leading-relaxed text-text-muted">
                {t('assets.addressesHint')}
              </p>
            )}
          </section>

          <section className="border-t border-border pt-2.5">
            <div className="mb-1 flex items-center gap-1.5">
              <span className="text-[11px] uppercase tracking-[0.14em] text-text-muted">
                {t('assets.backup')}
              </span>
              <Tooltip text={t('assets.secretTip')}>
                <span className="text-[11px] text-text-muted">ⓘ</span>
              </Tooltip>
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
                  {openWallet.seed.map((word, index) => (
                    <li
                      key={word}
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
      </LayerAssetCard>
    </>
  )
}
