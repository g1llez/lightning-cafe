import { useState, type ClipboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import {
  findWalletBySeed,
  parseSeed,
  pendingSats,
  pendingSatsForAddress,
  seedPhrase,
  shortAddress,
  tokenizeSeedInput,
  walletSats,
  type Wallet,
} from '../simulation/player'
import { txsForAddress } from '../simulation/inspect'
import { sandboxBlockInterval } from '../simulation/chain'
import {
  ownNodeProgressPercent,
  isOwnNodeReady,
  randomNodeName,
  resolveOwnNodeName,
} from '../simulation/nodes'
import { useSimulation } from '../simulation/SimulationProvider'
import { LayerAssetCard } from './LayerAssetCard'
import { Modal } from './Modal'
import { ReceiveModal } from './ReceiveModal'
import { SendModal } from './SendModal'
import { InfoMark, Tooltip } from './Tooltip'
import { TxDetailTip } from './TxInspect'

type SeedStep = 'hidden' | 'warned' | 'shown'

function emptySeedWords(): string[] {
  return Array.from({ length: 12 }, () => '')
}

type WalletCardProps = {
  onMessage: (message: string) => void
  onSatsSent: (label: string, target: string, from?: string) => void
}

export function WalletCard({ onMessage, onSatsSent }: WalletCardProps) {
  const { t } = useTranslation()
  const {
    player,
    chain,
    secondsLeft,
    addWallet,
    renameWallet,
    newAddress,
    restoreWallet,
    deleteWallet,
    addOwnNode,
    removeOwnNode,
    renameOwnNode,
  } = useSimulation()
  const tip = chain.confirmed[0]?.height ?? chain.nextHeight - 1
  const blockFill = 1 - secondsLeft / sandboxBlockInterval()
  const ownReady = player.ownNode ? isOwnNodeReady(player.ownNode, tip) : false
  const syncPercent = player.ownNode
    ? ownNodeProgressPercent(player.ownNode, tip, ownReady ? 0 : blockFill)
    : 0
  const [openWalletId, setOpenWalletId] = useState('')
  const [justCreatedId, setJustCreatedId] = useState('')
  const [sendWalletId, setSendWalletId] = useState('')
  const [openNode, setOpenNode] = useState(false)
  const [namingNode, setNamingNode] = useState(false)
  const [nodeNameDefault, setNodeNameDefault] = useState('')
  const [nodeNameDraft, setNodeNameDraft] = useState('')
  const [renamingNode, setRenamingNode] = useState(false)
  const [confirmDeleteNode, setConfirmDeleteNode] = useState(false)
  const [editingNodeName, setEditingNodeName] = useState('')
  const [receiveWalletId, setReceiveWalletId] = useState('')
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [restoreWords, setRestoreWords] = useState<string[]>(emptySeedWords)
  const [editingName, setEditingName] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [seedStep, setSeedStep] = useState<SeedStep>('hidden')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const sendWallet = player.wallets.find((wallet) => wallet.id === sendWalletId)
  const receiveWallet = player.wallets.find((wallet) => wallet.id === receiveWalletId)
  const createdWallet = player.wallets.find((wallet) => wallet.id === justCreatedId)

  function toggleDetail(walletId: string) {
    if (openWalletId === walletId) {
      setOpenWalletId('')
      setRenaming(false)
      setSeedStep('hidden')
      setConfirmDelete(false)
      return
    }
    setOpenWalletId(walletId)
    setRenaming(false)
    setSeedStep('hidden')
    setConfirmDelete(false)
  }

  function handleAddWallet() {
    const id = `w-${player.nextWalletId}`
    addWallet(t('assets.walletName', { number: player.nextWalletId }))
    setJustCreatedId(id)
    setOpenWalletId(id)
    setRenaming(false)
    setSeedStep('hidden')
  }

  function handleAddNode() {
    if (player.ownNode) {
      onMessage(t('assets.nodeExists'))
      return
    }
    const fallback = randomNodeName()
    setNodeNameDefault(fallback)
    setNodeNameDraft(fallback)
    setNamingNode(true)
  }

  function closeNameNode() {
    setNamingNode(false)
    setNodeNameDraft('')
    setNodeNameDefault('')
  }

  function commitCreateNode() {
    try {
      addOwnNode(resolveOwnNodeName(nodeNameDraft, nodeNameDefault))
      setOpenNode(true)
      setRenamingNode(false)
      setConfirmDeleteNode(false)
      closeNameNode()
      onMessage(t('assets.nodeCreated'))
    } catch {
      onMessage(t('assets.nodeExists'))
      closeNameNode()
    }
  }

  function toggleNodeDetail() {
    if (openNode) {
      setOpenNode(false)
      setRenamingNode(false)
      setConfirmDeleteNode(false)
      return
    }
    setOpenNode(true)
  }

  function handleDeleteNode() {
    removeOwnNode()
    setOpenNode(false)
    setRenamingNode(false)
    setConfirmDeleteNode(false)
    onMessage(t('assets.nodeDeleted'))
  }

  function commitRenameNode() {
    try {
      renameOwnNode(editingNodeName)
      onMessage(t('assets.nodeRenamed'))
    } catch {
      onMessage(t('assets.nodeRenameFailed'))
    }
    setRenamingNode(false)
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

  async function copySeed(words: string[]) {
    try {
      await navigator.clipboard.writeText(seedPhrase(words))
      onMessage(t('assets.seedCopied'))
    } catch {
      onMessage(seedPhrase(words))
    }
  }

  async function pasteRestore() {
    try {
      const text = await navigator.clipboard.readText()
      const tokens = tokenizeSeedInput(text)
      if (tokens.length === 0) {
        onMessage(t('assets.pasteSeedFailed'))
        return
      }
      fillRestoreWords(0, tokens)
    } catch {
      onMessage(t('assets.pasteSeedFailed'))
    }
  }

  function handleDelete(walletId: string) {
    try {
      deleteWallet(walletId)
      setOpenWalletId('')
      setConfirmDelete(false)
      onMessage(t('assets.walletDeleted'))
    } catch {
      onMessage(t('assets.walletRenameFailed'))
    }
  }

  function handleRestore() {
    const phrase = restoreWords.join(' ')
    try {
      restoreWallet(t('assets.walletName', { number: player.nextWalletId }), phrase)
      onMessage(t('assets.restoreCreated'))
      setRestoreOpen(false)
      setRestoreWords(emptySeedWords())
    } catch (error) {
      const code = error instanceof Error ? error.message : ''
      if (code === 'seed-exists') {
        const existed = findWalletBySeed(player, parseSeed(phrase))
        onMessage(t('assets.restoreExists', { wallet: existed?.name ?? '' }))
        setRestoreOpen(false)
        setRestoreWords(emptySeedWords())
        return
      }
      onMessage(t('assets.restoreInvalid'))
    }
  }

  function fillRestoreWords(index: number, tokens: string[]) {
    setRestoreWords((current) => {
      const next = [...current]
      tokens.forEach((word, offset) => {
        const at = index + offset
        if (at < 12) {
          next[at] = word
        }
      })
      return next
    })
  }

  function handleRestorePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    const tokens = tokenizeSeedInput(event.clipboardData.getData('text'))
    if (tokens.length <= 1) {
      return
    }
    event.preventDefault()
    fillRestoreWords(index, tokens)
  }

  function handleRestoreWordChange(index: number, value: string) {
    const tokens = tokenizeSeedInput(value)
    if (tokens.length > 1) {
      fillRestoreWords(index, tokens)
      return
    }
    setRestoreWords((current) => {
      const next = [...current]
      next[index] = value.replace(/\s+/g, '')
      return next
    })
  }

  function renderExpand(wallet: Wallet) {
    const utxos = wallet.addresses.filter(
      (item) => item.sats > 0 || pendingSatsForAddress(player, item.value) > 0,
    )

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
              className="self-start inline-flex items-center gap-1 px-0.5 text-[11px] text-text-muted transition hover:text-accent"
            >
              <PencilIcon />
              {t('assets.rename')}
            </button>
          )}

          {confirmDelete ? (
            <div className="rounded-md border border-danger/60 bg-danger/10 px-2.5 py-2">
              <p className="text-[11px] leading-relaxed text-text-primary">{t('assets.deleteConfirm')}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDelete(wallet.id)}
                  className="rounded-md border border-danger/60 px-2 py-1 text-[11px] text-text-primary transition hover:bg-danger/20"
                >
                  {t('assets.deleteConfirmYes')}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="px-1 text-[11px] text-text-muted transition hover:text-text-primary"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="self-start inline-flex items-center gap-1 px-0.5 text-[11px] text-text-muted transition hover:text-danger"
            >
              <TrashIcon />
              {t('assets.deleteWallet')}
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
                  const funding = txsForAddress(player, item.value)[0]
                  const addressLabel = shortAddress(item.value)
                  return (
                    <li key={item.value} className="flex items-baseline gap-2 font-mono text-[11px]">
                      <span className="text-text-muted">{index + 1}.</span>
                      {funding ? (
                        <Tooltip
                          side="top"
                          text={
                            <TxDetailTip
                              player={player}
                              tx={funding}
                              sats={waiting > 0 ? waiting : item.sats}
                              address={item.value}
                            />
                          }
                        >
                          <span className="text-text-primary">{addressLabel}</span>
                        </Tooltip>
                      ) : (
                        <span className="text-text-primary">{addressLabel}</span>
                      )}
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
                <div className="mt-1.5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void copySeed(wallet.seed)}
                    className="rounded-md border border-border px-2 py-1 text-[11px] text-text-muted transition hover:border-accent/60 hover:text-text-primary"
                  >
                    {t('assets.copySeed')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSeedStep('hidden')}
                    className="rounded-md border border-border px-2 py-1 text-[11px] text-text-muted transition hover:border-accent/60 hover:text-text-primary"
                  >
                    {t('assets.hideSecret')}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    )
  }

  return (
    <>
      {namingNode && (
        <Modal
          title={t('assets.nameNodeTitle')}
          subtitle={t('assets.addNodeTip')}
          closeLabel={t('common.close')}
          onClose={closeNameNode}
        >
          <div className="flex flex-col gap-3">
            <p className="text-[12px] leading-relaxed text-text-muted">{t('assets.nameNodeHint')}</p>
            <input
              autoFocus
              value={nodeNameDraft}
              maxLength={32}
              spellCheck={false}
              autoComplete="off"
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => setNodeNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  commitCreateNode()
                }
              }}
              className="w-full rounded-md border border-border bg-bg-primary px-2 py-1.5 font-mono text-sm outline-none focus:border-accent"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeNameNode}
                className="flex-1 rounded-md border border-border px-3 py-2 text-sm text-text-muted transition hover:border-accent/60 hover:text-text-primary"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={commitCreateNode}
                className="flex-1 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg-primary transition hover:brightness-110"
              >
                {t('assets.nameNodeConfirm')}
              </button>
            </div>
          </div>
        </Modal>
      )}
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void copySeed(createdWallet.seed)}
                className="flex-1 rounded-md border border-border px-3 py-2 text-sm text-text-primary transition hover:border-accent/60"
              >
                {t('assets.copySeed')}
              </button>
              <button
                type="button"
                onClick={() => setJustCreatedId('')}
                className="flex-1 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg-primary transition hover:brightness-110"
              >
                {t('assets.createdOk')}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {restoreOpen && (
        <Modal
          title={t('assets.restoreTitle')}
          subtitle={t('assets.restoreSubtitle')}
          closeLabel={t('common.close')}
          onClose={() => {
            setRestoreOpen(false)
            setRestoreWords(emptySeedWords())
          }}
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] leading-relaxed text-text-muted">{t('assets.restoreHint')}</p>
              <button
                type="button"
                onClick={() => void pasteRestore()}
                className="shrink-0 rounded-md border border-border px-2 py-1 text-[11px] text-text-muted transition hover:border-accent/60 hover:text-text-primary"
              >
                {t('assets.pasteSeed')}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {restoreWords.map((word, index) => (
                <label
                  key={index}
                  className="flex items-center gap-1 rounded border border-border bg-bg-primary px-1.5 py-1 focus-within:border-accent"
                >
                  <span className="w-3 shrink-0 text-right font-mono text-[10px] text-text-muted">
                    {index + 1}
                  </span>
                  <input
                    value={word}
                    data-testid={`restore-word-${index}`}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={t('assets.restorePlaceholder')}
                    onChange={(event) => handleRestoreWordChange(index, event.target.value)}
                    onPaste={(event) => handleRestorePaste(index, event)}
                    className="min-w-0 flex-1 bg-transparent font-mono text-[11px] outline-none"
                  />
                </label>
              ))}
            </div>
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
      <div
        data-fly="wallet"
        className="absolute top-16 left-4 z-10 flex w-[min(20rem,calc(100%-2rem))] flex-col gap-3 md:top-20 md:left-6"
      >
        <LayerAssetCard
          title={t('assets.wallets')}
          action={
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setRestoreWords(emptySeedWords())
                  setRestoreOpen(true)
                }}
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

        <div data-fly="node-table">
        <LayerAssetCard
          title={t('assets.nodes')}
          action={
            <Tooltip text={t('assets.addNodeTip')} side="bottom">
              <button
                type="button"
                onClick={handleAddNode}
                disabled={Boolean(player.ownNode)}
                aria-label={t('assets.addNode')}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-accent/70 bg-bg-panel text-accent transition hover:bg-accent/10 disabled:cursor-not-allowed disabled:opacity-40"
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
            </Tooltip>
          }
        >
          {!player.ownNode ? (
            <p className="px-2 py-2 text-sm text-text-muted">{t('assets.noNodes')}</p>
          ) : (
            <div className="border-t border-border first:border-t-0">
              <div
                onClick={toggleNodeDetail}
                className="flex cursor-pointer items-center hover:bg-bg-primary/40"
              >
                <div className="min-w-0 flex-1 truncate px-2 py-2 text-sm font-medium">
                  {player.ownNode.name}
                </div>
                {!ownReady && (
                  <div className="whitespace-nowrap px-2 py-2 text-right font-mono text-xs text-text-muted">
                    <Tooltip text={t('layers.nodeSyncingTip')} side="top">
                      <span className="cursor-help">
                        {t('assets.nodeSyncing', { percent: syncPercent })}
                      </span>
                    </Tooltip>
                  </div>
                )}
              </div>
              {openNode && (
                <div className="border-t border-border bg-bg-primary/30 px-2 py-2">
                  <div className="flex flex-col gap-2.5">
                    {renamingNode ? (
                      <input
                        autoFocus
                        value={editingNodeName}
                        onChange={(event) => setEditingNodeName(event.target.value)}
                        onBlur={commitRenameNode}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.currentTarget.blur()
                          }
                          if (event.key === 'Escape') {
                            setRenamingNode(false)
                          }
                        }}
                        className="w-full rounded border border-accent bg-bg-primary px-2 py-1 text-sm outline-none"
                        maxLength={32}
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNodeName(player.ownNode!.name)
                          setRenamingNode(true)
                        }}
                        title={t('assets.rename')}
                        aria-label={t('assets.rename')}
                        className="self-start inline-flex items-center gap-1 px-0.5 text-[11px] text-text-muted transition hover:text-accent"
                      >
                        <PencilIcon />
                        {t('assets.rename')}
                      </button>
                    )}
                    {confirmDeleteNode ? (
                      <div className="rounded-md border border-danger/60 bg-danger/10 px-2.5 py-2">
                        <p className="text-[11px] leading-relaxed text-text-primary">
                          {t('assets.deleteNodeConfirm')}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleDeleteNode}
                            className="rounded-md border border-danger/60 px-2 py-1 text-[11px] text-text-primary transition hover:bg-danger/20"
                          >
                            {t('assets.deleteConfirmYes')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteNode(false)}
                            className="px-1 text-[11px] text-text-muted transition hover:text-text-primary"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteNode(true)}
                        className="self-start inline-flex items-center gap-1 px-0.5 text-[11px] text-text-muted transition hover:text-danger"
                      >
                        <TrashIcon />
                        {t('assets.deleteNode')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </LayerAssetCard>
        </div>
      </div>
    </>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
      <path
        d="M11.6 2.4l2 2L5.2 12.8H3.2v-2L11.6 2.4z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
      <path
        d="M3.5 5h9M6.5 5V3.6h3V5M5 5.5l.6 7h4.8l.6-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
