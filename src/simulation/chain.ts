export const BLOCK_INTERVAL_SECONDS = 60
export const MAX_CONFIRMED_BLOCKS = 5

/** Tests (and demos) can pass ?block=1 to mine about once per second. */
export function sandboxBlockInterval(): number {
  if (typeof window === 'undefined') {
    return BLOCK_INTERVAL_SECONDS
  }
  const raw = Number(new URLSearchParams(window.location.search).get('block'))
  if (Number.isInteger(raw) && raw >= 1 && raw <= BLOCK_INTERVAL_SECONDS) {
    return raw
  }
  return BLOCK_INTERVAL_SECONDS
}

/** A bid within this band of the market is on the edge of the next block. */
export const MARKET_BAND = 0.2
export const MEDIUM_CONFIRM_CHANCE = 0.5
/** Relay-style floor. The café can sit here; it does not predict tomorrow's mempool. */
export const MIN_MARKET_RATE = 1
/** Busy enough to see congestion, not a cap on what real Bitcoin can do. */
export const MAX_MARKET_RATE = 40
/** Quiet start so High / Medium / Low stay three distinct integers. */
export const INITIAL_MARKET_RATE = 3

/** A typical sandbox tx size, used to preview the miner fee in sats. */
export const TYPICAL_TX_VBYTES = 140

export function estimateFeeSats(feeRate: number): number {
  return Math.max(1, feeRate * TYPICAL_TX_VBYTES)
}

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
  if (feeRate >= 20) {
    return 'bg-block-hot'
  }
  if (feeRate >= 10) {
    return 'bg-block-high'
  }
  if (feeRate >= 4) {
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
  const span = current < 8 ? 3 : 11
  const step = Math.floor(random() * span) - Math.floor(span / 2)
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
      { id: 'c-912004', height: 912_004, feeRate: 4, pool: 'LesChatoshis', txCount: 3_184 },
      { id: 'c-912003', height: 912_003, feeRate: 2, pool: 'Satsmith', txCount: 2_441 },
      { id: 'c-912002', height: 912_002, feeRate: 18, pool: 'Stormnonce', txCount: 3_672 },
      { id: 'c-912001', height: 912_001, feeRate: 1, pool: 'Cedar Blocks', txCount: 2_087 },
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
export type ServerTick = {
  height: number
  market_rate: number
  fee_rate: number
  pool: string
}

/** Apply a room tick: the server already walked the market and named the pool. */
export function applyServerTick(
  state: ChainState,
  tick: ServerTick,
  random: () => number = Math.random,
): ChainState {
  const high = state.upcoming.find((block) => block.priority === 'high')

  return {
    marketRate: tick.market_rate,
    nextHeight: tick.height + 1,
    nextId: state.nextId + 3,
    confirmed: [
      {
        id: high?.id ?? `c-${tick.height}`,
        height: tick.height,
        feeRate: tick.fee_rate,
        pool: tick.pool,
        txCount: high?.txCount ?? 2_000,
      },
      ...state.confirmed,
    ].slice(0, MAX_CONFIRMED_BLOCKS),
    upcoming: mempoolLanes(tick.market_rate, state.nextId, random),
  }
}

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
