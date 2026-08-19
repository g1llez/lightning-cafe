import {
  INITIAL_MARKET_RATE,
  clearsThisBlock,
  feeZone,
  marketQuotes,
  type Priority,
} from './chain'

export const STARTING_CAD = 1_000
export const BTC_PRICE_CAD = 100_000
export const SATS_PER_BTC = 100_000_000
export const PUBLIC_ADDRESS_PREFIX = 'lc1q'

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
  walletId: string
  address: string
  sats: number
  feeRate: number
}

export type PlayerState = {
  cad: number
  wallets: Wallet[]
  pending: PendingTx[]
  nextWalletId: number
  nextTxId: number
}

export function createInitialPlayer(): PlayerState {
  return {
    cad: STARTING_CAD,
    wallets: [],
    pending: [],
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
  return player.pending
    .filter((tx) => !walletId || tx.walletId === walletId)
    .reduce((sum, tx) => sum + tx.sats, 0)
}

export function pendingSatsForAddress(player: PlayerState, address: string): number {
  return player.pending
    .filter((tx) => tx.address === address)
    .reduce((sum, tx) => sum + tx.sats, 0)
}

/** The badge follows the current zone, so a cheap bid can jump lanes if the market drops. */
export function pendingForZone(
  player: PlayerState,
  marketRate: number,
  zone: Priority,
): PendingTx[] {
  return player.pending.filter((tx) => feeZone(tx.feeRate, marketRate) === zone)
}

export function pendingCountByZone(
  player: PlayerState,
  marketRate: number,
  zone: Priority,
): number {
  return pendingForZone(player, marketRate, zone).length
}

export function cadToSats(cad: number, priceCad = BTC_PRICE_CAD): number {
  return Math.floor((cad / priceCad) * SATS_PER_BTC)
}

export function createWallet(
  player: PlayerState,
  name: string,
  random: () => number = Math.random,
): PlayerState {
  const id = `w-${player.nextWalletId}`
  const seed = walletSeed(random)
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

/** Every address comes from the seed, so the 12 words really are the wallet. */
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

/** Drawn at random, like a real wallet: nobody can guess the combination. */
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
  return value.trim().toLowerCase().startsWith(PUBLIC_ADDRESS_PREFIX)
}

export function findWalletByAddress(player: PlayerState, address: string): Wallet | undefined {
  const wanted = address.trim()
  return player.wallets.find((wallet) => wallet.addresses.some((item) => item.value === wanted))
}

function creditAddress(wallet: Wallet, address: string, sats: number): WalletAddress[] {
  return wallet.addresses.map((item) =>
    item.value === address ? { ...item, sats: item.sats + sats } : item,
  )
}

/**
 * Takes an address, not a wallet: the exchange only knows where to send.
 * The $ leave right away, the sats only land when a block carries the tx.
 * `feeRate` is the bid; it does not change while the tx waits.
 */
export function buyBitcoin(
  player: PlayerState,
  address: string,
  cadAmount: number,
  priceCad = BTC_PRICE_CAD,
  feeRate: number = marketQuotes(INITIAL_MARKET_RATE).high,
): PlayerState {
  if (cadAmount <= 0 || cadAmount > player.cad) {
    throw new Error('insufficient-cad')
  }

  const wallet = findWalletByAddress(player, address)
  if (!wallet) {
    throw new Error('address-unknown')
  }

  const tx: PendingTx = {
    id: `tx-${player.nextTxId}`,
    walletId: wallet.id,
    address: address.trim(),
    sats: cadToSats(cadAmount, priceCad),
    feeRate,
  }

  return {
    ...player,
    cad: player.cad - cadAmount,
    pending: [...player.pending, tx],
    nextTxId: player.nextTxId + 1,
  }
}

/** Called once per mined block, against the market that was on screen. */
export function advanceBlock(
  player: PlayerState,
  marketRate: number,
  random: () => number = Math.random,
): PlayerState {
  if (player.pending.length === 0) {
    return player
  }

  const confirmed = player.pending.filter((tx) => clearsThisBlock(tx.feeRate, marketRate, random))

  return {
    ...player,
    pending: player.pending.filter((tx) => !confirmed.includes(tx)),
    wallets: player.wallets.map((wallet) => {
      const forWallet = confirmed.filter((tx) => tx.walletId === wallet.id)
      if (forWallet.length === 0) {
        return wallet
      }

      return forWallet.reduce(
        (item, tx) => ({ ...item, addresses: creditAddress(item, tx.address, tx.sats) }),
        wallet,
      )
    }),
  }
}
