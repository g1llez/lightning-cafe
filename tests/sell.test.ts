import { describe, expect, it } from 'vitest'
import { estimateFeeSats, INITIAL_MARKET_RATE, marketQuotes } from '../src/simulation/chain'
import {
  advanceBlock,
  buyBitcoin,
  createInitialPlayer,
  EXCHANGE_CONFIRMATIONS,
  exchangeAddress,
  EXCHANGE_SPREAD,
  receiveAddress,
  restoreWallet,
  satsToCad,
  sendBitcoin,
  totalSats,
  walletSats,
} from '../src/simulation/player'
import { playerForRoomReload } from '../src/simulation/persist'

const quotes = marketQuotes(INITIAL_MARKET_RATE)
const highFee = estimateFeeSats(quotes.high)
const SEED =
  'cafe lightning sandbox chatoshi espresso mempool foghash riverbit satsmith stormnonce cedar aurora'

function fundedWallet() {
  let player = restoreWallet(createInitialPlayer(), 'Wallet 1', SEED)
  const address = receiveAddress(player.wallets[0])
  player = buyBitcoin(player, address, 100)
  player = advanceBlock(player, INITIAL_MARKET_RATE, () => 0, 912_005)
  return player
}

function mine(player: ReturnType<typeof fundedWallet>, height: number) {
  return advanceBlock(player, INITIAL_MARKET_RATE, () => 0, height)
}

describe('deposit to the exchange', () => {
  it('uses a sandbox lc1 deposit address that is not one of ours', () => {
    const player = fundedWallet()
    const deposit = exchangeAddress()
    expect(deposit.startsWith('lc1q')).toBe(true)
    expect(player.wallets.some((wallet) => wallet.addresses.some((item) => item.value === deposit))).toBe(
      false,
    )
  })

  it('spends sats now like a send, with only the miner fee, and waits 3 blocks for $', () => {
    let player = fundedWallet()
    const cadBefore = player.cad
    const startSats = walletSats(player.wallets[0])
    const sold = 10_000

    player = sendBitcoin(player, 'w-1', exchangeAddress(), sold, quotes.high)

    expect(player.pending[0]?.address).toBe(exchangeAddress())
    expect(player.pending[0]?.fromWalletId).toBe('w-1')
    expect(player.cad).toBe(cadBefore)
    expect(walletSats(player.wallets[0])).toBe(0)
    expect(totalSats(player)).toBe(0)
    expect(startSats - sold).toBe(highFee + (player.pending[0]?.changeSats ?? 0))

    player = mine(player, 912_006)
    expect(player.pending).toHaveLength(0)
    expect(player.cad).toBe(cadBefore)
    expect(player.paidSellIds).toHaveLength(0)

    player = mine(player, 912_007)
    expect(player.cad).toBe(cadBefore)

    player = mine(player, 912_008)
    expect(player.cad).toBe(cadBefore + satsToCad(sold))
    expect(player.cad - cadBefore).not.toBe(satsToCad(sold) * (1 - EXCHANGE_SPREAD))
    expect(player.paidSellIds).toHaveLength(1)

    const after = mine(player, 912_009)
    expect(after.cad).toBe(player.cad)
    expect(after.paidSellIds).toHaveLength(1)
  })

  it('needs three confirmations: the including block plus two more', () => {
    expect(EXCHANGE_CONFIRMATIONS).toBe(3)
    let player = fundedWallet()
    const cadBefore = player.cad
    player = sendBitcoin(player, 'w-1', exchangeAddress(), 10_000, quotes.high)

    player = mine(player, 100)
    expect(player.settled[0]?.height).toBe(100)
    expect(player.cad).toBe(cadBefore)

    player = mine(player, 101)
    expect(player.cad).toBe(cadBefore)

    player = mine(player, 102)
    expect(player.cad).toBe(cadBefore + satsToCad(10_000))
  })

  it('still pays after F5 in a cafe room once later blocks arrive', () => {
    let player = fundedWallet()
    const cadBefore = player.cad
    player = sendBitcoin(player, 'w-1', exchangeAddress(), 10_000, quotes.high)
    player = mine(player, 200)

    const reloaded = playerForRoomReload(player)
    expect(reloaded.settled).toHaveLength(1)
    expect(reloaded.settled[0]?.address).toBe(exchangeAddress())
    expect(totalSats(reloaded)).toBe(0)
    expect(reloaded.cad).toBe(cadBefore)

    player = mine(reloaded, 201)
    player = mine(player, 202)
    expect(player.cad).toBe(cadBefore + satsToCad(10_000))
  })

  it('does not credit a remote send to the exchange as our $', () => {
    let player = fundedWallet()
    const cadBefore = player.cad
    player = {
      ...player,
      pending: [
        ...player.pending,
        {
          id: 'tx-someone-else',
          walletId: null,
          fromWalletId: null,
          address: exchangeAddress(),
          sats: 10_000,
          feeRate: quotes.high,
          changeAddress: null,
          changeSats: 0,
        },
      ],
    }
    player = mine(player, 300)
    player = mine(player, 301)
    player = mine(player, 302)
    expect(player.cad).toBe(cadBefore)
  })
})
