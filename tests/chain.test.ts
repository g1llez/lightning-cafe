import { describe, expect, it } from 'vitest'
import {
  createInitialChain,
  formatCountdown,
  mineBlock,
  nextLowFeeRate,
  toneForFee,
} from '../src/simulation/chain'

describe('chain simulation', () => {
  it('mines the high-priority mempool block onto the chain', () => {
    const initial = createInitialChain()
    const next = mineBlock(initial, 5)

    expect(next.confirmed[0]).toEqual({
      id: 'u-high',
      height: 912_005,
      feeRate: 18,
    })
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
  })
})
