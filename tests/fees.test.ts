import { describe, expect, it } from 'vitest'
import {
  blocksUntilConfirm,
  clearsThisBlock,
  feeZone,
  INITIAL_MARKET_RATE,
  marketQuotes,
} from '../src/simulation/chain'
import {
  advanceBlock,
  buyBitcoin,
  cadToSats,
  createInitialPlayer,
  createWallet,
  receiveAddress,
  totalSats,
} from '../src/simulation/player'

const START = INITIAL_MARKET_RATE
const quotes = marketQuotes(START)

/** Always lose the medium coin flip, so only a zone change can confirm. */
const unlucky = () => 1
/** Always win the medium coin flip. */
const lucky = () => 0

describe('fee market', () => {
  it('quotes three distinct bids around the same market price', () => {
    expect(quotes).toEqual({ high: 18, medium: 15, low: 11 })
    expect(feeZone(quotes.high, START)).toBe('high')
    expect(feeZone(quotes.medium, START)).toBe('medium')
    expect(feeZone(quotes.low, START)).toBe('low')
  })

  it('lets a bid above the band in, and keeps a bid below out', () => {
    expect(clearsThisBlock(quotes.high, START, unlucky)).toBe(true)
    expect(clearsThisBlock(quotes.low, START, lucky)).toBe(false)
  })

  it('flips a coin only on the ±20% edge', () => {
    expect(clearsThisBlock(quotes.medium, START, lucky)).toBe(true)
    expect(clearsThisBlock(quotes.medium, START, unlucky)).toBe(false)
  })
})

describe('min / med / max bid simulation', () => {
  /**
   * A falling market. Unlucky coin flips, so medium only clears once it
   * becomes high, and low only once the market has dropped far enough.
   */
  const path = [15, 14, 13, 12, 10, 8]

  it('records how many blocks each bid needs', () => {
    const result = {
      max: blocksUntilConfirm(quotes.high, path, unlucky),
      med: blocksUntilConfirm(quotes.medium, path, unlucky),
      min: blocksUntilConfirm(quotes.low, path, unlucky),
    }

    expect(result).toEqual({ max: 1, med: 4, min: 6 })
  })

  it('lets a medium bid through on the first block when the coin flip hits', () => {
    expect(blocksUntilConfirm(quotes.medium, path, lucky)).toBe(1)
  })

  it('leaves a cheap bid pending if the market never drops', () => {
    const stuck = [15, 16, 18, 20]
    expect(blocksUntilConfirm(quotes.low, stuck, lucky)).toBeNull()
    expect(blocksUntilConfirm(quotes.high, stuck, unlucky)).toBe(1)
  })

  it('runs the same race on a real player with three waiting txs', () => {
    let player = createWallet(createInitialPlayer(), 'Wallet 1')
    const address = receiveAddress(player.wallets[0])
    player = buyBitcoin(player, address, 100, undefined, quotes.low)
    player = buyBitcoin(player, address, 100, undefined, quotes.medium)
    player = buyBitcoin(player, address, 100, undefined, quotes.high)

    const confirmedAt: Record<number, number> = {}

    path.forEach((marketRate, index) => {
      const before = new Set(player.pending.map((tx) => tx.feeRate))
      player = advanceBlock(player, marketRate, unlucky)
      for (const feeRate of before) {
        if (!player.pending.some((tx) => tx.feeRate === feeRate)) {
          confirmedAt[feeRate] = index + 1
        }
      }
    })

    expect(confirmedAt[quotes.high]).toBe(1)
    expect(confirmedAt[quotes.medium]).toBe(4)
    expect(confirmedAt[quotes.low]).toBe(6)
    expect(player.pending).toHaveLength(0)
    expect(totalSats(player)).toBe(cadToSats(300))
  })
})
