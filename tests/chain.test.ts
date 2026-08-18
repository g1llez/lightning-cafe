import { describe, expect, it } from 'vitest'
import {
  createInitialChain,
  formatCountdown,
  mineBlock,
  MINING_POOLS,
  nextLowFeeRate,
  pickPool,
  randomTxCount,
  toneForFee,
} from '../src/simulation/chain'
import {
  buyBitcoin,
  cadToSats,
  createAddress,
  createInitialPlayer,
  createWallet,
  looksLikeAddress,
  receiveAddress,
  renameWallet,
  seedPhrase,
  shortAddress,
  totalSats,
  walletSats,
  walletAddress,
  walletSeed,
} from '../src/simulation/player'

describe('chain simulation', () => {
  it('mines the high-priority mempool block onto the chain', () => {
    const initial = createInitialChain()
    const next = mineBlock(initial, 5, 'LesChatoshis', 2_200)

    expect(next.confirmed[0]).toEqual({
      id: 'u-high',
      height: 912_005,
      feeRate: 18,
      pool: 'LesChatoshis',
      txCount: 2_905,
    })
    expect(next.upcoming[0].txCount).toBe(2_200)
    expect(next.confirmed).toHaveLength(5)
    expect(next.nextHeight).toBe(912_006)
    expect(next.upcoming.map((block) => block.priority)).toEqual(['low', 'medium', 'high'])
    expect(next.upcoming[2].feeRate).toBe(9)
    expect(next.upcoming[1].feeRate).toBe(4)
    expect(next.upcoming[0].feeRate).toBe(5)
  })

  it('formats the one-minute countdown', () => {
    expect(formatCountdown(60)).toBe('1:00')
    expect(formatCountdown(9)).toBe('0:09')
  })

  it('keeps new mempool blocks in the low fee range', () => {
    expect(nextLowFeeRate(() => 0)).toBe(3)
    expect(nextLowFeeRate(() => 0.99)).toBe(8)
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
  it('starts with 1000 CAD and converts a buy into sats', () => {
    let player = createWallet(createInitialPlayer(), 'Wallet 1')
    player = buyBitcoin(player, 'w-1', 100)

    expect(player.cad).toBe(900)
    expect(walletSats(player.wallets[0])).toBe(cadToSats(100))
    expect(totalSats(player)).toBe(cadToSats(100))
  })

  it('credits the receive address, and a new address starts empty', () => {
    let player = createWallet(createInitialPlayer(), 'Wallet 1')
    player = buyBitcoin(player, 'w-1', 100)
    player = createAddress(player, 'w-1')
    player = buyBitcoin(player, 'w-1', 250)

    expect(player.wallets[0].addresses[0].sats).toBe(cadToSats(100))
    expect(player.wallets[0].addresses[1].sats).toBe(cadToSats(250))
    expect(walletSats(player.wallets[0])).toBe(cadToSats(350))
  })

  it('refuses a buy the player cannot afford', () => {
    const player = createWallet(createInitialPlayer(), 'Wallet 1')

    expect(() => buyBitcoin(player, 'w-1', 1_001)).toThrow('insufficient-cad')
    expect(() => buyBitcoin(player, 'w-1', 0)).toThrow('insufficient-cad')
    expect(() => buyBitcoin(player, 'w-9', 100)).toThrow('wallet-missing')
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
