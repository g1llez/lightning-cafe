import { describe, expect, it } from 'vitest'
import {
  applyServerTick,
  createInitialChain,
  INITIAL_MARKET_RATE,
  marketQuotes,
} from '../src/simulation/chain'
import {
  buyBitcoin,
  cadToSats,
  createInitialPlayer,
  createWallet,
  ingestRemoteTx,
  receiveAddress,
  totalSats,
} from '../src/simulation/player'
import { parseRemoteTx, parseTick } from '../src/simulation/sessionApi'

describe('shared cafe session', () => {
  it('applies a server tick without inventing a local pool walk', () => {
    const start = createInitialChain()
    const high = start.upcoming.find((block) => block.priority === 'high')
    const next = applyServerTick(start, {
      height: 912_005,
      market_rate: 8,
      fee_rate: 4,
      pool: 'LesChatoshis',
    })

    expect(next.confirmed[0]?.height).toBe(912_005)
    expect(next.confirmed[0]?.pool).toBe('LesChatoshis')
    expect(next.confirmed[0]?.feeRate).toBe(4)
    expect(next.confirmed[0]?.id).toBe(high?.id)
    expect(next.marketRate).toBe(8)
    expect(next.nextHeight).toBe(912_006)
    expect(next.upcoming.map((block) => block.feeRate)).toEqual([
      marketQuotes(8).low,
      marketQuotes(8).medium,
      marketQuotes(8).high,
    ])
    expect(start.marketRate).toBe(INITIAL_MARKET_RATE)
  })

  it('credits a remote buy only when the address is ours, and skips duplicates', () => {
    let player = createWallet(createInitialPlayer(), 'Wallet 1')
    const address = receiveAddress(player.wallets[0])
    const payload = {
      kind: 'buy' as const,
      address,
      sats: cadToSats(100),
      fee_rate: 4,
      id: 'tx-from-pc-b',
    }

    player = ingestRemoteTx(player, payload)
    expect(player.pending).toHaveLength(1)
    expect(player.pending[0]?.walletId).toBe('w-1')
    expect(totalSats(player)).toBe(0)

    player = ingestRemoteTx(player, payload)
    expect(player.pending).toHaveLength(1)

    player = ingestRemoteTx(player, {
      kind: 'buy',
      address: 'lc1qnotanyoneinthecafe00000000000000',
      sats: cadToSats(50),
      fee_rate: 4,
      id: 'tx-burn',
    })
    expect(player.pending).toHaveLength(2)
    expect(player.pending[1]?.walletId).toBeNull()
  })

  it('does not double-count a tx we already sent locally', () => {
    let player = createWallet(createInitialPlayer(), 'Wallet 1')
    const address = receiveAddress(player.wallets[0])
    player = buyBitcoin(player, address, 100)
    const id = player.pending[0]?.id ?? ''

    player = ingestRemoteTx(player, {
      kind: 'buy',
      address,
      sats: cadToSats(100),
      fee_rate: 4,
      id,
    })

    expect(player.pending).toHaveLength(1)
  })

  it('rejects a tick or tx payload that is not the contract', () => {
    expect(parseTick({})).toBeNull()
    expect(parseTick({ height: 1, market_rate: 3, fee_rate: 4, pool: 'Satsmith' })).toEqual({
      height: 1,
      market_rate: 3,
      fee_rate: 4,
      pool: 'Satsmith',
    })
    expect(parseRemoteTx({ kind: 'buy', address: 'lc1qaa', sats: 1 })).toBeNull()
    expect(parseRemoteTx({ kind: 'zap', address: 'lc1qaa', sats: 1, fee_rate: 2 })).toBeNull()
  })
})
