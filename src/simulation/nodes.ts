/**
 * L1 peer graph for the sandbox: public relays, NPC full nodes, the exchange,
 * and optionally the player's own node (syncs over OWN_NODE_SYNC_BLOCKS).
 */

export type NodeKind = 'public' | 'npc' | 'exchange' | 'own'

export type NetworkNode = {
  id: string
  name: string
  kind: NodeKind
  /** Stable layout in a 100×100 viewBox. */
  x: number
  y: number
}

export type BroadcastNode = {
  id: string
  name: string
  kind: 'public' | 'own'
}

export type NetworkEdge = {
  a: string
  b: string
}

export type PropagationHop = {
  fromId: string
  toId: string
  delayMs: number
}

/** Fictional public relays — also appear in Send. */
export const PUBLIC_NODES: BroadcastNode[] = [
  { id: 'pub-cafe-relay', name: 'Café Relay', kind: 'public' },
  { id: 'pub-clearnet', name: 'Clearnet Electrum-like', kind: 'public' },
  { id: 'pub-fast-spy', name: 'Fast Spyglass', kind: 'public' },
]

export const DEFAULT_PUBLIC_NODE_ID = PUBLIC_NODES[0]!.id
export const EXCHANGE_NODE_ID = 'ex-cafe-desk'
export const OWN_NODE_ID = 'own-node'
export const OWN_NODE_SYNC_BLOCKS = 4
export const PROPAGATION_HOP_MS = 500

/** Always-on peers (no player node). Max 7; own makes 8. */
export const BASE_NETWORK: NetworkNode[] = [
  { id: 'pub-cafe-relay', name: 'Café Relay', kind: 'public', x: 22, y: 28 },
  { id: 'pub-clearnet', name: 'Clearnet', kind: 'public', x: 50, y: 14 },
  { id: 'pub-fast-spy', name: 'Spyglass', kind: 'public', x: 78, y: 28 },
  { id: EXCHANGE_NODE_ID, name: 'Café Exchange', kind: 'exchange', x: 50, y: 48 },
  { id: 'npc-harbor', name: 'Harbor Peer', kind: 'npc', x: 18, y: 62 },
  { id: 'npc-northwind', name: 'Northwind Full', kind: 'npc', x: 82, y: 62 },
  { id: 'npc-mesa', name: 'Mesa Archive', kind: 'npc', x: 50, y: 78 },
]

/** Undirected mesh — sparse enough to read hops. */
export const NETWORK_EDGES: NetworkEdge[] = [
  { a: 'pub-cafe-relay', b: 'pub-clearnet' },
  { a: 'pub-clearnet', b: 'pub-fast-spy' },
  { a: 'pub-cafe-relay', b: EXCHANGE_NODE_ID },
  { a: 'pub-fast-spy', b: EXCHANGE_NODE_ID },
  { a: 'pub-clearnet', b: EXCHANGE_NODE_ID },
  { a: 'pub-cafe-relay', b: 'npc-harbor' },
  { a: EXCHANGE_NODE_ID, b: 'npc-harbor' },
  { a: EXCHANGE_NODE_ID, b: 'npc-northwind' },
  { a: 'pub-fast-spy', b: 'npc-northwind' },
  { a: 'npc-harbor', b: 'npc-mesa' },
  { a: 'npc-northwind', b: 'npc-mesa' },
  { a: EXCHANGE_NODE_ID, b: 'npc-mesa' },
  /** Own node plugs into the mesh when present. */
  { a: OWN_NODE_ID, b: EXCHANGE_NODE_ID },
  { a: OWN_NODE_ID, b: 'pub-cafe-relay' },
  { a: OWN_NODE_ID, b: 'npc-mesa' },
]

export type OwnNode = {
  id: string
  name: string
  /** Tip height when the node was added; ready after +OWN_NODE_SYNC_BLOCKS. */
  syncStartHeight: number
}

export function publicNodeById(id: string): BroadcastNode | undefined {
  return PUBLIC_NODES.find((node) => node.id === id)
}

export function tipHeight(confirmedHeight: number): number {
  return confirmedHeight
}

export function ownNodeBlocksSynced(own: OwnNode, tip: number): number {
  return Math.min(OWN_NODE_SYNC_BLOCKS, Math.max(0, tip - own.syncStartHeight))
}

export function isOwnNodeReady(own: OwnNode, tip: number): boolean {
  return ownNodeBlocksSynced(own, tip) >= OWN_NODE_SYNC_BLOCKS
}

export function ownNodeProgress(own: OwnNode, tip: number): number {
  return ownNodeBlocksSynced(own, tip) / OWN_NODE_SYNC_BLOCKS
}

export function resolveBroadcastNode(
  selectedId: string | null,
  ownNode: OwnNode | null,
  tip: number,
): BroadcastNode | null {
  if (!selectedId) {
    return null
  }
  const pub = publicNodeById(selectedId)
  if (pub) {
    return pub
  }
  if (ownNode && ownNode.id === selectedId && isOwnNodeReady(ownNode, tip)) {
    return { id: ownNode.id, name: ownNode.name, kind: 'own' }
  }
  return null
}

export function availableBroadcastNodes(ownNode: OwnNode | null, tip: number): BroadcastNode[] {
  if (!ownNode || !isOwnNodeReady(ownNode, tip)) {
    return [...PUBLIC_NODES]
  }
  return [...PUBLIC_NODES, { id: ownNode.id, name: ownNode.name, kind: 'own' }]
}

/** Visible nodes for the current player (exchange stays; own may appear). */
export function visibleNetwork(ownNode: OwnNode | null): NetworkNode[] {
  if (!ownNode) {
    return BASE_NETWORK
  }
  return [
    ...BASE_NETWORK,
    {
      id: ownNode.id,
      name: ownNode.name,
      kind: 'own',
      x: 8,
      y: 44,
    },
  ]
}

export function visibleEdges(nodeIds: Set<string>): NetworkEdge[] {
  return NETWORK_EDGES.filter((edge) => nodeIds.has(edge.a) && nodeIds.has(edge.b))
}

function neighbors(id: string, edges: NetworkEdge[]): string[] {
  const out: string[] = []
  for (const edge of edges) {
    if (edge.a === id) {
      out.push(edge.b)
    } else if (edge.b === id) {
      out.push(edge.a)
    }
  }
  return out
}

/**
 * BFS flood from origin. Each hop starts PROPAGATION_HOP_MS after the parent
 * was informed (origin at 0).
 */
export function propagationHops(
  originId: string,
  edges: NetworkEdge[],
  hopMs = PROPAGATION_HOP_MS,
): PropagationHop[] {
  const hops: PropagationHop[] = []
  const informed = new Set<string>([originId])
  const queue: { id: string; atMs: number }[] = [{ id: originId, atMs: 0 }]

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const next of neighbors(current.id, edges)) {
      if (informed.has(next)) {
        continue
      }
      informed.add(next)
      const delayMs = current.atMs + hopMs
      hops.push({ fromId: current.id, toId: next, delayMs })
      queue.push({ id: next, atMs: delayMs })
    }
  }

  return hops
}

/** Pick a random always-on node as the first to announce a new block. */
export function pickBlockOrigin(random = Math.random): string {
  const pool = BASE_NETWORK.map((node) => node.id)
  const index = Math.floor(random() * pool.length)
  return pool[index] ?? EXCHANGE_NODE_ID
}

export type NetworkPulse = {
  id: string
  kind: 'block' | 'tx'
  originId: string
}
