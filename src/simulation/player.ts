import {
  INITIAL_MARKET_RATE,
  clearsThisBlock,
  estimateFeeSats,
  feeZone,
  marketQuotes,
  seededRandom,
  type Priority,
} from './chain'

export const STARTING_CAD = 1_000
export const BTC_PRICE_CAD = 100_000
export const SATS_PER_BTC = 100_000_000
export const PUBLIC_ADDRESS_PREFIX = 'lc1q'
/** Cut the exchange keeps on a buy. Not the miner fee — they pick sat/vB themselves. */
export const EXCHANGE_SPREAD = 0.01

const SANDBOX_WORDS = [
  'cafe',
  'lightning',
  'sandbox',
  'chatoshi',
  'espresso',
  'mempool',
  'foghash',
  'riverbit',
  'satsmith',
  'stormnonce',
  'cedar',
  'aurora',
  'beacon',
  'copper',
  'lantern',
  'maple',
  'umbrel',
  'invoice',
  'channel',
  'inbound',
  'outbound',
  'routing',
  'watchtower',
  'hashrate',
  'nonce',
  'halving',
  'orange',
  'quietasic',
  'satflow',
  'blockbarn',
  'northhash',
  'pinecone',
] as const

const ADDRESS_ALPHABET = 'acdefghjklmnpqrstuvwxyz023456789'
const ADDRESS_BODY_LENGTH = 34

/** Money sits on an address, not on the wallet: that is how a real wallet works. */
export type WalletAddress = {
  value: string
  sats: number
}

export type Wallet = {
  id: string
  name: string
  seed: string[]
  addresses: WalletAddress[]
}

/** A tx sits in the mempool at a fixed sat/vB until the market lets it in. */
export type PendingTx = {
  id: string
  /** Destination wallet, or null when the address is not one of ours. */
  walletId: string | null
  /** Source wallet for a send; null when an exchange is paying you. */
  fromWalletId: string | null
  address: string
  sats: number
  feeRate: number
  /** Leftover from spent UTXOs; lands when the tx confirms. */
  changeAddress: string | null
  changeSats: number
}

export type SettledTx = PendingTx & {
  height: number
}

export type PlayerState = {
  cad: number
  wallets: Wallet[]
  pending: PendingTx[]
  settled: SettledTx[]
  nextWalletId: number
  nextTxId: number
}

export function createInitialPlayer(): PlayerState {
  return {
    cad: STARTING_CAD,
    wallets: [],
    pending: [],
    settled: [],
    nextWalletId: 1,
    nextTxId: 1,
  }
}

export function walletSats(wallet: Wallet): number {
  return wallet.addresses.reduce((sum, address) => sum + address.sats, 0)
}

export function totalSats(player: PlayerState): number {
  return player.wallets.reduce((sum, wallet) => sum + walletSats(wallet), 0)
}

export function pendingSats(player: PlayerState, walletId?: string): number {
  return player.pending.reduce((sum, tx) => {
    const payment = !walletId || tx.walletId === walletId ? tx.sats : 0
    const change = !walletId || tx.fromWalletId === walletId ? tx.changeSats : 0
    return sum + payment + change
  }, 0)
}

export function pendingSatsForAddress(player: PlayerState, address: string): number {
  const wanted = normalizeAddress(address)
  return player.pending.reduce((sum, tx) => {
    const payment = tx.address === wanted ? tx.sats : 0
    const change = tx.changeAddress === wanted ? tx.changeSats : 0
    return sum + payment + change
  }, 0)
}

/** The badge follows the current zone, so a cheap bid can jump lanes if the market drops. */
export function pendingForZone(
  player: PlayerState,
  marketRate: number,
  zone: Priority,
): PendingTx[] {
  return player.pending.filter((tx) => feeZone(tx.feeRate, marketRate) === zone)
}

export function isOwnTx(
  player: PlayerState,
  tx: { walletId: string | null; fromWalletId: string | null },
): boolean {
  return player.wallets.some((wallet) => wallet.id === tx.walletId || wallet.id === tx.fromWalletId)
}

export function ownPendingForZone(
  player: PlayerState,
  marketRate: number,
  zone: Priority,
): PendingTx[] {
  return pendingForZone(player, marketRate, zone).filter((tx) => isOwnTx(player, tx))
}

export function pendingCountByZone(
  player: PlayerState,
  marketRate: number,
  zone: Priority,
): number {
  return pendingForZone(player, marketRate, zone).length
}

export function settledInBlock(player: PlayerState, height: number): SettledTx[] {
  return player.settled.filter((tx) => tx.height === height)
}

export function ownSettledInBlock(player: PlayerState, height: number): SettledTx[] {
  return settledInBlock(player, height).filter((tx) => isOwnTx(player, tx))
}

export function cadToSats(cad: number, priceCad = BTC_PRICE_CAD): number {
  return Math.floor((cad / priceCad) * SATS_PER_BTC)
}

export function satsToCad(sats: number, priceCad = BTC_PRICE_CAD): number {
  return (sats / SATS_PER_BTC) * priceCad
}

export function formatCad(cad: number): string {
  const rounded = Math.round(cad * 100) / 100
  if (Number.isInteger(rounded)) {
    return rounded.toLocaleString()
  }
  return rounded.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function exchangeSpreadCad(cadAmount: number): number {
  return Math.max(0, Math.round(cadAmount * EXCHANGE_SPREAD))
}

export function createWallet(
  player: PlayerState,
  name: string,
  random: () => number = Math.random,
): PlayerState {
  return addWalletFromSeed(player, name, walletSeed(random))
}

function addWalletFromSeed(player: PlayerState, name: string, seed: string[]): PlayerState {
  const id = `w-${player.nextWalletId}`
  const wallet: Wallet = {
    id,
    name,
    seed,
    addresses: [{ value: walletAddress(seed, 0), sats: 0 }],
  }

  return {
    ...player,
    nextWalletId: player.nextWalletId + 1,
    wallets: [...player.wallets, wallet],
  }
}

/** Strip list numbers people copy from the backup grid: `1. cafe`, `1-cafe`, `2) cafe`. */
export function tokenizeSeedInput(value: string): string[] {
  return value
    .trim()
    .toLowerCase()
    .split(/[\s,;]+/)
    .map((token) => token.replace(/^#?\d{1,2}[-.)]+/, ''))
    .filter((token) => token.length > 0 && !/^\d+$/.test(token))
}

export function parseSeed(value: string): string[] {
  const words = tokenizeSeedInput(value)
  if (words.length !== 12) {
    throw new Error('seed-invalid')
  }
  return words
}

export function findWalletBySeed(player: PlayerState, seed: string[]): Wallet | undefined {
  const phrase = seedPhrase(seed)
  return player.wallets.find((wallet) => seedPhrase(wallet.seed) === phrase)
}

/**
 * The 12 words recover the keys, not a copy of the balance. If this seed is
 * already on the list we keep that wallet; otherwise we derive a fresh empty one.
 */
export function restoreWallet(player: PlayerState, name: string, words: string): PlayerState {
  const seed = parseSeed(words)
  if (findWalletBySeed(player, seed)) {
    throw new Error('seed-exists')
  }
  return addWalletFromSeed(player, name, seed)
}

/** Every address comes from the secret those 12 words write down. */
export function walletAddress(seed: string[], index: number): string {
  let state = fingerprint(`${seed.join(' ')}/${index}`)
  let body = ''

  while (body.length < ADDRESS_BODY_LENGTH) {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
    body += ADDRESS_ALPHABET[state % ADDRESS_ALPHABET.length]
  }

  return `${PUBLIC_ADDRESS_PREFIX}${body}`
}

function fingerprint(input: string): number {
  let value = 2_166_136_261
  for (const char of input) {
    value ^= char.charCodeAt(0)
    value = Math.imul(value, 16_777_619)
  }
  return value >>> 0
}

export function receiveAddress(wallet: Wallet): string {
  return wallet.addresses[wallet.addresses.length - 1].value
}

export type SendPlan = {
  payment: number
  fee: number
  change: number
  changeAddress: string | null
}

/** Coin-selects whole address piles. Change goes to the next unused address. */
export function planSend(wallet: Wallet, sats: number, feeRate: number): SendPlan {
  const fee = estimateFeeSats(feeRate)
  const payment = Math.max(0, sats)
  const need = payment + fee
  if (payment <= 0 || need > walletSats(wallet)) {
    return { payment, fee, change: 0, changeAddress: null }
  }

  const { inputTotal, spent } = pickInputs(wallet, need)
  return {
    payment,
    fee,
    change: inputTotal - need,
    changeAddress: inputTotal > need ? nextChangeAddress(wallet, spent) : null,
  }
}

function pickInputs(wallet: Wallet, need: number): { inputTotal: number; spent: string[] } {
  let left = need
  const spent: string[] = []
  let inputTotal = 0

  for (const item of wallet.addresses) {
    if (left <= 0) {
      break
    }
    if (item.sats <= 0) {
      continue
    }
    spent.push(item.value)
    inputTotal += item.sats
    left -= item.sats
  }

  return { inputTotal, spent }
}

function nextChangeAddress(wallet: Wallet, spent: string[]): string {
  const spare = wallet.addresses.find((item) => item.sats === 0 && !spent.includes(item.value))
  return spare?.value ?? walletAddress(wallet.seed, wallet.addresses.length)
}

export function createAddress(player: PlayerState, walletId: string): PlayerState {
  const wallet = player.wallets.find((item) => item.id === walletId)
  if (!wallet) {
    throw new Error('wallet-missing')
  }

  const next: WalletAddress = {
    value: walletAddress(wallet.seed, wallet.addresses.length),
    sats: 0,
  }

  return {
    ...player,
    wallets: player.wallets.map((item) =>
      item.id === walletId ? { ...item, addresses: [...item.addresses, next] } : item,
    ),
  }
}

/**
 * Sandbox stand-in for BIP39: a real wallet draws entropy, then encodes it as
 * words. Here we pick 12 sandbox words; they still stand in for that secret.
 */
export function walletSeed(random: () => number = Math.random): string[] {
  const pool = [...SANDBOX_WORDS]
  const seed: string[] = []

  while (seed.length < 12) {
    const index = Math.min(Math.floor(random() * pool.length), pool.length - 1)
    const [word] = pool.splice(index, 1)
    seed.push(word)
  }

  return seed
}

export function seedPhrase(seed: string[]): string {
  return seed.join(' ')
}

export function shortAddress(address: string): string {
  if (address.length <= 14) {
    return address
  }
  return `${address.slice(0, 6)}…${address.slice(-6)}`
}

export function renameWallet(player: PlayerState, walletId: string, name: string): PlayerState {
  const trimmed = name.trim()
  if (!trimmed) {
    throw new Error('name-empty')
  }

  const wallet = player.wallets.find((item) => item.id === walletId)
  if (!wallet) {
    throw new Error('wallet-missing')
  }

  return {
    ...player,
    wallets: player.wallets.map((item) =>
      item.id === walletId ? { ...item, name: trimmed } : item,
    ),
  }
}

export function looksLikeAddress(value: string): boolean {
  return normalizeAddress(value).startsWith(PUBLIC_ADDRESS_PREFIX)
}

export function normalizeAddress(value: string): string {
  return value.trim().toLowerCase()
}

export type RemoteTxPayload = {
  kind: 'buy' | 'send'
  address: string
  sats: number
  fee_rate: number
  id?: string
}

/** Another peer's tx. Credits us on confirm only if the address is one of ours. */
export function ingestRemoteTx(player: PlayerState, payload: RemoteTxPayload): PlayerState {
  const destination = normalizeAddress(payload.address)
  if (!destination || !Number.isFinite(payload.sats) || payload.sats <= 0 || payload.fee_rate < 1) {
    return player
  }

  const id = payload.id?.trim() || `tx-remote-${player.nextTxId}`
  if (player.pending.some((tx) => tx.id === id) || player.settled.some((tx) => tx.id === id)) {
    return player
  }

  const wallet = findWalletByAddress(player, destination)
  return {
    ...player,
    pending: [
      ...player.pending,
      {
        id,
        walletId: wallet?.id ?? null,
        fromWalletId: null,
        address: destination,
        sats: Math.floor(payload.sats),
        feeRate: Math.floor(payload.fee_rate),
        changeAddress: null,
        changeSats: 0,
      },
    ],
    nextTxId: player.nextTxId + 1,
  }
}

export function findWalletByAddress(player: PlayerState, address: string): Wallet | undefined {
  const wanted = normalizeAddress(address)
  return player.wallets.find((wallet) =>
    wallet.addresses.some((item) => item.value === wanted),
  )
}

function creditAddress(wallet: Wallet, address: string, sats: number): WalletAddress[] {
  return wallet.addresses.map((item) =>
    item.value === address ? { ...item, sats: item.sats + sats } : item,
  )
}

function createTxId(): string {
  const bytes = new Uint8Array(6)
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes)
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256)
    }
  }
  return `tx-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
}

/**
 * Takes an address, not a wallet: the exchange only knows where to send.
 * The $ leave right away (spot + their cut). They pick the sat/vB; you do not.
 * The sats only land when a block carries the tx.
 */
export function buyBitcoin(
  player: PlayerState,
  address: string,
  cadAmount: number,
  priceCad = BTC_PRICE_CAD,
  feeRate: number = marketQuotes(INITIAL_MARKET_RATE).high,
): PlayerState {
  const spread = exchangeSpreadCad(cadAmount)
  const totalCad = cadAmount + spread
  if (cadAmount <= 0 || totalCad > player.cad) {
    throw new Error('insufficient-cad')
  }

  const destination = normalizeAddress(address)
  if (!destination) {
    throw new Error('address-invalid')
  }

  const wallet = findWalletByAddress(player, destination)
  const tx: PendingTx = {
    id: createTxId(),
    walletId: wallet?.id ?? null,
    fromWalletId: null,
    address: destination,
    sats: cadToSats(cadAmount, priceCad),
    feeRate,
    changeAddress: null,
    changeSats: 0,
  }

  return {
    ...player,
    cad: player.cad - totalCad,
    pending: [...player.pending, tx],
    nextTxId: player.nextTxId + 1,
  }
}

/** Called once per mined block, against the market that was on screen. */
export function advanceBlock(
  player: PlayerState,
  marketRate: number,
  random: (() => number) | null = Math.random,
  height = 0,
): PlayerState {
  if (player.pending.length === 0) {
    return player
  }

  const confirmed = player.pending.filter((tx) =>
    clearsThisBlock(
      tx.feeRate,
      marketRate,
      random ?? seededRandom(`${tx.id}:${height}:${marketRate}`),
    ),
  )
  const settled: SettledTx[] = confirmed.map((tx) => ({ ...tx, height }))

  return {
    ...player,
    pending: player.pending.filter((tx) => !confirmed.includes(tx)),
    settled: [...settled, ...player.settled].slice(0, 40),
    wallets: player.wallets.map((wallet) => {
      let next = wallet
      for (const tx of confirmed) {
        if (tx.walletId === wallet.id) {
          next = { ...next, addresses: creditAddress(next, tx.address, tx.sats) }
        }
        if (tx.fromWalletId === wallet.id && tx.changeSats > 0 && tx.changeAddress) {
          next = { ...next, addresses: creditAddress(next, tx.changeAddress, tx.changeSats) }
        }
      }
      return next
    }),
  }
}

/**
 * Spends confirmed sats now. They sit in the mempool until the market accepts
 * the bid. If the destination is not one of our addresses, confirmation burns them.
 */
export function sendBitcoin(
  player: PlayerState,
  fromWalletId: string,
  toAddress: string,
  sats: number,
  feeRate: number,
): PlayerState {
  if (!Number.isFinite(sats) || sats <= 0) {
    throw new Error('amount-invalid')
  }

  const destination = normalizeAddress(toAddress)
  if (!destination) {
    throw new Error('address-invalid')
  }

  const sender = player.wallets.find((wallet) => wallet.id === fromWalletId)
  if (!sender) {
    throw new Error('wallet-missing')
  }

  const plan = planSend(sender, sats, feeRate)
  if (plan.payment + plan.fee > walletSats(sender)) {
    throw new Error('insufficient-sats')
  }

  const { spent } = pickInputs(sender, sats + plan.fee)
  let addresses = sender.addresses.map((item) =>
    spent.includes(item.value) ? { ...item, sats: 0 } : item,
  )
  if (plan.change > 0 && plan.changeAddress) {
    if (!addresses.some((item) => item.value === plan.changeAddress)) {
      addresses = [...addresses, { value: plan.changeAddress, sats: 0 }]
    }
  }

  const receiver = findWalletByAddress(player, destination)
  const tx: PendingTx = {
    id: createTxId(),
    walletId: receiver?.id ?? null,
    fromWalletId,
    address: destination,
    sats,
    feeRate,
    changeAddress: plan.changeAddress,
    changeSats: plan.change,
  }

  return {
    ...player,
    pending: [...player.pending, tx],
    nextTxId: player.nextTxId + 1,
    wallets: player.wallets.map((wallet) =>
      wallet.id === fromWalletId ? { ...wallet, addresses } : wallet,
    ),
  }
}
