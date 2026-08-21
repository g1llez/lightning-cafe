import { describe, expect, it } from 'vitest'
import {
  BASE_NETWORK,
  DEFAULT_PUBLIC_NODE_ID,
  EXCHANGE_NODE_ID,
  MEMPOOL_NODE_ID,
  NODE_DISC_RADIUS,
  OWN_NODE_ID,
  OWN_NODE_SYNC_BLOCKS,
  PUBLIC_NODES,
  availableBroadcastNodes,
  edgeEndpoints,
  edgeEndGaps,
  isOwnNodeReady,
  orangeDiscRadius,
  ownNodeBlocksSynced,
  ownNodeProgressPercent,
  pickBlockOrigin,
  propagationHops,
  resolveBroadcastNode,
  visibleEdges,
  visibleNetwork,
} from '../src/simulation/nodes'
import {
  createInitialPlayer,
  createOwnNode,
  createWallet,
  deleteOwnNode,
  noteNodeSawUs,
  nodeSawUs,
  renameOwnNode,
  selectBroadcastNode,
  advanceBlock,
} from '../src/simulation/player'
import {
  hydrateSandbox,
  parsePersist,
  persistBlob,
} from '../src/simulation/persist'
import { createInitialChain, INITIAL_MARKET_RATE, sandboxBlockInterval } from '../src/simulation/chain'

describe('bitcoin broadcast nodes', () => {
  it('lists public relays and optional own node once synced', () => {
    expect(PUBLIC_NODES.length).toBeGreaterThanOrEqual(2)
    expect(availableBroadcastNodes(null, 100)).toHaveLength(PUBLIC_NODES.length)
    const syncing = { id: OWN_NODE_ID, name: 'Maison', syncStartHeight: 100, syncedBlocks: 0 }
    expect(availableBroadcastNodes(syncing, 100)).toHaveLength(PUBLIC_NODES.length)
    const ready = { id: OWN_NODE_ID, name: 'Maison', syncStartHeight: 100, syncedBlocks: OWN_NODE_SYNC_BLOCKS }
    expect(availableBroadcastNodes(ready, 100 + OWN_NODE_SYNC_BLOCKS).some((node) => node.kind === 'own')).toBe(
      true,
    )
  })

  it('creates at most one own node and keeps public selected while syncing', () => {
    let player = createInitialPlayer()
    expect(player.ownNode).toBeNull()
    expect(player.selectedNodeId).toBe(DEFAULT_PUBLIC_NODE_ID)
    player = createOwnNode(player, '  Ma node  ', 912_004)
    expect(player.ownNode?.name).toBe('Ma node')
    expect(player.ownNode?.syncStartHeight).toBe(912_004)
    expect(player.ownNode?.syncedBlocks).toBe(0)
    expect(player.selectedNodeId).toBe(DEFAULT_PUBLIC_NODE_ID)
    expect(isOwnNodeReady(player.ownNode!)).toBe(false)
    player = advanceBlock(player, INITIAL_MARKET_RATE, null, 912_005)
    player = advanceBlock(player, INITIAL_MARKET_RATE, null, 912_006)
    player = advanceBlock(player, INITIAL_MARKET_RATE, null, 912_007)
    expect(ownNodeBlocksSynced(player.ownNode!)).toBe(3)
    player = advanceBlock(player, INITIAL_MARKET_RATE, null, 912_008)
    expect(isOwnNodeReady(player.ownNode!)).toBe(true)
    expect(() => createOwnNode(player, 'Autre', 912_008)).toThrow('own-node-exists')
  })

  it('refuses selecting own node while syncing', () => {
    let player = createOwnNode(createInitialPlayer(), 'Maison', 100)
    expect(() => selectBroadcastNode(player, OWN_NODE_ID, 100)).toThrow('own-node-syncing')
    for (let height = 101; height <= 100 + OWN_NODE_SYNC_BLOCKS; height += 1) {
      player = advanceBlock(player, INITIAL_MARKET_RATE, null, height)
    }
    player = selectBroadcastNode(player, OWN_NODE_ID, 100 + OWN_NODE_SYNC_BLOCKS)
    expect(player.selectedNodeId).toBe(OWN_NODE_ID)
  })

  it('falls back to a public relay when the own node is removed', () => {
    let player = createOwnNode(createInitialPlayer(), 'Maison', 50)
    for (let height = 51; height <= 50 + OWN_NODE_SYNC_BLOCKS; height += 1) {
      player = advanceBlock(player, INITIAL_MARKET_RATE, null, height)
    }
    player = selectBroadcastNode(player, OWN_NODE_ID, 50 + OWN_NODE_SYNC_BLOCKS)
    player = deleteOwnNode(player)
    expect(player.ownNode).toBeNull()
    expect(player.selectedNodeId).toBe(DEFAULT_PUBLIC_NODE_ID)
  })

  it('resolves public and own selections', () => {
    const ready = { id: OWN_NODE_ID, name: 'Maison', syncStartHeight: 0, syncedBlocks: OWN_NODE_SYNC_BLOCKS }
    const syncing = { id: OWN_NODE_ID, name: 'Maison', syncStartHeight: 0, syncedBlocks: 0 }
    expect(resolveBroadcastNode(DEFAULT_PUBLIC_NODE_ID, ready, 10)?.kind).toBe('public')
    expect(resolveBroadcastNode(OWN_NODE_ID, ready, OWN_NODE_SYNC_BLOCKS)?.kind).toBe('own')
    expect(resolveBroadcastNode(OWN_NODE_ID, syncing, 1)).toBeNull()
    expect(resolveBroadcastNode(OWN_NODE_ID, null, 10)).toBeNull()
  })

  it('persists own node sync height across hydrate', () => {
    let player = createWallet(createInitialPlayer(), 'W1')
    player = createOwnNode(player, 'Maison', 912_000)
    player = selectBroadcastNode(player, DEFAULT_PUBLIC_NODE_ID, 912_000)
    const chain = createInitialChain()
    const blob = persistBlob(player, chain, 40)
    const parsed = parsePersist(JSON.stringify(blob))
    expect(parsed?.player.ownNode?.name).toBe('Maison')
    expect(parsed?.player.ownNode?.syncStartHeight).toBe(912_000)
    expect(parsed?.player.selectedNodeId).toBe(DEFAULT_PUBLIC_NODE_ID)
    const hydrated = hydrateSandbox(JSON.stringify(blob), null, sandboxBlockInterval())
    expect(hydrated.player.ownNode?.syncStartHeight).toBe(912_000)
    expect(hydrated.player.ownNode?.syncedBlocks).toBe(0)
  })

  it('persists which public nodes already saw our traffic', () => {
    let player = noteNodeSawUs(createInitialPlayer(), DEFAULT_PUBLIC_NODE_ID)
    player = noteNodeSawUs(player, DEFAULT_PUBLIC_NODE_ID)
    player = noteNodeSawUs(player, OWN_NODE_ID)
    expect(player.seenByNodeIds).toEqual([DEFAULT_PUBLIC_NODE_ID])
    const hydrated = hydrateSandbox(
      JSON.stringify(persistBlob(player, createInitialChain(), 40)),
      null,
      sandboxBlockInterval(),
    )
    expect(nodeSawUs(hydrated.player, DEFAULT_PUBLIC_NODE_ID)).toBe(true)
    expect(hydrated.player.seenByNodeIds).toEqual([DEFAULT_PUBLIC_NODE_ID])
  })

  it('keeps IBD progress when a cafe reload rewinds the chain', () => {
    let player = createOwnNode(createWallet(createInitialPlayer(), 'W1'), 'Maison', 912_020)
    player = advanceBlock(player, INITIAL_MARKET_RATE, null, 912_021)
    player = advanceBlock(player, INITIAL_MARKET_RATE, null, 912_022)
    const chain = { ...createInitialChain(), nextHeight: 999_999 }
    const hydrated = hydrateSandbox(JSON.stringify(persistBlob(player, chain, 40)), 'room-abc', 60)
    expect(hydrated.chain.nextHeight).toBe(createInitialChain().nextHeight)
    expect(hydrated.player.ownNode?.syncedBlocks).toBe(2)
    expect(ownNodeProgressPercent(hydrated.player.ownNode!, hydrated.chain.confirmed[0]!.height, 0)).toBe(
      50,
    )
  })
  it('renames the own node', () => {
    let player = createOwnNode(createInitialPlayer(), 'Maison', 100)
    player = renameOwnNode(player, '  Cave  ')
    expect(player.ownNode?.name).toBe('Cave')
    expect(() => renameOwnNode(player, '   ')).toThrow('own-node-name')
  })

  it('reports sync as a percent of mined blocks, not chain height', () => {
    const own = { id: OWN_NODE_ID, name: 'Maison', syncStartHeight: 100, syncedBlocks: 0 }
    expect(ownNodeProgressPercent(own, 100, 0)).toBe(0)
    expect(ownNodeProgressPercent(own, 100, 0.5)).toBe(13)
    expect(ownNodeProgressPercent({ ...own, syncedBlocks: 2 }, 102, 0)).toBe(50)
    expect(ownNodeProgressPercent({ ...own, syncedBlocks: 4 }, 104, 0)).toBe(100)
  })

  it('does not restart IBD when the next block lands or the cafe chain is shorter', () => {
    let player = createOwnNode(createInitialPlayer(), 'Maison', 912_020)
    expect(ownNodeProgressPercent(player.ownNode!, 912_020, 0.8)).toBe(20)
    player = advanceBlock(player, INITIAL_MARKET_RATE, null, 912_021)
    expect(ownNodeBlocksSynced(player.ownNode!)).toBe(1)
    expect(ownNodeProgressPercent(player.ownNode!, 912_021, 0)).toBe(25)
    player = advanceBlock(player, INITIAL_MARKET_RATE, null, 912_022)
    expect(ownNodeProgressPercent(player.ownNode!, 912_022, 0)).toBe(50)
    expect(ownNodeProgressPercent(player.ownNode!, 912_004, 0.8)).toBe(70)
    player = advanceBlock(player, INITIAL_MARKET_RATE, null, 912_005)
    expect(ownNodeProgressPercent(player.ownNode!, 912_005, 0)).toBe(75)
    player = advanceBlock(player, INITIAL_MARKET_RATE, null, 912_006)
    expect(isOwnNodeReady(player.ownNode!)).toBe(true)
    expect(ownNodeProgressPercent(player.ownNode!, 912_006, 0.9)).toBe(100)
  })

  it('does not count cafe catch-up ticks as IBD', () => {
    let player = createOwnNode(createInitialPlayer(), 'Maison', 912_020)
    player = advanceBlock(player, INITIAL_MARKET_RATE, null, 912_005, false)
    player = advanceBlock(player, INITIAL_MARKET_RATE, null, 912_006, false)
    expect(ownNodeBlocksSynced(player.ownNode!)).toBe(0)
    player = advanceBlock(player, INITIAL_MARKET_RATE, null, 912_007)
    expect(ownNodeBlocksSynced(player.ownNode!)).toBe(1)
  })

  it('shortens edges to the disc rim', () => {
    const ends = edgeEndpoints(0, 0, 100, 0, NODE_DISC_RADIUS)
    expect(ends.x1).toBeCloseTo(NODE_DISC_RADIUS)
    expect(ends.x2).toBeCloseTo(100 - NODE_DISC_RADIUS)
    expect(ends.y1).toBe(0)
    expect(ends.y2).toBe(0)
  })
})

describe('L1 peer graph', () => {
  it('keeps base peers under the 8-node cap and adds own', () => {
    expect(BASE_NETWORK).toHaveLength(7)
    expect(BASE_NETWORK.some((node) => node.id === MEMPOOL_NODE_ID)).toBe(true)
    expect(pickBlockOrigin(() => 0)).not.toBe(MEMPOOL_NODE_ID)
    const exchange = BASE_NETWORK.find((node) => node.id === EXCHANGE_NODE_ID)!
    expect(exchange.x).not.toBe(50)
    expect(exchange.y).toBeGreaterThan(50)
    const withOwn = visibleNetwork({ id: OWN_NODE_ID, name: 'Maison', syncStartHeight: 1, syncedBlocks: 0 })
    expect(withOwn).toHaveLength(8)
    const ids = new Set(withOwn.map((node) => node.id))
    expect(visibleEdges(ids).some((edge) => edge.a === OWN_NODE_ID || edge.b === OWN_NODE_ID)).toBe(true)
    const withPeer = visibleNetwork(null, [{ id: 'peer-pc-b', name: 'Cave' }])
    expect(withPeer.some((node) => node.id === 'peer-pc-b' && node.kind === 'peer')).toBe(true)
    const peerIds = new Set(withPeer.map((node) => node.id))
    expect(visibleEdges(peerIds).some((edge) => edge.a === 'peer-pc-b' || edge.b === 'peer-pc-b')).toBe(
      true,
    )
  })

  it('propagates from origin until every peer is reached', () => {
    const nodes = visibleNetwork(null)
    const ids = new Set(nodes.map((node) => node.id))
    const edges = visibleEdges(ids)
    const hops = propagationHops(EXCHANGE_NODE_ID, edges, 500)
    const reached = new Set<string>([EXCHANGE_NODE_ID])
    for (const hop of hops) {
      expect(reached.has(hop.fromId)).toBe(true)
      reached.add(hop.toId)
    }
    expect(reached.size).toBe(nodes.length)
    expect(hops.every((hop) => hop.delayMs % 500 === 0)).toBe(true)
    expect(hops[0]?.delayMs).toBe(500)
    expect(hops.some((hop) => hop.toId === MEMPOOL_NODE_ID)).toBe(true)
    const firstWave = hops.filter((hop) => hop.fromId === EXCHANGE_NODE_ID)
    expect(firstWave.length).toBeGreaterThan(1)
    expect(new Set(firstWave.map((hop) => hop.delayMs)).size).toBe(1)
  })

  it('touches the orange disc of every node (desktop graph vs h-11 icon)', () => {
    expect(NODE_DISC_RADIUS).toBe(orangeDiscRadius())
    const nodes = visibleNetwork({ id: OWN_NODE_ID, name: 'Maison', syncStartHeight: 1, syncedBlocks: 0 })
    const ids = new Set(nodes.map((node) => node.id))
    const edges = visibleEdges(ids)
    const disc = orangeDiscRadius()
    const misses = edgeEndGaps(nodes, edges, disc).filter((row) => Math.abs(row.gap) > 0.05)
    expect(misses).toEqual([])
  })
})
