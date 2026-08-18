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

export type PlayerState = {
  cad: number
  wallets: Wallet[]
  nextWalletId: number
}

export function createInitialPlayer(): PlayerState {
  return {
    cad: STARTING_CAD,
    wallets: [],
    nextWalletId: 1,
  }
}

export function walletSats(wallet: Wallet): number {
  return wallet.addresses.reduce((sum, address) => sum + address.sats, 0)
}

export function totalSats(player: PlayerState): number {
  return player.wallets.reduce((sum, wallet) => sum + walletSats(wallet), 0)
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

function creditAddress(wallet: Wallet, address: string, sats: number): WalletAddress[] {
  return wallet.addresses.map((item) =>
    item.value === address ? { ...item, sats: item.sats + sats } : item,
  )
}

export function buyBitcoin(
  player: PlayerState,
  walletId: string,
  cadAmount: number,
  priceCad = BTC_PRICE_CAD,
): PlayerState {
  if (cadAmount <= 0 || cadAmount > player.cad) {
    throw new Error('insufficient-cad')
  }

  const wallet = player.wallets.find((item) => item.id === walletId)
  if (!wallet) {
    throw new Error('wallet-missing')
  }

  const sats = cadToSats(cadAmount, priceCad)
  const target = receiveAddress(wallet)

  return {
    ...player,
    cad: player.cad - cadAmount,
    wallets: player.wallets.map((item) =>
      item.id === walletId ? { ...item, addresses: creditAddress(item, target, sats) } : item,
    ),
  }
}
