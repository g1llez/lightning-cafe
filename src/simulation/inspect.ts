import { seededRandom, type Priority } from './chain'
import {
  isOwnTx,
  pendingForZone,
  PUBLIC_ADDRESS_PREFIX,
  settledInBlock,
  type PendingTx,
  type PlayerState,
  type SettledTx,
} from './player'

/** How many NPC txs sit under the known ones in the inspector. */
export const INSPECT_OTHER_SAMPLE = 8

const ADDRESS_ALPHABET = 'acdefghjklmnpqrstuvwxyz023456789'
const ADDRESS_BODY_LENGTH = 34

export type KnownTx = PendingTx | SettledTx

export type OtherTx = {
  id: string
  address: string
  sats: number
  feeRate: number
}

export type BlockInspect = {
  known: KnownTx[]
  others: OtherTx[]
  total: number
}

export function isSettledTx(tx: KnownTx): tx is SettledTx {
  return 'height' in tx
}

/** Pending first, then settled newest-first — anything this wallet sent or received. */
export function txsForWallet(player: PlayerState, walletId: string): KnownTx[] {
  const matches = (tx: PendingTx) => tx.walletId === walletId || tx.fromWalletId === walletId
  return [...player.pending.filter(matches), ...player.settled.filter(matches)]
}

export function inspectMempoolLane(
  player: PlayerState,
  marketRate: number,
  zone: Priority,
  txCount: number,
  seed: string,
  feeRate: number,
): BlockInspect {
  return assembleInspect(pendingForZone(player, marketRate, zone), txCount, seed, feeRate)
}

export function inspectConfirmedBlock(
  player: PlayerState,
  height: number,
  txCount: number,
  seed: string,
  feeRate: number,
): BlockInspect {
  return assembleInspect(settledInBlock(player, height), txCount, seed, feeRate)
}

export function highlightedInInspect(player: PlayerState, tx: KnownTx): boolean {
  return isOwnTx(player, tx)
}

function assembleInspect(
  known: KnownTx[],
  txCount: number,
  seed: string,
  feeRate: number,
): BlockInspect {
  const total = Math.max(txCount, known.length)
  const room = Math.max(0, total - known.length)
  const others = sampleOthers(seed, feeRate, Math.min(INSPECT_OTHER_SAMPLE, room))
  return { known, others, total }
}

function sampleOthers(seed: string, feeRate: number, count: number): OtherTx[] {
  if (count <= 0) {
    return []
  }

  const rng = seededRandom(`inspect:${seed}`)
  const txs: OtherTx[] = []
  for (let index = 0; index < count; index += 1) {
    txs.push({
      id: `other-${seed}-${index}`,
      address: otherAddress(rng),
      sats: 12_000 + Math.floor(rng() * 240_000),
      feeRate: Math.max(1, feeRate + Math.floor(rng() * 3) - 1),
    })
  }
  return txs
}

function otherAddress(rng: () => number): string {
  let body = ''
  while (body.length < ADDRESS_BODY_LENGTH) {
    body += ADDRESS_ALPHABET[Math.floor(rng() * ADDRESS_ALPHABET.length)]
  }
  return `${PUBLIC_ADDRESS_PREFIX}${body}`
}
