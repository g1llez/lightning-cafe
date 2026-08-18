export const BLOCK_INTERVAL_SECONDS = 60
export const MAX_CONFIRMED_BLOCKS = 5

export const MINING_POOLS = [
  'Quiet ASIC',
  'Satsmith',
  'Riverbit',
  'Cedar Blocks',
  'Halving House',
  'Stormnonce',
  'Beacon Batch',
  'Copper Relay',
  'Aurora Hash',
  'LesChatoshis',
] as const

export type Priority = 'low' | 'medium' | 'high'

export type ProjectedBlock = {
  id: string
  priority: Priority
  feeRate: number
  txCount: number
}

export type ConfirmedBlock = {
  id: string
  height: number
  feeRate: number
  pool: string
  txCount: number
}

export type ChainState = {
  nextHeight: number
  nextId: number
  upcoming: ProjectedBlock[]
  confirmed: ConfirmedBlock[]
}

export function toneForFee(feeRate: number): string {
  if (feeRate >= 30) {
    return 'bg-block-hot'
  }
  if (feeRate >= 16) {
    return 'bg-block-high'
  }
  if (feeRate >= 9) {
    return 'bg-block-mid'
  }
  return 'bg-block-low'
}

export function randomTxCount(random = Math.random): number {
  return 1_600 + Math.floor(random() * 2_400)
}

export function createInitialChain(): ChainState {
  return {
    nextHeight: 912_005,
    nextId: 1,
    upcoming: [
      { id: 'u-low', priority: 'low', feeRate: 4, txCount: 1_742 },
      { id: 'u-med', priority: 'medium', feeRate: 9, txCount: 2_318 },
      { id: 'u-high', priority: 'high', feeRate: 18, txCount: 2_905 },
    ],
    confirmed: [
      { id: 'c-912004', height: 912_004, feeRate: 22, pool: 'LesChatoshis', txCount: 3_184 },
      { id: 'c-912003', height: 912_003, feeRate: 14, pool: 'Satsmith', txCount: 2_441 },
      { id: 'c-912002', height: 912_002, feeRate: 35, pool: 'Stormnonce', txCount: 3_672 },
      { id: 'c-912001', height: 912_001, feeRate: 12, pool: 'Cedar Blocks', txCount: 2_087 },
      { id: 'c-912000', height: 912_000, feeRate: 8, pool: 'Aurora Hash', txCount: 1_956 },
    ],
  }
}

export function nextLowFeeRate(random = Math.random): number {
  return 3 + Math.floor(random() * 6)
}

export function pickPool(random = Math.random): string {
  return MINING_POOLS[Math.floor(random() * MINING_POOLS.length)]
}

export function mineBlock(
  state: ChainState,
  incomingFeeRate: number,
  pool: string,
  incomingTxCount: number,
): ChainState {
  const high = state.upcoming.find((block) => block.priority === 'high')
  const medium = state.upcoming.find((block) => block.priority === 'medium')
  const low = state.upcoming.find((block) => block.priority === 'low')

  if (!high || !medium || !low) {
    throw new Error('Upcoming mempool must contain low, medium and high blocks')
  }

  return {
    nextHeight: state.nextHeight + 1,
    nextId: state.nextId + 1,
    confirmed: [
      {
        id: high.id,
        height: state.nextHeight,
        feeRate: high.feeRate,
        pool,
        txCount: high.txCount,
      },
      ...state.confirmed,
    ].slice(0, MAX_CONFIRMED_BLOCKS),
    upcoming: [
      { id: `u-${state.nextId}`, priority: 'low', feeRate: incomingFeeRate, txCount: incomingTxCount },
      { ...low, priority: 'medium' },
      { ...medium, priority: 'high' },
    ],
  }
}

export function formatCountdown(seconds: number): string {
  const clamped = Math.max(0, seconds)
  const minutes = Math.floor(clamped / 60)
  const rest = clamped % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}
