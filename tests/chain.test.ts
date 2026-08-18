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
  createInitialPlayer,
  createWallet,
  looksLikeNpub,
  renameWallet,
  seedPhrase,
  setNpub,
  shortAddress,
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
    let player = createInitialPlayer()
    player = createWallet(player, 'Wallet 1')
    player = setNpub(player, 'npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqt8d4x')
    player = buyBitcoin(player, 'w-1', 100)

    expect(player.cad).toBe(900)
    expect(player.wallets[0].sats).toBe(cadToSats(100))
    expect(looksLikeNpub('npub1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqt8d4x')).toBe(true)
  })

  it('refuses a buy without npub', () => {
    const player = createWallet(createInitialPlayer(), 'Wallet 1')
    expect(() => buyBitcoin(player, 'w-1', 100)).toThrow('npub-required')
  })

  it('creates a sandbox address and seed, not a real Bitcoin one', () => {
    let player = createWallet(createInitialPlayer(), 'Wallet 1')
    expect(player.wallets[0].address.startsWith('lc1q')).toBe(true)
    expect(player.wallets[0].address.startsWith('bc1')).toBe(false)
    expect(player.wallets[0].address).toBe(walletAddress('w-1'))
    expect(player.wallets[0].seed).toEqual(walletSeed('w-1'))
    expect(player.wallets[0].seed).toHaveLength(12)
    expect(seedPhrase(player.wallets[0].seed).split(' ')).toHaveLength(12)
    expect(shortAddress(player.wallets[0].address)).toContain('…')

    player = renameWallet(player, 'w-1', 'Savings')
    expect(player.wallets[0].name).toBe('Savings')
    expect(() => renameWallet(player, 'w-1', '   ')).toThrow('name-empty')
  })
})
