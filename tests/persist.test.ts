import { describe, expect, it } from 'vitest'
import { createInitialChain, INITIAL_MARKET_RATE, marketQuotes } from '../src/simulation/chain'
import {
  advanceBlock,
  buyBitcoin,
  createInitialPlayer,
  createWallet,
  ingestRemoteTx,
  receiveAddress,
  STARTING_CAD,
  totalSats,
} from '../src/simulation/player'
import {
  clearPersist,
  hydrateSandbox,
  parsePersist,
  persistBlob,
  playerForRoomReload,
  PERSIST_VERSION,
  readPersistRaw,
  writePersist,
} from '../src/simulation/persist'

function memoryStore(initial: Record<string, string> = {}) {
  const data = { ...initial }
  return {
    getItem: (key: string) => data[key] ?? null,
    setItem: (key: string, value: string) => {
      data[key] = value
    },
    removeItem: (key: string) => {
      delete data[key]
    },
  }
}

describe('sandbox persist', () => {
  it('round-trips a solo snapshot through JSON', () => {
    let player = createWallet(createInitialPlayer(), 'Wallet 1')
    player = buyBitcoin(player, receiveAddress(player.wallets[0]), 100, 100_000, marketQuotes(INITIAL_MARKET_RATE).high)
    const chain = createInitialChain()
    const blob = persistBlob(player, chain, 41)
    const parsed = parsePersist(JSON.stringify(blob))

    expect(parsed?.version).toBe(PERSIST_VERSION)
    expect(parsed?.secondsLeft).toBe(41)
    expect(parsed?.player.wallets).toHaveLength(1)
    expect(parsed?.player.wallets[0]?.name).toBe('Wallet 1')
    expect(parsed?.player.wallets[0]?.seed).toHaveLength(12)
    expect(parsed?.player.pending).toHaveLength(1)
    expect(parsed?.chain.nextHeight).toBe(chain.nextHeight)
  })

  it('rejects garbage instead of crashing', () => {
    expect(parsePersist(null)).toBeNull()
    expect(parsePersist('{')).toBeNull()
    expect(parsePersist('{"version":2}')).toBeNull()
    expect(parsePersist('{"version":1,"player":{},"chain":{},"secondsLeft":1}')).toBeNull()
  })

  it('solo hydrate keeps wallets, pending sats, and the saved chain', () => {
    let player = createWallet(createInitialPlayer(), 'Wallet 1')
    player = buyBitcoin(player, receiveAddress(player.wallets[0]), 100, 100_000, marketQuotes(INITIAL_MARKET_RATE).high)
    const chain = { ...createInitialChain(), nextHeight: 912_040 }
    const raw = JSON.stringify(persistBlob(player, chain, 12))
    const hydrated = hydrateSandbox(raw, null, 60)

    expect(hydrated.player.wallets[0]?.name).toBe('Wallet 1')
    expect(hydrated.player.pending).toHaveLength(1)
    expect(hydrated.chain.nextHeight).toBe(912_040)
    expect(hydrated.secondsLeft).toBe(12)
  })

  it('cafe reload keeps the 12 words but lets catch-up credit sats once', () => {
    let player = createWallet(createInitialPlayer(), 'Wallet 1')
    const address = receiveAddress(player.wallets[0])
    player = buyBitcoin(player, address, 100, 100_000, marketQuotes(INITIAL_MARKET_RATE).high)
    const tx = player.pending[0]
    expect(tx).toBeDefined()

    player = advanceBlock(player, INITIAL_MARKET_RATE, () => 0, 912_005)
    expect(totalSats(player)).toBeGreaterThan(0)

    const reloaded = playerForRoomReload(player)
    expect(reloaded.wallets[0]?.seed).toEqual(player.wallets[0]?.seed)
    expect(reloaded.wallets[0]?.addresses.some((item) => item.value === address)).toBe(true)
    expect(totalSats(reloaded)).toBe(0)
    expect(reloaded.pending).toHaveLength(0)
    expect(reloaded.settled).toHaveLength(0)
    expect(reloaded.cad).toBe(player.cad)

    const afterCatchUp = advanceBlock(
      ingestRemoteTx(reloaded, {
        kind: 'buy',
        address: tx!.address,
        sats: tx!.sats,
        fee_rate: tx!.feeRate,
        id: tx!.id,
      }),
      INITIAL_MARKET_RATE,
      () => 0,
      912_005,
    )
    expect(totalSats(afterCatchUp)).toBe(totalSats(player))
  })

  it('hydrate with a room ignores the saved chain', () => {
    const player = createWallet(createInitialPlayer(), 'Wallet 1')
    const chain = { ...createInitialChain(), nextHeight: 999_999 }
    const raw = JSON.stringify(persistBlob(player, chain, 3))
    const hydrated = hydrateSandbox(raw, 'room-abc', 60)

    expect(hydrated.chain.nextHeight).toBe(createInitialChain().nextHeight)
    expect(hydrated.player.wallets[0]?.name).toBe('Wallet 1')
    expect(totalSats(hydrated.player)).toBe(0)
    expect(hydrated.secondsLeft).toBe(60)
  })

  it('hydrate without a snapshot starts a fresh sandbox', () => {
    const hydrated = hydrateSandbox(null, null, 60)
    expect(hydrated.player.cad).toBe(STARTING_CAD)
    expect(hydrated.player.wallets).toHaveLength(0)
    expect(hydrated.chain.nextHeight).toBe(createInitialChain().nextHeight)
    expect(hydrated.secondsLeft).toBe(60)
  })

  it('writes and clears through a storage stand-in', () => {
    const storage = memoryStore()
    const player = createWallet(createInitialPlayer(), 'Wallet 1')
    writePersist(persistBlob(player, createInitialChain(), 20), storage)
    const parsed = parsePersist(readPersistRaw(storage))
    expect(parsed?.player.wallets[0]?.name).toBe('Wallet 1')
    clearPersist(storage)
    expect(readPersistRaw(storage)).toBeNull()
  })
})
