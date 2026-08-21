import { describe, expect, it } from 'vitest'
import {
  availableBroadcastNodes,
  DEFAULT_PUBLIC_NODE_ID,
  PUBLIC_NODES,
  resolveBroadcastNode,
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
  it('lists public relays and optional own node', () => {
    expect(PUBLIC_NODES.length).toBeGreaterThanOrEqual(2)
    expect(availableBroadcastNodes(null)).toHaveLength(PUBLIC_NODES.length)
    const withOwn = availableBroadcastNodes({ id: 'own-node', name: 'Maison' })
    expect(withOwn.some((node) => node.kind === 'own')).toBe(true)
  })

  it('creates at most one own node and selects it', () => {
    let player = createInitialPlayer()
    expect(player.ownNode).toBeNull()
    expect(player.selectedNodeId).toBe(DEFAULT_PUBLIC_NODE_ID)
    player = createOwnNode(player, '  Ma node  ')
    expect(player.ownNode?.name).toBe('Ma node')
    expect(player.selectedNodeId).toBe('own-node')
    expect(() => createOwnNode(player, 'Autre')).toThrow('own-node-exists')
  })

  it('falls back to a public relay when the own node is removed', () => {
    let player = createOwnNode(createInitialPlayer(), 'Maison')
    player = deleteOwnNode(player)
    expect(player.ownNode).toBeNull()
    expect(player.selectedNodeId).toBe(DEFAULT_PUBLIC_NODE_ID)
  })

  it('resolves public and own selections', () => {
    const own = { id: 'own-node', name: 'Maison' }
    expect(resolveBroadcastNode(DEFAULT_PUBLIC_NODE_ID, own)?.kind).toBe('public')
    expect(resolveBroadcastNode('own-node', own)?.kind).toBe('own')
    expect(resolveBroadcastNode('own-node', null)).toBeNull()
  })

  it('persists own node across hydrate', () => {
    let player = createWallet(createInitialPlayer(), 'W1')
    player = createOwnNode(player, 'Maison')
    player = selectBroadcastNode(player, DEFAULT_PUBLIC_NODE_ID)
    const chain = createInitialChain()
    const blob = persistBlob(player, chain, 40)
    const parsed = parsePersist(JSON.stringify(blob))
    expect(parsed?.player.ownNode?.name).toBe('Maison')
    expect(parsed?.player.selectedNodeId).toBe(DEFAULT_PUBLIC_NODE_ID)
    const hydrated = hydrateSandbox(JSON.stringify(blob), null, sandboxBlockInterval())
    expect(hydrated.player.ownNode?.name).toBe('Maison')
  })
})
