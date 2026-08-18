import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { looksLikeNpub, totalSats } from '../simulation/player'
import { useSimulation } from '../simulation/SimulationProvider'

type AssetsPanelProps = {
  onMessage: (message: string) => void
}

export function AssetsPanel({ onMessage }: AssetsPanelProps) {
  const { t } = useTranslation()
  const { player, btcPriceCad, addWallet, saveNpub, buyBtc } = useSimulation()
  const [npubDraft, setNpubDraft] = useState(player.npub)
  const [selectedWalletId, setSelectedWalletId] = useState(player.wallets[0]?.id ?? '')

  const selectedId = player.wallets.some((wallet) => wallet.id === selectedWalletId)
    ? selectedWalletId
    : (player.wallets[0]?.id ?? '')

  function handleAddWallet() {
    const name = t('assets.walletName', { number: player.nextWalletId })
    addWallet(name)
    onMessage(t('assets.walletCreated', { name }))
  }

  function handleSaveNpub() {
    saveNpub(npubDraft)
    onMessage(t('services.npubSaved'))
  }

  function handleBuy() {
    if (!selectedId) {
      onMessage(t('services.needWallet'))
      return
    }
    if (!looksLikeNpub(player.npub) && !looksLikeNpub(npubDraft)) {
      onMessage(t('services.needNpub'))
      return
    }
    if (player.cad < 100) {
      onMessage(t('services.needCad'))
      return
    }

    saveNpub(npubDraft)
    try {
      buyBtc(selectedId, 100, npubDraft)
      onMessage(t('services.buyOk'))
    } catch {
      onMessage(t('services.needNpub'))
    }
  }

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-y-auto border-b border-border bg-bg-secondary md:w-80 md:border-r md:border-b-0">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-text-muted">
          {t('account.title')}
        </h2>
      </div>

      <div className="space-y-4 p-4">
        <div className="rounded-md border border-border bg-bg-panel px-3 py-3">
          <p className="font-mono text-lg text-text-primary">
            {player.cad.toLocaleString()} $ CAD
          </p>
          <p className="mt-1 font-mono text-sm text-accent">
            {totalSats(player).toLocaleString()} sats
          </p>
          <p className="mt-2 text-xs text-text-muted">
            {t('services.price', { price: btcPriceCad.toLocaleString() })}
          </p>
        </div>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t('services.title')}
          </h3>
          <input
            value={npubDraft}
            onChange={(event) => setNpubDraft(event.target.value)}
            onBlur={handleSaveNpub}
            placeholder={t('services.npubPlaceholder')}
            className="mb-2 w-full rounded-md border border-border bg-bg-primary px-3 py-2 font-mono text-xs text-text-primary outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={handleBuy}
            className="w-full rounded-md border border-border bg-bg-panel px-3 py-2 text-left text-sm transition hover:border-accent/60"
          >
            {t('services.buy100')}
          </button>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            {t('assets.wallets')}
          </h3>
          <div className="space-y-2">
            {player.wallets.map((wallet) => (
              <button
                key={wallet.id}
                type="button"
                onClick={() => setSelectedWalletId(wallet.id)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                  wallet.id === selectedId
                    ? 'border-accent bg-bg-panel'
                    : 'border-border bg-bg-panel hover:border-accent/60'
                }`}
              >
                <span className="block font-medium">{wallet.name}</span>
                <span className="block font-mono text-xs text-accent">
                  {wallet.sats.toLocaleString()} sats
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleAddWallet}
            className="mt-2 w-full rounded-md border border-dashed border-border bg-bg-panel px-3 py-2 text-left text-sm transition hover:border-accent/60"
          >
            {t('assets.addWallet')}
          </button>
        </section>

        <button
          type="button"
          disabled
          className="w-full rounded-md border border-dashed border-border bg-bg-panel px-3 py-2 text-left text-sm"
        >
          {t('assets.addNode')}
        </button>
      </div>
    </aside>
  )
}
