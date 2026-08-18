import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { formatCountdown, toneForFee, type ConfirmedBlock, type Priority, type ProjectedBlock } from '../simulation/chain'
import { looksLikeNpub } from '../simulation/player'
import { useSimulation } from '../simulation/SimulationProvider'
import { LayerAssetCard } from './LayerAssetCard'
import { Tooltip } from './Tooltip'

type BlockTileProps = {
  label: string
  feeRate: number
  txCount: number
  blockTip: string
  upcoming?: boolean
  highlight?: boolean
}

function BlockTile({ label, feeRate, txCount, blockTip, upcoming = false, highlight = false }: BlockTileProps) {
  const { t } = useTranslation()

  return (
    <div className="flex w-24 shrink-0 flex-col items-center gap-1">
      <Tooltip text={blockTip}>
        <div
          className={`h-16 w-16 rounded-md ${toneForFee(feeRate)} ${
            upcoming ? 'border border-dashed border-text-muted/50' : ''
          } ${highlight ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-secondary' : ''}`}
        />
      </Tooltip>
      <span className="text-center text-xs font-medium text-text-primary">{label}</span>
      <span className="text-center text-[11px] text-text-muted">{t('layers.txCount', { txs: txCount.toLocaleString() })}</span>
      <Tooltip text={t('layers.feeTip')}>
        <span className="font-mono text-xs text-accent">{feeRate} sat/vB</span>
      </Tooltip>
    </div>
  )
}

type BitcoinLayerProps = {
  onMessage: (message: string) => void
}

export function BitcoinLayer({ onMessage }: BitcoinLayerProps) {
  const { t } = useTranslation()
  const { chain, secondsLeft, player, addWallet, buyBtc, saveNpub } = useSimulation()
  const [plusOpen, setPlusOpen] = useState(false)
  const [selectedWalletId, setSelectedWalletId] = useState(player.wallets[0]?.id ?? '')
  const [npubDraft, setNpubDraft] = useState(player.npub)

  const selectedId = player.wallets.some((wallet) => wallet.id === selectedWalletId)
    ? selectedWalletId
    : (player.wallets[0]?.id ?? '')

  function priorityLabel(priority: Priority) {
    return t(`layers.priority.${priority}`)
  }

  function handleAddWallet() {
    const name = t('assets.walletName', { number: player.nextWalletId })
    addWallet(name)
    onMessage(t('assets.walletCreated', { name }))
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
      onMessage(t('services.needFunds'))
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
    <section className="relative h-[22rem] shrink-0 overflow-hidden border-t border-border bg-bg-secondary">
      <div className="absolute inset-x-0 top-0 z-10 px-4 py-3 text-center">
        <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{t('layers.bitcoin')}</h2>
        <p className="mt-1 font-mono text-sm text-accent">
          <Tooltip text={t('layers.nextBlockTip')}>
            <span>{t('layers.nextBlockIn', { time: formatCountdown(secondsLeft) })}</span>
          </Tooltip>
        </p>
      </div>

      <div className="flex h-full items-end justify-center px-4 pb-4 pt-20">
        <div className="flex w-full max-w-5xl flex-col items-stretch gap-4 md:flex-row md:items-start md:justify-center">
          <div className="flex-1">
            <p className="mb-3 text-center text-sm font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t('layers.mempool')}
            </p>
            <div className="flex items-center justify-center gap-3">
              {chain.upcoming.map((block: ProjectedBlock) => (
                <BlockTile
                  key={block.id}
                  label={priorityLabel(block.priority)}
                  feeRate={block.feeRate}
                  txCount={block.txCount}
                  upcoming
                  highlight={block.priority === 'high'}
                  blockTip={t('layers.upcomingBlockTip', {
                    priority: priorityLabel(block.priority),
                    txs: block.txCount.toLocaleString(),
                  })}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-center md:min-h-[132px] md:flex-col md:px-4">
            <div className="h-px w-24 bg-border md:h-24 md:w-px" />
            <span className="px-2 font-mono text-xs uppercase tracking-widest text-accent md:py-2">
              {t('layers.now')}
            </span>
            <div className="h-px w-24 bg-border md:h-24 md:w-px" />
          </div>

          <div className="flex-1">
            <p className="mb-3 text-center text-sm font-semibold uppercase tracking-[0.16em] text-text-muted">
              {t('layers.confirmed')}
            </p>
            <div className="flex items-center justify-center gap-3 overflow-x-auto pb-1">
              {chain.confirmed.map((block: ConfirmedBlock) => (
                <BlockTile
                  key={block.id}
                  label={`#${block.height}`}
                  feeRate={block.feeRate}
                  txCount={block.txCount}
                  blockTip={t('layers.confirmedBlockTip', {
                    height: block.height,
                    pool: block.pool,
                    txs: block.txCount.toLocaleString(),
                  })}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <LayerAssetCard
        title={t('assets.wallets')}
        plusLabel={t('services.title')}
        plusOpen={plusOpen}
        onPlusToggle={() => setPlusOpen((value) => !value)}
        plusItems={[
          { label: t('assets.addWallet'), onClick: handleAddWallet },
          { label: t('services.buy100'), onClick: handleBuy },
        ]}
        extra={
          <input
            value={npubDraft}
            onChange={(event) => setNpubDraft(event.target.value)}
            placeholder={t('services.npubPlaceholder')}
            className="mt-2 w-full rounded-md border border-border bg-bg-primary px-2 py-1.5 font-mono text-xs outline-none focus:border-accent"
          />
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
                  onClick={() => setSelectedWalletId(wallet.id)}
                  className={`cursor-pointer border-t border-border first:border-t-0 ${
                    wallet.id === selectedId ? 'text-accent' : ''
                  }`}
                >
                  <td className="px-2 py-1.5">{wallet.name}</td>
                  <td className="px-2 py-1.5 font-mono text-xs">
                    {wallet.sats.toLocaleString()} sats
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </LayerAssetCard>
    </section>
  )
}
