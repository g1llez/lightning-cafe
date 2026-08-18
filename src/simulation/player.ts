export const STARTING_CAD = 1_000
export const BTC_PRICE_CAD = 100_000
export const SATS_PER_BTC = 100_000_000

export type Wallet = {
  id: string
  name: string
  address: string
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
    address: `bc1q${id.replace('-', '')}cafe00000000000000`.slice(0, 26),
    sats: 0,
  }

  return {
    ...player,
    nextWalletId: player.nextWalletId + 1,
    wallets: [...player.wallets, wallet],
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
