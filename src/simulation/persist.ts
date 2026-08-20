import { createInitialChain, type ChainState, type ConfirmedBlock, type Priority, type ProjectedBlock } from './chain'
import { createInitialPlayer, type PendingTx, type PlayerState, type SettledTx, type Wallet, type WalletAddress } from './player'

export const PERSIST_KEY = 'lightning-cafe.sandbox'
export const PERSIST_VERSION = 1

export type PersistBlob = {
  version: number
  player: PlayerState
  chain: ChainState
  secondsLeft: number
}

export type HydratedSandbox = {
  player: PlayerState
  chain: ChainState
  secondsLeft: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && Number.isFinite(value)
}

function isNonNegInt(value: unknown): value is number {
  return isInt(value) && value >= 0
}

function isPriority(value: unknown): value is Priority {
  return value === 'low' || value === 'medium' || value === 'high'
}

function parseAddress(value: unknown): WalletAddress | null {
  if (!isRecord(value) || typeof value.value !== 'string' || !value.value || !isNonNegInt(value.sats)) {
    return null
  }
  return { value: value.value, sats: value.sats }
}

function parseWallet(value: unknown): Wallet | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id || typeof value.name !== 'string') {
    return null
  }
  if (!Array.isArray(value.seed) || value.seed.length !== 12 || value.seed.some((word) => typeof word !== 'string' || !word)) {
    return null
  }
  if (!Array.isArray(value.addresses)) {
    return null
  }
  const addresses: WalletAddress[] = []
  for (const item of value.addresses) {
    const address = parseAddress(item)
    if (!address) {
      return null
    }
    addresses.push(address)
  }
  return {
    id: value.id,
    name: value.name,
    seed: value.seed as string[],
    addresses,
  }
}

function parseTx(value: unknown): PendingTx | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id) {
    return null
  }
  if (value.walletId !== null && typeof value.walletId !== 'string') {
    return null
  }
  if (value.fromWalletId !== null && typeof value.fromWalletId !== 'string') {
    return null
  }
  if (typeof value.address !== 'string' || !value.address || !isNonNegInt(value.sats) || !isInt(value.feeRate)) {
    return null
  }
  if (value.changeAddress !== null && typeof value.changeAddress !== 'string') {
    return null
  }
  if (!isNonNegInt(value.changeSats)) {
    return null
  }
  return {
    id: value.id,
    walletId: value.walletId,
    fromWalletId: value.fromWalletId,
    address: value.address,
    sats: value.sats,
    feeRate: value.feeRate,
    changeAddress: value.changeAddress,
    changeSats: value.changeSats,
  }
}

function parseSettled(value: unknown): SettledTx | null {
  const tx = parseTx(value)
  if (!tx || !isRecord(value) || !isNonNegInt(value.height)) {
    return null
  }
  return { ...tx, height: value.height }
}

function parsePlayer(value: unknown): PlayerState | null {
  if (!isRecord(value) || !isNonNegInt(value.cad) || !isNonNegInt(value.nextWalletId) || !isNonNegInt(value.nextTxId)) {
    return null
  }
  if (!Array.isArray(value.wallets) || !Array.isArray(value.pending) || !Array.isArray(value.settled)) {
    return null
  }
  const wallets: Wallet[] = []
  for (const item of value.wallets) {
    const wallet = parseWallet(item)
    if (!wallet) {
      return null
    }
    wallets.push(wallet)
  }
  const pending: PendingTx[] = []
  for (const item of value.pending) {
    const tx = parseTx(item)
    if (!tx) {
      return null
    }
    pending.push(tx)
  }
  const settled: SettledTx[] = []
  for (const item of value.settled) {
    const tx = parseSettled(item)
    if (!tx) {
      return null
    }
    settled.push(tx)
  }
  return {
    cad: value.cad,
    wallets,
    pending,
    settled,
    nextWalletId: value.nextWalletId,
    nextTxId: value.nextTxId,
  }
}

function parseProjected(value: unknown): ProjectedBlock | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id || !isPriority(value.priority)) {
    return null
  }
  if (!isNonNegInt(value.feeRate) || !isNonNegInt(value.txCount)) {
    return null
  }
  return {
    id: value.id,
    priority: value.priority,
    feeRate: value.feeRate,
    txCount: value.txCount,
  }
}

function parseConfirmed(value: unknown): ConfirmedBlock | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id || typeof value.pool !== 'string' || !value.pool) {
    return null
  }
  if (!isNonNegInt(value.height) || !isNonNegInt(value.feeRate) || !isNonNegInt(value.txCount)) {
    return null
  }
  return {
    id: value.id,
    height: value.height,
    feeRate: value.feeRate,
    pool: value.pool,
    txCount: value.txCount,
  }
}

function parseChain(value: unknown): ChainState | null {
  if (!isRecord(value) || !isNonNegInt(value.marketRate) || !isNonNegInt(value.nextHeight) || !isNonNegInt(value.nextId)) {
    return null
  }
  if (!Array.isArray(value.upcoming) || value.upcoming.length !== 3 || !Array.isArray(value.confirmed)) {
    return null
  }
  const upcoming: ProjectedBlock[] = []
  for (const item of value.upcoming) {
    const block = parseProjected(item)
    if (!block) {
      return null
    }
    upcoming.push(block)
  }
  const confirmed: ConfirmedBlock[] = []
  for (const item of value.confirmed) {
    const block = parseConfirmed(item)
    if (!block) {
      return null
    }
    confirmed.push(block)
  }
  return {
    marketRate: value.marketRate,
    nextHeight: value.nextHeight,
    nextId: value.nextId,
    upcoming,
    confirmed,
  }
}

export function parsePersist(raw: string | null): PersistBlob | null {
  if (!raw) {
    return null
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== PERSIST_VERSION) {
      return null
    }
    const player = parsePlayer(parsed.player)
    const chain = parseChain(parsed.chain)
    if (!player || !chain || !isNonNegInt(parsed.secondsLeft)) {
      return null
    }
    return {
      version: PERSIST_VERSION,
      player,
      chain,
      secondsLeft: parsed.secondsLeft,
    }
  } catch {
    return null
  }
}

/** Keep keys and CAD; drop on-chain balances so a Café catch-up cannot credit twice. */
export function playerForRoomReload(player: PlayerState): PlayerState {
  return {
    ...player,
    pending: [],
    settled: [],
    wallets: player.wallets.map((wallet) => ({
      ...wallet,
      addresses: wallet.addresses.map((address) => ({ ...address, sats: 0 })),
    })),
  }
}

export function hydrateSandbox(raw: string | null, roomId: string | null, blockInterval: number): HydratedSandbox {
  const stored = parsePersist(raw)
  if (roomId) {
    return {
      player: stored ? playerForRoomReload(stored.player) : createInitialPlayer(),
      chain: createInitialChain(),
      secondsLeft: 60,
    }
  }
  if (!stored) {
    return {
      player: createInitialPlayer(),
      chain: createInitialChain(),
      secondsLeft: blockInterval,
    }
  }
  return {
    player: stored.player,
    chain: stored.chain,
    secondsLeft: Math.min(stored.secondsLeft, blockInterval),
  }
}

export function persistBlob(player: PlayerState, chain: ChainState, secondsLeft: number): PersistBlob {
  return {
    version: PERSIST_VERSION,
    player,
    chain,
    secondsLeft,
  }
}

type StorageLike = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

function browserStorage(): StorageLike | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function readPersistRaw(storage: StorageLike | null = browserStorage()): string | null {
  if (!storage) {
    return null
  }
  try {
    return storage.getItem(PERSIST_KEY)
  } catch {
    return null
  }
}

export function writePersist(blob: PersistBlob, storage: StorageLike | null = browserStorage()): void {
  if (!storage) {
    return
  }
  try {
    storage.setItem(PERSIST_KEY, JSON.stringify(blob))
  } catch {
    // quota / private mode: keep the live sim, skip the save
  }
}

export function clearPersist(storage: StorageLike | null = browserStorage()): void {
  if (!storage) {
    return
  }
  try {
    storage.removeItem(PERSIST_KEY)
  } catch {
    // ignore
  }
}
