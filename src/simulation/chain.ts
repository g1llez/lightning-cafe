export const BLOCK_INTERVAL_SECONDS = 60
export const MAX_CONFIRMED_BLOCKS = 5

/** A bid within this band of the market is on the edge of the next block. */
export const MARKET_BAND = 0.2
export const MEDIUM_CONFIRM_CHANCE = 0.5
export const MIN_MARKET_RATE = 5
export const MAX_MARKET_RATE = 40
export const INITIAL_MARKET_RATE = 15

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

export type MarketQuotes = Record<Priority, number>

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
  marketRate: number
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

/**
 * High / medium / low are quotes around the same market price, not three
 * independent lotteries. The buttons copy these numbers as the player's bid.
 */
export function marketQuotes(marketRate: number): MarketQuotes {
  return {
    high: Math.max(marketRate + 1, Math.ceil(marketRate * (1 + MARKET_BAND))),
    medium: marketRate,
    low: Math.max(1, Math.min(marketRate - 1, Math.ceil(marketRate * (1 - MARKET_BAND)) - 1)),
  }
}

/** Your sat/vB does not change. The zone is where that bid sits versus the market now. */
export function feeZone(feeRate: number, marketRate: number): Priority {
  if (feeRate >= marketRate * (1 + MARKET_BAND)) {
    return 'high'
  }
  if (feeRate < marketRate * (1 - MARKET_BAND)) {
    return 'low'
  }
  return 'medium'
}

/** Above the band always enters; below never; on the edge it is a coin flip. */
export function clearsThisBlock(
  feeRate: number,
  marketRate: number,
  random: () => number = Math.random,
): boolean {
  const zone = feeZone(feeRate, marketRate)
  if (zone === 'high') {
    return true
  }
  if (zone === 'low') {
    return false
  }
  return random() < MEDIUM_CONFIRM_CHANCE
}

/**
 * Walk a sequence of market prices and return how many blocks a bid needs.
 * `null` means it was still waiting after the last price.
 */
export function blocksUntilConfirm(
  feeRate: number,
  marketPath: number[],
  random: () => number = Math.random,
): number | null {
  for (let index = 0; index < marketPath.length; index += 1) {
    if (clearsThisBlock(feeRate, marketPath[index], random)) {
      return index + 1
    }
  }
  return null
}

export function nextMarketRate(current: number, random = Math.random): number {
  const step = Math.floor(random() * 11) - 5
  return Math.min(MAX_MARKET_RATE, Math.max(MIN_MARKET_RATE, current + step))
}

function mempoolLanes(
  marketRate: number,
  startId: number,
  random: () => number,
  txCounts?: [number, number, number],
): ProjectedBlock[] {
  const quotes = marketQuotes(marketRate)
  const lanes: Priority[] = ['low', 'medium', 'high']
  return lanes.map((priority, index) => ({
    id: `u-${startId + index}`,
    priority,
    feeRate: quotes[priority],
    txCount: txCounts ? txCounts[index] : randomTxCount(random),
  }))
}

export function createInitialChain(): ChainState {
  const quotes = marketQuotes(INITIAL_MARKET_RATE)
  return {
    marketRate: INITIAL_MARKET_RATE,
    nextHeight: 912_005,
    nextId: 3,
    upcoming: [
      { id: 'u-0', priority: 'low', feeRate: quotes.low, txCount: 1_742 },
      { id: 'u-1', priority: 'medium', feeRate: quotes.medium, txCount: 2_318 },
      { id: 'u-2', priority: 'high', feeRate: quotes.high, txCount: 2_905 },
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

export function pickPool(random = Math.random): string {
  return MINING_POOLS[Math.floor(random() * MINING_POOLS.length)]
}

/**
 * The high lane is this block's template. After it is mined the three lanes
 * stay in place and only the quotes move — the market, not a conveyor.
 */
export function mineBlock(
  state: ChainState,
  pool: string,
  random: () => number = Math.random,
  nextRate: number = nextMarketRate(state.marketRate, random),
): ChainState {
  const high = state.upcoming.find((block) => block.priority === 'high')
  if (!high) {
    throw new Error('Upcoming mempool must contain a high lane')
  }

  return {
    marketRate: nextRate,
    nextHeight: state.nextHeight + 1,
    nextId: state.nextId + 3,
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
    upcoming: mempoolLanes(nextRate, state.nextId, random),
  }
}

export function formatCountdown(seconds: number): string {
  const clamped = Math.max(0, seconds)
  const minutes = Math.floor(clamped / 60)
  const rest = clamped % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}
