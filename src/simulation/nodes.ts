/**
 * Broadcast endpoints for L1 sends. Buy still goes through the exchange's infra.
 * Public relays are always available; the player may add one own node (sandbox).
 */

export type NodeKind = 'public' | 'own'

export type BroadcastNode = {
  id: string
  name: string
  kind: NodeKind
}

/** Fictional public relays — not real endpoints. */
export const PUBLIC_NODES: BroadcastNode[] = [
  { id: 'pub-cafe-relay', name: 'Café Relay', kind: 'public' },
  { id: 'pub-clearnet', name: 'Clearnet Electrum-like', kind: 'public' },
  { id: 'pub-fast-spy', name: 'Fast Spyglass', kind: 'public' },
]

export const DEFAULT_PUBLIC_NODE_ID = PUBLIC_NODES[0]!.id

export type OwnNode = {
  id: string
  name: string
}

export function publicNodeById(id: string): BroadcastNode | undefined {
  return PUBLIC_NODES.find((node) => node.id === id)
}

export function resolveBroadcastNode(
  selectedId: string | null,
  ownNode: OwnNode | null,
): BroadcastNode | null {
  if (!selectedId) {
    return null
  }
  const pub = publicNodeById(selectedId)
  if (pub) {
    return pub
  }
  if (ownNode && ownNode.id === selectedId) {
    return { id: ownNode.id, name: ownNode.name, kind: 'own' }
  }
  return null
}

export function availableBroadcastNodes(ownNode: OwnNode | null): BroadcastNode[] {
  if (!ownNode) {
    return [...PUBLIC_NODES]
  }
  return [...PUBLIC_NODES, { id: ownNode.id, name: ownNode.name, kind: 'own' }]
}
