import { describe, expect, it } from 'vitest'
import { estimateFeeSats, INITIAL_MARKET_RATE, marketQuotes } from '../src/simulation/chain'
import {
  advanceBlock,
  buyBitcoin,
  cadToSats,
  createAddress,
  createInitialPlayer,
  findWalletByAddress,
  pendingSats,
  pendingSatsForAddress,
  planSend,
  receiveAddress,
  restoreWallet,
  sendBitcoin,
  totalSats,
  walletAddress,
  walletSats,
} from '../src/simulation/player'

const quotes = marketQuotes(INITIAL_MARKET_RATE)
const highFee = estimateFeeSats(quotes.high)
const lowFee = estimateFeeSats(quotes.low)

const SEED_1 =
  'cafe lightning sandbox chatoshi espresso mempool foghash riverbit satsmith stormnonce cedar aurora'
const SEED_2 =
  'beacon copper lantern maple umbrel invoice channel inbound outbound routing watchtower hashrate'

function twoWallets() {
  let player = restoreWallet(createInitialPlayer(), 'Wallet 1', SEED_1)
  player = restoreWallet(player, 'Wallet 2', SEED_2)
  const from = receiveAddress(player.wallets[0])
  const to = receiveAddress(player.wallets[1])
  player = buyBitcoin(player, from, 100)
  player = advanceBlock(player, INITIAL_MARKET_RATE)
  return { player, from, to }
}

describe('send on-chain', () => {
  it('gives each wallet its own address and looks them up without mixing them', () => {
    const { player, from, to } = twoWallets()

    expect(from).not.toBe(to)
    expect(findWalletByAddress(player, from)?.id).toBe('w-1')
    expect(findWalletByAddress(player, to)?.id).toBe('w-2')
    expect(findWalletByAddress(player, to)?.id).not.toBe('w-1')
  })

  it('plans three outputs: payment, miner fee, and change to the next address', () => {
    const { player } = twoWallets()
    const sent = 40_000
    const plan = planSend(player.wallets[0], sent, quotes.high)

    expect(plan.payment).toBe(sent)
    expect(plan.fee).toBe(highFee)
    expect(plan.change).toBe(cadToSats(100) - sent - highFee)
    expect(plan.changeAddress).toBe(walletAddress(player.wallets[0].seed, 1))
  })

  it('zeroes spent piles now and parks change on the next unused address until confirm', () => {
    let { player, from, to } = twoWallets()
    const start = cadToSats(100)
    const sent = 40_000
    const change = start - sent - highFee

    player = sendBitcoin(player, 'w-1', to, sent, quotes.high)

    expect(player.wallets[0].addresses[0]?.value).toBe(from)
    expect(player.wallets[0].addresses[0]?.sats).toBe(0)
    expect(player.wallets[0].addresses).toHaveLength(2)
    expect(player.pending).toHaveLength(1)
    expect(player.pending[0]?.sats).toBe(sent)
    expect(player.pending[0]?.changeSats).toBe(change)
    expect(player.pending[0]?.changeAddress).toBe(player.wallets[0].addresses[1]?.value)
    expect(pendingSatsForAddress(player, from)).toBe(0)
    expect(pendingSatsForAddress(player, player.pending[0]!.changeAddress!)).toBe(change)
    expect(walletSats(player.wallets[0])).toBe(0)
    expect(walletSats(player.wallets[1])).toBe(0)
    expect(pendingSats(player, 'w-1')).toBe(change)
    expect(pendingSats(player, 'w-2')).toBe(sent)
    expect(totalSats(player)).toBe(0)

    player = advanceBlock(player, INITIAL_MARKET_RATE)

    expect(player.pending).toHaveLength(0)
    expect(player.wallets[0].addresses[0]?.sats).toBe(0)
    expect(player.wallets[0].addresses[1]?.sats).toBe(change)
    expect(walletSats(player.wallets[0])).toBe(change)
    expect(walletSats(player.wallets[1])).toBe(sent)
    expect(player.wallets[1].addresses[0]?.sats).toBe(sent)
  })

  it('send-all has no change output and does not open a new address', () => {
    let { player, to } = twoWallets()
    const sent = cadToSats(100) - highFee

    player = sendBitcoin(player, 'w-1', to, sent, quotes.high)

    expect(player.pending[0]?.changeSats).toBe(0)
    expect(player.pending[0]?.changeAddress).toBeNull()
    expect(player.wallets[0].addresses).toHaveLength(1)
    expect(walletSats(player.wallets[0])).toBe(0)

    player = advanceBlock(player, INITIAL_MARKET_RATE)

    expect(walletSats(player.wallets[0])).toBe(0)
    expect(walletSats(player.wallets[1])).toBe(sent)
  })

  it('prefers an existing empty address for change instead of deriving another', () => {
    let { player, to } = twoWallets()
    player = createAddress(player, 'w-1')
    const spare = receiveAddress(player.wallets[0])
    const sent = 25_000

    player = sendBitcoin(player, 'w-1', to, sent, quotes.high)

    expect(player.wallets[0].addresses).toHaveLength(2)
    expect(player.pending[0]?.changeAddress).toBe(spare)
  })

  it('advances the receive address when a new one is created after copy', () => {
    const { player } = twoWallets()
    const first = receiveAddress(player.wallets[0])
    const next = createAddress(player, 'w-1')

    expect(receiveAddress(next.wallets[0])).not.toBe(first)
    expect(receiveAddress(next.wallets[0])).toBe(walletAddress(player.wallets[0].seed, 1))
  })

  it('lands on wallet 2, then can be sent back to wallet 1', () => {
    let { player, from, to } = twoWallets()
    const start = cadToSats(100)
    const sent = 40_000
    const change = start - sent - highFee

    player = sendBitcoin(player, 'w-1', to, sent, quotes.high)
    expect(player.pending[0]?.walletId).toBe('w-2')
    expect(walletSats(player.wallets[0])).toBe(0)
    expect(pendingSats(player, 'w-1')).toBe(change)
    expect(walletSats(player.wallets[1])).toBe(0)

    player = advanceBlock(player, INITIAL_MARKET_RATE)

    expect(walletSats(player.wallets[1])).toBe(sent)
    expect(walletSats(player.wallets[0])).toBe(change)
    expect(player.wallets[0].addresses[0]?.sats).toBe(0)
    expect(player.wallets[1].addresses[0]?.value).toBe(to)
    expect(player.wallets[1].addresses[0]?.sats).toBe(sent)

    const back = 10_000
    const w2Change = sent - back - highFee
    player = sendBitcoin(player, 'w-2', from, back, quotes.high)
    expect(player.pending[0]?.walletId).toBe('w-1')
    expect(player.pending[0]?.fromWalletId).toBe('w-2')
    expect(walletSats(player.wallets[1])).toBe(0)
    expect(pendingSats(player, 'w-2')).toBe(w2Change)

    player = advanceBlock(player, INITIAL_MARKET_RATE)

    expect(walletSats(player.wallets[1])).toBe(w2Change)
    expect(walletSats(player.wallets[0])).toBe(change + back)
    expect(player.wallets[0].addresses[0]?.sats).toBe(back)
  })

  it('credits a later address of wallet 2, not wallet 1', () => {
    let { player } = twoWallets()
    player = createAddress(player, 'w-2')
    const to = receiveAddress(player.wallets[1])
    const sent = 25_000
    const change = cadToSats(100) - sent - highFee

    expect(to).not.toBe(player.wallets[0].addresses[0]?.value)
    expect(to).not.toBe(player.wallets[1].addresses[0]?.value)
    expect(findWalletByAddress(player, to)?.id).toBe('w-2')

    player = sendBitcoin(player, 'w-1', to, sent, quotes.high)
    expect(player.pending[0]?.walletId).toBe('w-2')
    expect(player.pending[0]?.address).toBe(to)

    player = advanceBlock(player, INITIAL_MARKET_RATE)

    expect(player.wallets[1].addresses[1]?.sats).toBe(sent)
    expect(player.wallets[1].addresses[0]?.sats).toBe(0)
    expect(walletSats(player.wallets[0])).toBe(change)
    expect(player.wallets[0].addresses[0]?.sats).toBe(0)
    expect(player.wallets[0].addresses.some((item) => item.sats === sent)).toBe(false)
  })

  it('burns the miner fee from the sender, not from the amount received', () => {
    let { player, to } = twoWallets()
    const sent = cadToSats(50)
    const change = cadToSats(100) - sent - highFee

    player = sendBitcoin(player, 'w-1', to, sent, quotes.high)

    expect(walletSats(player.wallets[0])).toBe(0)
    expect(pendingSats(player, 'w-1')).toBe(change)

    player = advanceBlock(player, INITIAL_MARKET_RATE)

    expect(walletSats(player.wallets[1])).toBe(sent)
    expect(walletSats(player.wallets[0])).toBe(change)
    expect(totalSats(player)).toBe(cadToSats(100) - highFee)
  })

  it('burns sats sent to an unknown address once the block confirms', () => {
    let { player } = twoWallets()
    const sent = cadToSats(50)
    const change = cadToSats(100) - sent - highFee

    player = sendBitcoin(player, 'w-1', 'lc1qnotanyoneinthecafe00000000000000', sent, quotes.high)

    expect(walletSats(player.wallets[0])).toBe(0)
    expect(pendingSats(player, 'w-1')).toBe(change)
    expect(player.pending[0]?.walletId).toBeNull()

    player = advanceBlock(player, INITIAL_MARKET_RATE)

    expect(player.pending).toHaveLength(0)
    expect(walletSats(player.wallets[0])).toBe(change)
    expect(totalSats(player)).toBe(change)
  })

  it('cannot spend change until the send confirms', () => {
    let { player, to } = twoWallets()
    player = sendBitcoin(player, 'w-1', to, cadToSats(40), quotes.high)

    expect(player.wallets[0].addresses[0]?.sats).toBe(0)
    expect(walletSats(player.wallets[0])).toBe(0)
    expect(() => sendBitcoin(player, 'w-1', to, cadToSats(70), quotes.high)).toThrow('insufficient-sats')
  })

  it('refuses a bad amount, an empty address, or a send that cannot cover the fee', () => {
    const { player, to } = twoWallets()

    expect(() => sendBitcoin(player, 'w-1', to, 0, quotes.high)).toThrow('amount-invalid')
    expect(() => sendBitcoin(player, 'w-1', '   ', 1, quotes.high)).toThrow('address-invalid')
    expect(() => sendBitcoin(player, 'w-9', to, 1, quotes.high)).toThrow('wallet-missing')
    expect(() => sendBitcoin(player, 'w-1', to, cadToSats(100), quotes.high)).toThrow('insufficient-sats')
  })

  it('keeps a cheap send in the mempool until the market drops', () => {
    let { player, to } = twoWallets()
    const sent = cadToSats(100) - lowFee
    player = sendBitcoin(player, 'w-1', to, sent, quotes.low)

    player = advanceBlock(player, INITIAL_MARKET_RATE, () => 1)
    expect(walletSats(player.wallets[1])).toBe(0)
    expect(player.pending).toHaveLength(1)

    player = advanceBlock(player, 1, () => 1)
    expect(walletSats(player.wallets[1])).toBe(sent)
  })
})
