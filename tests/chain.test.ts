import { describe, expect, it } from 'vitest'
import {
  createInitialChain,
  formatCountdown,
  INITIAL_MARKET_RATE,
  marketQuotes,
  mineBlock,
  MINING_POOLS,
  nextMarketRate,
  pickPool,
  randomTxCount,
  toneForFee,
} from '../src/simulation/chain'
import {
  advanceBlock,
  buyBitcoin,
  cadToSats,
  createAddress,
  createInitialPlayer,
  createWallet,
  findWalletByAddress,
  looksLikeAddress,
  pendingCountByZone,
  pendingSats,
  pendingSatsForAddress,
  receiveAddress,
  renameWallet,
  seedPhrase,
  shortAddress,
  totalSats,
  walletSats,
  walletAddress,
  walletSeed,
} from '../src/simulation/player'

const quotes = marketQuotes(INITIAL_MARKET_RATE)

describe('chain simulation', () => {
  it('mines the high lane and refreshes quotes, without renaming piles', () => {
    const initial = createInitialChain()
    const next = mineBlock(initial, 'LesChatoshis', () => 0, 10)

    expect(next.confirmed[0]).toEqual({
      id: 'u-2',
      height: 912_005,
      feeRate: quotes.high,
      pool: 'LesChatoshis',
      txCount: 2_905,
    })
    expect(next.marketRate).toBe(10)
    expect(next.upcoming.map((block) => block.priority)).toEqual(['low', 'medium', 'high'])
    expect(next.upcoming.map((block) => block.feeRate)).toEqual([
      marketQuotes(10).low,
      marketQuotes(10).medium,
      marketQuotes(10).high,
    ])
    expect(next.confirmed).toHaveLength(5)
    expect(next.nextHeight).toBe(912_006)
  })

  it('formats the one-minute countdown', () => {
    expect(formatCountdown(60)).toBe('1:00')
    expect(formatCountdown(9)).toBe('0:09')
  })

  it('walks the market in a tight range', () => {
    expect(nextMarketRate(15, () => 0)).toBe(10)
    expect(nextMarketRate(15, () => 0.99)).toBe(20)
    expect(toneForFee(4)).toBe('bg-block-low')
    expect(toneForFee(18)).toBe('bg-block-high')
    expect(randomTxCount(() => 0)).toBe(1_600)
    expect(randomTxCount(() => 0.999)).toBeLessThan(4_000)
    expect(randomTxCount(() => 0.999)).toBeGreaterThan(3_500)
  })

  it('picks a fictional mining pool', () => {
    expect(MINING_POOLS).toHaveLength(10)
    expect(MINING_POOLS).toContain('LesChatoshis')
    expect(pickPool(() => 0)).toBe('Quiet ASIC')
  })
})

describe('player wallets', () => {
  it('takes the $ right away but leaves the sats in the mempool', () => {
    let player = createWallet(createInitialPlayer(), 'Wallet 1')
    player = buyBitcoin(player, receiveAddress(player.wallets[0]), 100)

    expect(player.cad).toBe(900)
    expect(totalSats(player)).toBe(0)
    expect(pendingSats(player)).toBe(cadToSats(100))
    expect(pendingSats(player, 'w-2')).toBe(0)
    expect(pendingCountByZone(player, INITIAL_MARKET_RATE, 'high')).toBe(1)
  })

  it('credits the receive address once a block accepts the bid', () => {
    let player = createWallet(createInitialPlayer(), 'Wallet 1')
    player = buyBitcoin(player, receiveAddress(player.wallets[0]), 100)
    player = advanceBlock(player, INITIAL_MARKET_RATE)

    expect(player.pending).toHaveLength(0)
    expect(walletSats(player.wallets[0])).toBe(cadToSats(100))
    expect(totalSats(player)).toBe(cadToSats(100))
  })

  it('keeps a cheap bid in the mempool until the market drops', () => {
    let player = createWallet(createInitialPlayer(), 'Wallet 1')
    player = buyBitcoin(player, receiveAddress(player.wallets[0]), 100, undefined, quotes.low)

    expect(pendingCountByZone(player, INITIAL_MARKET_RATE, 'low')).toBe(1)

    player = advanceBlock(player, INITIAL_MARKET_RATE, () => 1)
    expect(totalSats(player)).toBe(0)
    expect(player.pending).toHaveLength(1)

    player = advanceBlock(player, 8, () => 1)
    expect(totalSats(player)).toBe(cadToSats(100))
    expect(player.pending).toHaveLength(0)
  })

  it('keeps each address balance apart, pending included', () => {
    let player = createWallet(createInitialPlayer(), 'Wallet 1')
    player = buyBitcoin(player, receiveAddress(player.wallets[0]), 100)
    player = advanceBlock(player, INITIAL_MARKET_RATE)
    player = createAddress(player, 'w-1')
    player = buyBitcoin(player, receiveAddress(player.wallets[0]), 250)

    const [first, second] = player.wallets[0].addresses
    expect(first.sats).toBe(cadToSats(100))
    expect(second.sats).toBe(0)
    expect(pendingSatsForAddress(player, second.value)).toBe(cadToSats(250))
    expect(pendingSatsForAddress(player, first.value)).toBe(0)

    player = advanceBlock(player, INITIAL_MARKET_RATE)
    expect(player.wallets[0].addresses[1].sats).toBe(cadToSats(250))
    expect(walletSats(player.wallets[0])).toBe(cadToSats(350))
  })

  it('refuses a buy the player cannot afford or cannot deliver', () => {
    const player = createWallet(createInitialPlayer(), 'Wallet 1')
    const address = receiveAddress(player.wallets[0])

    expect(() => buyBitcoin(player, address, 1_001)).toThrow('insufficient-cad')
    expect(() => buyBitcoin(player, address, 0)).toThrow('insufficient-cad')
    expect(() => buyBitcoin(player, 'lc1qsomebodyelse', 100)).toThrow('address-unknown')
    expect(findWalletByAddress(player, address)?.id).toBe('w-1')
    expect(findWalletByAddress(player, 'lc1qsomebodyelse')).toBeUndefined()
  })

  it('creates a sandbox address and seed, not a real Bitcoin one', () => {
    let player = createWallet(createInitialPlayer(), 'Wallet 1', () => 0)
    const address = receiveAddress(player.wallets[0])

    expect(address.startsWith('lc1q')).toBe(true)
    expect(address.startsWith('bc1')).toBe(false)
    expect(player.wallets[0].seed).toEqual(walletSeed(() => 0))
    expect(seedPhrase(player.wallets[0].seed).split(' ')).toHaveLength(12)
    expect(shortAddress(address)).toContain('…')

    player = renameWallet(player, 'w-1', 'Savings')
    expect(player.wallets[0].name).toBe('Savings')
    expect(() => renameWallet(player, 'w-1', '   ')).toThrow('name-empty')
  })

  it('recognises a sandbox address', () => {
    const player = createWallet(createInitialPlayer(), 'Wallet 1')

    expect(looksLikeAddress(receiveAddress(player.wallets[0]))).toBe(true)
    expect(looksLikeAddress('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4')).toBe(false)
  })

  it('draws 12 different words at random for each wallet', () => {
    const seed = walletSeed()

    expect(seed).toHaveLength(12)
    expect(new Set(seed).size).toBe(12)
    expect(walletSeed()).not.toEqual(walletSeed())
    expect(walletSeed(() => 0.999)).toEqual(walletSeed(() => 0.999))
  })

  it('derives every address from the 12 words', () => {
    const player = createWallet(createInitialPlayer(), 'Wallet 1')
    const seed = player.wallets[0].seed

    expect(player.wallets[0].addresses).toEqual([{ value: walletAddress(seed, 0), sats: 0 }])
    expect(walletAddress(seed, 0)).toBe(walletAddress(seed, 0))
    expect(walletAddress(seed, 1)).not.toBe(walletAddress(seed, 0))
    expect(walletAddress(walletSeed(() => 0), 0)).not.toBe(walletAddress(seed, 0))
  })

  it('adds a fresh receive address on demand', () => {
    let player = createWallet(createInitialPlayer(), 'Wallet 1')
    player = createAddress(player, 'w-1')

    expect(player.wallets[0].addresses).toHaveLength(2)
    expect(receiveAddress(player.wallets[0])).toBe(walletAddress(player.wallets[0].seed, 1))
    expect(new Set(player.wallets[0].addresses).size).toBe(2)
    expect(() => createAddress(player, 'w-9')).toThrow('wallet-missing')
  })
})
