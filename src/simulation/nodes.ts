/**
 * L1 peer graph for the sandbox: public relays, NPC full nodes, the exchange,
 * a mempool collector, and optionally the player's own node
 * (syncs over OWN_NODE_SYNC_BLOCKS).
 */

import type { Priority } from './chain'
import { edgeEnds, floodHops, GOSSIP_HOP_MS } from './livingGraph'

export type NodeKind = 'public' | 'npc' | 'exchange' | 'own' | 'mempool' | 'peer'

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
export const NODE_NAME_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789'
export const NODE_NAME_LENGTH = 4

export function randomNodeName(random = Math.random): string {
  const letters = 'abcdefghijklmnopqrstuvwxyz'
  let name = letters[Math.floor(random() * letters.length) % letters.length] ?? 'a'
  for (let index = 1; index < NODE_NAME_LENGTH; index += 1) {
    const pick = Math.floor(random() * NODE_NAME_ALPHABET.length) % NODE_NAME_ALPHABET.length
    name += NODE_NAME_ALPHABET[pick]
  }
  return name
}

export function resolveOwnNodeName(draft: string, fallback: string): string {
  const trimmed = draft.trim()
  if (trimmed) {
    return trimmed
  }
  const code = fallback.trim()
  return code || randomNodeName()
}

export const PROPAGATION_HOP_MS = GOSSIP_HOP_MS
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
  /** Tip height when the node was added (debug / legacy hydrate). */
  syncStartHeight: number
  /** Confirmed blocks processed since the node was added. IBD, not chain height. */
  syncedBlocks: number
}

export function publicNodeById(id: string): BroadcastNode | undefined {
  return PUBLIC_NODES.find((node) => node.id === id)
}

export function tipHeight(confirmedHeight: number): number {
  return confirmedHeight
}

export function clampSyncedBlocks(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }
  return Math.min(OWN_NODE_SYNC_BLOCKS, Math.max(0, Math.floor(value)))
}

export function ownNodeBlocksSynced(own: OwnNode, _tip?: number): number {
  return clampSyncedBlocks(own.syncedBlocks)
}

export function isOwnNodeReady(own: OwnNode, tip?: number): boolean {
  return ownNodeBlocksSynced(own, tip) >= OWN_NODE_SYNC_BLOCKS
}

export function tickOwnNodeSync(own: OwnNode): OwnNode {
  if (own.syncedBlocks >= OWN_NODE_SYNC_BLOCKS) {
    return own
  }
  return { ...own, syncedBlocks: own.syncedBlocks + 1 }
}

export function ownNodeProgress(own: OwnNode, _tip = 0, blockFill = 0): number {
  const done = ownNodeBlocksSynced(own)
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

/** Visible nodes: base mesh, own node, and cafe-session peers. */
export function visibleNetwork(
  ownNode: OwnNode | null,
  peerNodes: { id: string; name: string }[] = [],
): NetworkNode[] {
  const extra: NetworkNode[] = []
  if (ownNode) {
    extra.push({
      id: ownNode.id,
      name: ownNode.name,
      kind: 'own',
      x: 12,
      y: 82,
    })
  }
  peerNodes.forEach((peer, index) => {
    extra.push({
      id: peer.id,
      name: peer.name,
      kind: 'peer',
      x: 22 + (index % 3) * 14,
      y: 68 - Math.floor(index / 3) * 14,
    })
  })
  return extra.length === 0 ? BASE_NETWORK : [...BASE_NETWORK, ...extra]
}

export function playerNodeEdges(id: string): NetworkEdge[] {
  return [
    { a: id, b: 'pub-cafe-relay' },
    { a: id, b: 'npc-harbor' },
    { a: id, b: MEMPOOL_NODE_ID },
  ]
}

export function visibleEdges(nodeIds: Set<string>): NetworkEdge[] {
  const extra = [...nodeIds]
    .filter((id) => id.startsWith('peer-'))
    .flatMap((id) => playerNodeEdges(id))
  return [...NETWORK_EDGES, ...extra].filter((edge) => nodeIds.has(edge.a) && nodeIds.has(edge.b))
}

/**
 * Gossip flood from origin. A node announces to every neighbor except the
 * peer it heard the tx from, even if that neighbor already has it.
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
