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

export type Wallet = {
  id: string
  name: string
  address: string
  seed: string[]
  sats: number
}

export type PlayerState = {
  cad: number
  npub: string
  wallets: Wallet[]
  nextWalletId: number
}

export function createInitialPlayer(): PlayerState {
  return {
    cad: STARTING_CAD,
    npub: '',
    wallets: [],
    nextWalletId: 1,
  }
}

export function totalSats(player: PlayerState): number {
  return player.wallets.reduce((sum, wallet) => sum + wallet.sats, 0)
}

export function cadToSats(cad: number, priceCad = BTC_PRICE_CAD): number {
  return Math.floor((cad / priceCad) * SATS_PER_BTC)
}

export function createWallet(player: PlayerState, name: string): PlayerState {
  const id = `w-${player.nextWalletId}`
  const wallet: Wallet = {
    id,
    name,
    address: walletAddress(id),
    seed: walletSeed(id),
    sats: 0,
  }

  return {
    ...player,
    nextWalletId: player.nextWalletId + 1,
    wallets: [...player.wallets, wallet],
  }
}

export function walletAddress(id: string): string {
  const payload = id.replace(/[^a-z0-9]/gi, '').toLowerCase().padEnd(32, 'cafe0123')
  return `${PUBLIC_ADDRESS_PREFIX}${payload}`.slice(0, 42)
}

export function walletSeed(id: string): string[] {
  const seed: string[] = []
  let cursor = 0
  for (const char of id) {
    cursor += char.charCodeAt(0)
  }

  while (seed.length < 12) {
    const word = SANDBOX_WORDS[cursor % SANDBOX_WORDS.length]
    if (!seed.includes(word)) {
      seed.push(word)
    }
    cursor += 7
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

export function setNpub(player: PlayerState, npub: string): PlayerState {
  return { ...player, npub: npub.trim() }
}

export function looksLikeNpub(value: string): boolean {
  return /^npub1[0-9a-z]{20,}$/i.test(value.trim())
}

export function buyBitcoin(
  player: PlayerState,
  walletId: string,
  cadAmount: number,
  priceCad = BTC_PRICE_CAD,
): PlayerState {
  if (!looksLikeNpub(player.npub)) {
    throw new Error('npub-required')
  }
  if (cadAmount <= 0 || cadAmount > player.cad) {
    throw new Error('insufficient-cad')
  }

  const wallet = player.wallets.find((item) => item.id === walletId)
  if (!wallet) {
    throw new Error('wallet-missing')
  }

  const sats = cadToSats(cadAmount, priceCad)

  return {
    ...player,
    cad: player.cad - cadAmount,
    wallets: player.wallets.map((item) =>
      item.id === walletId ? { ...item, sats: item.sats + sats } : item,
    ),
  }
}
