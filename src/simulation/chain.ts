export const BLOCK_INTERVAL_SECONDS = 60
export const MAX_CONFIRMED_BLOCKS = 5

export type Priority = 'low' | 'medium' | 'high'

export type ProjectedBlock = {
  id: string
  priority: Priority
  feeRate: number
}

export type ConfirmedBlock = {
  id: string
  height: number
  feeRate: number
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

export function createInitialChain(): ChainState {
  return {
    nextHeight: 912_005,
    nextId: 1,
    upcoming: [
      { id: 'u-low', priority: 'low', feeRate: 4 },
      { id: 'u-med', priority: 'medium', feeRate: 9 },
      { id: 'u-high', priority: 'high', feeRate: 18 },
    ],
    confirmed: [
      { id: 'c-912004', height: 912_004, feeRate: 22 },
      { id: 'c-912003', height: 912_003, feeRate: 14 },
      { id: 'c-912002', height: 912_002, feeRate: 35 },
      { id: 'c-912001', height: 912_001, feeRate: 12 },
      { id: 'c-912000', height: 912_000, feeRate: 8 },
    ],
  }
}

export function nextLowFeeRate(random = Math.random): number {
  return 3 + Math.floor(random() * 6)
}

export function mineBlock(state: ChainState, incomingFeeRate: number): ChainState {
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
      { id: high.id, height: state.nextHeight, feeRate: high.feeRate },
      ...state.confirmed,
    ].slice(0, MAX_CONFIRMED_BLOCKS),
    upcoming: [
      { id: `u-${state.nextId}`, priority: 'low', feeRate: incomingFeeRate },
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
