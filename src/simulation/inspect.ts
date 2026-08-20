import { type Priority } from './chain'
import {
  findWalletByAddress,
  normalizeAddress,
  pendingForZone,
  settledInBlock,
  type PendingTx,
  type PlayerState,
  type SettledTx,
} from './player'

export type KnownTx = PendingTx | SettledTx

export type AddressRole = 'receive' | 'change'

/** One output: an lc1q that this block or lane pays into. */
export type FundedAddress = {
  address: string
  sats: number
  tx: KnownTx
  role: AddressRole
  mine: boolean
}

export function isSettledTx(tx: KnownTx): tx is SettledTx {
  return 'height' in tx
}

/** Pending first, then settled newest-first — anything this wallet sent or received. */
export function txsForWallet(player: PlayerState, walletId: string): KnownTx[] {
  const matches = (tx: PendingTx) => tx.walletId === walletId || tx.fromWalletId === walletId
  return [...player.pending.filter(matches), ...player.settled.filter(matches)]
}

export function txsForAddress(player: PlayerState, address: string): KnownTx[] {
  const wanted = normalizeAddress(address)
  const matches = (tx: PendingTx) => tx.address === wanted || tx.changeAddress === wanted
  return [...player.pending.filter(matches), ...player.settled.filter(matches)]
}

export function inspectMempoolLane(
  player: PlayerState,
  marketRate: number,
  zone: Priority,
): FundedAddress[] {
  return fundedAddresses(player, pendingForZone(player, marketRate, zone))
}

export function inspectConfirmedBlock(player: PlayerState, height: number): FundedAddress[] {
  return fundedAddresses(player, settledInBlock(player, height))
}

function fundedAddresses(player: PlayerState, txs: KnownTx[]): FundedAddress[] {
  const rows: FundedAddress[] = []
  for (const tx of txs) {
    if (tx.sats > 0) {
      rows.push({
        address: tx.address,
        sats: tx.sats,
        tx,
        role: 'receive',
        mine: Boolean(findWalletByAddress(player, tx.address)),
      })
    }
    if (tx.changeSats > 0 && tx.changeAddress) {
      rows.push({
        address: tx.changeAddress,
        sats: tx.changeSats,
        tx,
        role: 'change',
        mine: Boolean(findWalletByAddress(player, tx.changeAddress)),
      })
    }
  }
  return rows
}
