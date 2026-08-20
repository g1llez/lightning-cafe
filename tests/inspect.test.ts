import { describe, expect, it } from 'vitest'
import { INITIAL_MARKET_RATE, marketQuotes } from '../src/simulation/chain'
import {
  inspectConfirmedBlock,
  inspectMempoolLane,
  isSettledTx,
  txsForAddress,
  txsForWallet,
} from '../src/simulation/inspect'
import {
  advanceBlock,
  buyBitcoin,
  createInitialPlayer,
  ingestRemoteTx,
  receiveAddress,
  restoreWallet,
  sendBitcoin,
} from '../src/simulation/player'

const quotes = marketQuotes(INITIAL_MARKET_RATE)
const SEED_1 =
  'cafe lightning sandbox chatoshi espresso mempool foghash riverbit satsmith stormnonce cedar aurora'
const SEED_2 =
  'beacon copper lantern maple umbrel invoice channel inbound outbound routing watchtower hashrate'
const FOREIGN = 'lc1qzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'

function fundedWallet() {
  let player = restoreWallet(createInitialPlayer(), 'Wallet 1', SEED_1)
  const address = receiveAddress(player.wallets[0])
  player = buyBitcoin(player, address, 100, undefined, quotes.high)
  return { player, address }
}

describe('inspect addresses', () => {
  it('lists a pending buy on the destination address, then the settled one after a block', () => {
    let { player, address } = fundedWallet()
    const pending = txsForAddress(player, address)

    expect(pending).toHaveLength(1)
    expect(pending[0]?.address).toBe(address)
    expect(isSettledTx(pending[0]!)).toBe(false)

    player = advanceBlock(player, INITIAL_MARKET_RATE, () => 0, 912_005)
    const funded = inspectConfirmedBlock(player, 912_005)

    expect(funded).toHaveLength(1)
    expect(funded[0]?.address).toBe(address)
    expect(funded[0]?.sats).toBe(100_000)
    expect(funded[0]?.mine).toBe(true)
  })

  it('shows a send on both wallets and skips a third wallet', () => {
    let { player } = fundedWallet()
    player = restoreWallet(player, 'Wallet 2', SEED_2)
    player = restoreWallet(
      player,
      'Wallet 3',
      'orange quietasic satflow blockbarn northhash pinecone cafe lightning sandbox chatoshi espresso mempool',
    )
    player = advanceBlock(player, INITIAL_MARKET_RATE, () => 0, 912_005)
    const to = receiveAddress(player.wallets[1])
    player = sendBitcoin(player, 'w-1', to, 40_000, quotes.high)

    expect(txsForWallet(player, 'w-1').map((tx) => tx.sats)).toEqual([40_000, 100_000])
    expect(txsForWallet(player, 'w-2').map((tx) => tx.sats)).toEqual([40_000])
    expect(txsForWallet(player, 'w-3')).toEqual([])
  })

  it('puts the high-fee buy address in the high lane, not the low one', () => {
    const { player, address } = fundedWallet()
    const high = inspectMempoolLane(player, INITIAL_MARKET_RATE, 'high')
    const low = inspectMempoolLane(player, INITIAL_MARKET_RATE, 'low')

    expect(high.map((row) => row.address)).toEqual([address])
    expect(high[0]?.mine).toBe(true)
    expect(low).toEqual([])
  })

  it('lists a foreign mempool address without marking it as yours', () => {
    let player = createInitialPlayer()
    player = ingestRemoteTx(player, {
      kind: 'send',
      address: FOREIGN,
      sats: 50_000,
      fee_rate: quotes.high,
      id: 'peer-1',
    })
    const high = inspectMempoolLane(player, INITIAL_MARKET_RATE, 'high')

    expect(high).toHaveLength(1)
    expect(high[0]?.address).toBe(FOREIGN)
    expect(high[0]?.mine).toBe(false)
  })

  it('lists payment and change addresses for a send still in the mempool', () => {
    let { player } = fundedWallet()
    player = restoreWallet(player, 'Wallet 2', SEED_2)
    player = advanceBlock(player, INITIAL_MARKET_RATE, () => 0, 912_005)
    const to = receiveAddress(player.wallets[1])
    player = sendBitcoin(player, 'w-1', to, 40_000, quotes.high)
    const high = inspectMempoolLane(player, INITIAL_MARKET_RATE, 'high')

    expect(high.map((row) => row.role)).toEqual(['receive', 'change'])
    expect(high[0]?.address).toBe(to)
    expect(high[0]?.sats).toBe(40_000)
    expect(high[1]?.sats).toBeGreaterThan(0)
    expect(high.every((row) => row.mine)).toBe(true)
  })

  it('moves your address from the mempool inspector into the confirmed block', () => {
    let { player, address } = fundedWallet()
    player = advanceBlock(player, INITIAL_MARKET_RATE, () => 0, 912_005)
    const mempool = inspectMempoolLane(player, INITIAL_MARKET_RATE, 'high')
    const block = inspectConfirmedBlock(player, 912_005)

    expect(mempool).toEqual([])
    expect(block.map((row) => row.address)).toEqual([address])
  })

  it('leaves an empty confirmed block without invented addresses', () => {
    const player = createInitialPlayer()
    expect(inspectConfirmedBlock(player, 912_004)).toEqual([])
  })
})
