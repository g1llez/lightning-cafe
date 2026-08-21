/**
 * L1 peer graph for the sandbox: public relays, NPC full nodes, the exchange,
 * a mempool collector, and optionally the player's own node
 * (syncs over OWN_NODE_SYNC_BLOCKS).
 */

import type { Priority } from './chain'
import { edgeEnds, floodHops } from './livingGraph'

export type NodeKind = 'public' | 'npc' | 'exchange' | 'own' | 'mempool'

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
export const MEMPOOL_NODE_ID = 'net-mempool'
export const OWN_NODE_ID = 'own-node'
export const OWN_NODE_SYNC_BLOCKS = 4
export const PROPAGATION_HOP_MS = 1400
/** Desktop graph square (`max-h` 28rem) and the orange SVG (`md:h-11`). */
export const GRAPH_DESKTOP_PX = 448
export const NODE_ICON_PX = 44

export function orangeDiscRadius(
  graphPx = GRAPH_DESKTOP_PX,
  iconPx = NODE_ICON_PX,
): number {
  return (iconPx / 2 / graphPx) * 100
}

/** Orange disc radius in the 100×100 layout — matches a `NODE_DISC_RADIUS * 2 cqi` icon. */
export const NODE_DISC_RADIUS = orangeDiscRadius()

/** Positive gap = the line stops short of the disc (does not touch). */
export function edgeEndGaps(
  nodes: NetworkNode[],
  edges: NetworkEdge[],
  discRadius: number,
  pad = NODE_DISC_RADIUS,
): { nodeId: string; otherId: string; gap: number }[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const gaps: { nodeId: string; otherId: string; gap: number }[] = []
  for (const edge of edges) {
    const a = byId.get(edge.a)
    const b = byId.get(edge.b)
    if (!a || !b) {
      continue
    }
    const ends = edgeEndpoints(a.x, a.y, b.x, b.y, pad)
    const gapA = Math.hypot(ends.x1 - a.x, ends.y1 - a.y) - discRadius
    const gapB = Math.hypot(ends.x2 - b.x, ends.y2 - b.y) - discRadius
    gaps.push({ nodeId: a.id, otherId: b.id, gap: gapA })
    gaps.push({ nodeId: b.id, otherId: a.id, gap: gapB })
  }
  return gaps
}

/** Always-on peers (no player node). Max 7; own makes 8. Exchange sits on the edge, not the hub. */
export const BASE_NETWORK: NetworkNode[] = [
  { id: 'pub-cafe-relay', name: 'Café Relay', kind: 'public', x: 20, y: 26 },
  { id: 'pub-clearnet', name: 'Clearnet', kind: 'public', x: 50, y: 12 },
  { id: 'pub-fast-spy', name: 'Spyglass', kind: 'public', x: 80, y: 26 },
  { id: 'npc-harbor', name: 'Harbor Peer', kind: 'npc', x: 16, y: 52 },
  { id: 'npc-northwind', name: 'Northwind Full', kind: 'npc', x: 84, y: 52 },
  { id: EXCHANGE_NODE_ID, name: 'Café Exchange', kind: 'exchange', x: 78, y: 80 },
  { id: MEMPOOL_NODE_ID, name: 'Mempool', kind: 'mempool', x: 50, y: 72 },
]

/** Undirected mesh — sparse enough to read hops. */
export const NETWORK_EDGES: NetworkEdge[] = [
  { a: 'pub-cafe-relay', b: 'pub-clearnet' },
  { a: 'pub-clearnet', b: 'pub-fast-spy' },
  { a: 'pub-cafe-relay', b: 'pub-fast-spy' },
  { a: 'pub-cafe-relay', b: 'npc-harbor' },
  { a: 'pub-fast-spy', b: 'npc-northwind' },
  { a: 'pub-clearnet', b: 'npc-harbor' },
  { a: 'pub-clearnet', b: 'npc-northwind' },
  { a: 'npc-harbor', b: 'npc-northwind' },
  { a: EXCHANGE_NODE_ID, b: 'npc-northwind' },
  { a: EXCHANGE_NODE_ID, b: 'pub-fast-spy' },
  { a: MEMPOOL_NODE_ID, b: 'npc-harbor' },
  { a: MEMPOOL_NODE_ID, b: 'npc-northwind' },
  { a: MEMPOOL_NODE_ID, b: 'pub-clearnet' },
  { a: MEMPOOL_NODE_ID, b: EXCHANGE_NODE_ID },
  /** Own node plugs into the mesh when present. */
  { a: OWN_NODE_ID, b: 'pub-cafe-relay' },
  { a: OWN_NODE_ID, b: 'npc-harbor' },
  { a: OWN_NODE_ID, b: MEMPOOL_NODE_ID },
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

export function ownNodeProgress(own: OwnNode, tip: number, blockFill = 0): number {
  const done = ownNodeBlocksSynced(own, tip)
  if (done >= OWN_NODE_SYNC_BLOCKS) {
    return 1
  }
  const partial = Math.min(1, Math.max(0, blockFill))
  return Math.min(1, (done + partial) / OWN_NODE_SYNC_BLOCKS)
}

export function ownNodeProgressPercent(own: OwnNode, tip: number, blockFill = 0): number {
  return Math.round(ownNodeProgress(own, tip, blockFill) * 100)
}

/** Pull line ends inward so strokes meet the rim of the node discs. */
export function edgeEndpoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  pad = NODE_DISC_RADIUS,
): { x1: number; y1: number; x2: number; y2: number } {
  return edgeEnds(x1, y1, x2, y2, pad)
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
      x: 12,
      y: 82,
    },
  ]
}

export function visibleEdges(nodeIds: Set<string>): NetworkEdge[] {
  return NETWORK_EDGES.filter((edge) => nodeIds.has(edge.a) && nodeIds.has(edge.b))
}

/**
 * Gossip flood from origin. A node sends to every neighbor that does not
 * already have the info, all at the same delayMs (one visual wave).
 */
export function propagationHops(
  originId: string,
  edges: NetworkEdge[],
  hopMs = PROPAGATION_HOP_MS,
): PropagationHop[] {
  return floodHops(originId, edges, hopMs)
}

/** Pick a random always-on full node as the first to announce a new block. */
export function pickBlockOrigin(random = Math.random): string {
  const pool = BASE_NETWORK.filter((node) => node.kind !== 'mempool').map((node) => node.id)
  const index = Math.floor(random() * pool.length)
  return pool[index] ?? EXCHANGE_NODE_ID
}

export type NetworkPulse = {
  id: string
  kind: 'block' | 'tx'
  originId: string
  txId?: string
  lane?: Priority
  sats?: number
}
