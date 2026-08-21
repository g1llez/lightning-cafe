import { describe, expect, it } from 'vitest'
import {
  BASE_NETWORK,
  DEFAULT_PUBLIC_NODE_ID,
  EXCHANGE_NODE_ID,
  OWN_NODE_ID,
  OWN_NODE_SYNC_BLOCKS,
  PUBLIC_NODES,
  availableBroadcastNodes,
  isOwnNodeReady,
  ownNodeBlocksSynced,
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
  selectBroadcastNode,
} from '../src/simulation/player'
import {
  hydrateSandbox,
  parsePersist,
  persistBlob,
} from '../src/simulation/persist'
import { createInitialChain, sandboxBlockInterval } from '../src/simulation/chain'

describe('bitcoin broadcast nodes', () => {
  it('lists public relays and optional own node once synced', () => {
    expect(PUBLIC_NODES.length).toBeGreaterThanOrEqual(2)
    expect(availableBroadcastNodes(null, 100)).toHaveLength(PUBLIC_NODES.length)
    const syncing = { id: OWN_NODE_ID, name: 'Maison', syncStartHeight: 100 }
    expect(availableBroadcastNodes(syncing, 100)).toHaveLength(PUBLIC_NODES.length)
    const ready = { id: OWN_NODE_ID, name: 'Maison', syncStartHeight: 100 }
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
    expect(player.selectedNodeId).toBe(DEFAULT_PUBLIC_NODE_ID)
    expect(isOwnNodeReady(player.ownNode!, 912_004)).toBe(false)
    expect(ownNodeBlocksSynced(player.ownNode!, 912_007)).toBe(3)
    expect(isOwnNodeReady(player.ownNode!, 912_008)).toBe(true)
    expect(() => createOwnNode(player, 'Autre', 912_008)).toThrow('own-node-exists')
  })

  it('refuses selecting own node while syncing', () => {
    let player = createOwnNode(createInitialPlayer(), 'Maison', 100)
    expect(() => selectBroadcastNode(player, OWN_NODE_ID, 100)).toThrow('own-node-syncing')
    player = selectBroadcastNode(player, OWN_NODE_ID, 100 + OWN_NODE_SYNC_BLOCKS)
    expect(player.selectedNodeId).toBe(OWN_NODE_ID)
  })

  it('falls back to a public relay when the own node is removed', () => {
    let player = createOwnNode(createInitialPlayer(), 'Maison', 50)
    player = selectBroadcastNode(player, OWN_NODE_ID, 50 + OWN_NODE_SYNC_BLOCKS)
    player = deleteOwnNode(player)
    expect(player.ownNode).toBeNull()
    expect(player.selectedNodeId).toBe(DEFAULT_PUBLIC_NODE_ID)
  })

  it('resolves public and own selections', () => {
    const own = { id: OWN_NODE_ID, name: 'Maison', syncStartHeight: 0 }
    expect(resolveBroadcastNode(DEFAULT_PUBLIC_NODE_ID, own, 10)?.kind).toBe('public')
    expect(resolveBroadcastNode(OWN_NODE_ID, own, OWN_NODE_SYNC_BLOCKS)?.kind).toBe('own')
    expect(resolveBroadcastNode(OWN_NODE_ID, own, 1)).toBeNull()
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
  })
})

describe('L1 peer graph', () => {
  it('keeps base peers under the 8-node cap and adds own', () => {
    expect(BASE_NETWORK).toHaveLength(7)
    expect(BASE_NETWORK.some((node) => node.id === EXCHANGE_NODE_ID)).toBe(true)
    const withOwn = visibleNetwork({ id: OWN_NODE_ID, name: 'Maison', syncStartHeight: 1 })
    expect(withOwn).toHaveLength(8)
    const ids = new Set(withOwn.map((node) => node.id))
    expect(visibleEdges(ids).some((edge) => edge.a === OWN_NODE_ID || edge.b === OWN_NODE_ID)).toBe(true)
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
  })
})
