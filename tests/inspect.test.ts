import { describe, expect, it } from 'vitest'
import { INITIAL_MARKET_RATE, marketQuotes } from '../src/simulation/chain'
import {
  highlightedInInspect,
  inspectConfirmedBlock,
  inspectMempoolLane,
  isSettledTx,
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

describe('inspect txs', () => {
  it('lists a pending buy on the destination wallet, then the settled one after a block', () => {
    let { player, address } = fundedWallet()
    const pending = txsForWallet(player, 'w-1')

    expect(pending).toHaveLength(1)
    expect(pending[0]?.address).toBe(address)
    expect(isSettledTx(pending[0]!)).toBe(false)

    player = advanceBlock(player, INITIAL_MARKET_RATE, () => 0, 912_005)
    const history = txsForWallet(player, 'w-1')

    expect(history).toHaveLength(1)
    expect(isSettledTx(history[0]!)).toBe(true)
    if (isSettledTx(history[0]!)) {
      expect(history[0].height).toBe(912_005)
    }
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

  it('puts the high-fee buy in the high lane and highlights it as yours', () => {
    const { player } = fundedWallet()
    const high = inspectMempoolLane(player, INITIAL_MARKET_RATE, 'high', 2_905, 'u-2', quotes.high)
    const low = inspectMempoolLane(player, INITIAL_MARKET_RATE, 'low', 1_742, 'u-0', quotes.low)

    expect(high.known).toHaveLength(1)
    expect(highlightedInInspect(player, high.known[0]!)).toBe(true)
    expect(low.known).toHaveLength(0)
    expect(high.others).toHaveLength(8)
    expect(high.total).toBe(2_905)
  })

  it('lists a foreign mempool tx without highlighting it', () => {
    let player = createInitialPlayer()
    player = ingestRemoteTx(player, {
      kind: 'send',
      address: FOREIGN,
      sats: 50_000,
      fee_rate: quotes.high,
      id: 'peer-1',
    })
    const high = inspectMempoolLane(player, INITIAL_MARKET_RATE, 'high', 2_000, 'u-2', quotes.high)

    expect(high.known).toHaveLength(1)
    expect(high.known[0]?.id).toBe('peer-1')
    expect(highlightedInInspect(player, high.known[0]!)).toBe(false)
  })

  it('keeps the same other txs for the same block seed', () => {
    const player = createInitialPlayer()
    const first = inspectConfirmedBlock(player, 912_004, 3_184, 'c-912004', 4)
    const again = inspectConfirmedBlock(player, 912_004, 3_184, 'c-912004', 4)

    expect(first.known).toEqual([])
    expect(first.others).toHaveLength(8)
    expect(again.others).toEqual(first.others)
    expect(first.others[0]?.address.startsWith('lc1q')).toBe(true)
  })

  it('moves your tx from the mempool inspector into the confirmed block', () => {
    let { player } = fundedWallet()
    player = advanceBlock(player, INITIAL_MARKET_RATE, () => 0, 912_005)
    const mempool = inspectMempoolLane(player, INITIAL_MARKET_RATE, 'high', 2_905, 'u-2', quotes.high)
    const block = inspectConfirmedBlock(player, 912_005, 2_905, 'c-912005', quotes.high)

    expect(mempool.known).toHaveLength(0)
    expect(block.known).toHaveLength(1)
    expect(highlightedInInspect(player, block.known[0]!)).toBe(true)
    expect(isSettledTx(block.known[0]!)).toBe(true)
  })
})
