import type { ServerTick } from './chain'
import type { RemoteTxPayload } from './player'

const SESSION_HTTP = 'https://cafe-session.sarius.ca'
const SESSION_WS = 'wss://cafe-session.sarius.ca'

export function sessionHttpBase(): string {
  return SESSION_HTTP
}

export function sessionWsUrl(roomId: string): string {
  return `${SESSION_WS}/rooms/${encodeURIComponent(roomId)}/ws`
}

export type SessionEvent = {
  seq: number
  ts: string
  type: string
  peer_id: string
  payload: unknown
}

type RoomInfo = {
  id: string
  created_at: string
  expires_at: string
  seq: number
}

const PEER_KEY = 'lc-peer-id'

export function sessionPeerId(): string {
  const existing = window.sessionStorage.getItem(PEER_KEY)
  if (existing && /^[a-zA-Z0-9_-]{1,64}$/.test(existing)) {
    return existing
  }

  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  const id = `p${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`
  window.sessionStorage.setItem(PEER_KEY, id)
  return id
}

export function parseRoomInput(value: string): string {
  const trimmed = value.trim()
  try {
    const url = new URL(trimmed)
    const fromQuery = url.searchParams.get('room')?.trim()
    if (fromQuery) {
      return fromQuery
    }
  } catch {
    // pasted an id, not a url
  }
  return trimmed
}

export function roomIdFromLocation(): string | null {
  const id = parseRoomInput(new URLSearchParams(window.location.search).get('room') ?? '')
  return /^[a-zA-Z0-9_-]{16,}$/.test(id) ? id : null
}

export function writeRoomToLocation(roomId: string | null) {
  const url = new URL(window.location.href)
  if (roomId) {
    url.searchParams.set('room', roomId)
  } else {
    url.searchParams.delete('room')
  }
  window.history.replaceState(null, '', url)
}

export async function createRoom(): Promise<string> {
  const response = await fetch(`${sessionHttpBase()}/rooms`, { method: 'POST' })
  if (!response.ok) {
    throw new Error(`room-create-${response.status}`)
  }
  const body = (await response.json()) as { id?: string }
  if (!body.id) {
    throw new Error('room-create-empty')
  }
  return body.id
}

export async function fetchRoom(roomId: string): Promise<RoomInfo> {
  const response = await fetch(`${sessionHttpBase()}/rooms/${encodeURIComponent(roomId)}`)
  if (response.status === 404) {
    throw new Error('room-missing')
  }
  if (!response.ok) {
    throw new Error(`room-${response.status}`)
  }
  return (await response.json()) as RoomInfo
}

export async function fetchEvents(roomId: string, after: number): Promise<SessionEvent[]> {
  const response = await fetch(
    `${sessionHttpBase()}/rooms/${encodeURIComponent(roomId)}/events?after=${after}`,
  )
  if (!response.ok) {
    throw new Error(`events-${response.status}`)
  }
  const body = (await response.json()) as { events?: SessionEvent[] }
  return body.events ?? []
}

export function parseTick(payload: unknown): ServerTick | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }
  const tick = payload as Record<string, unknown>
  if (
    typeof tick.height !== 'number' ||
    typeof tick.market_rate !== 'number' ||
    typeof tick.fee_rate !== 'number' ||
    typeof tick.pool !== 'string'
  ) {
    return null
  }
  return {
    height: tick.height,
    market_rate: tick.market_rate,
    fee_rate: tick.fee_rate,
    pool: tick.pool,
  }
}

export function parseRemoteTx(payload: unknown): RemoteTxPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }
  const tx = payload as Record<string, unknown>
  if ((tx.kind !== 'buy' && tx.kind !== 'send') || typeof tx.address !== 'string') {
    return null
  }
  if (typeof tx.sats !== 'number' || typeof tx.fee_rate !== 'number') {
    return null
  }
  return {
    kind: tx.kind,
    address: tx.address,
    sats: tx.sats,
    fee_rate: tx.fee_rate,
    id: typeof tx.id === 'string' ? tx.id : undefined,
  }
}

export type NodeEventPayload = {
  op: 'up' | 'down' | 'rename'
  name?: string
}

export type CafePeerNode = {
  id: string
  name: string
  peerId: string
}

export function peerNodeId(peerId: string): string {
  return `peer-${peerId}`
}

export function parseNodeEvent(payload: unknown): NodeEventPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null
  }
  const body = payload as Record<string, unknown>
  if (body.op !== 'up' && body.op !== 'down' && body.op !== 'rename') {
    return null
  }
  const name = typeof body.name === 'string' ? body.name.trim() : undefined
  if ((body.op === 'up' || body.op === 'rename') && !name) {
    return null
  }
  return name ? { op: body.op, name } : { op: body.op }
}

export function applyNodeEvent(
  peers: CafePeerNode[],
  eventPeerId: string,
  payload: NodeEventPayload,
  selfPeerId: string,
): CafePeerNode[] {
  if (!eventPeerId || eventPeerId === selfPeerId) {
    return peers
  }
  const id = peerNodeId(eventPeerId)
  if (payload.op === 'down') {
    return peers.filter((node) => node.id !== id)
  }
  const name = payload.name?.trim()
  if (!name) {
    return peers
  }
  const existing = peers.find((node) => node.id === id)
  if (existing) {
    return peers.map((node) => (node.id === id ? { ...node, name } : node))
  }
  return [...peers, { id, name, peerId: eventPeerId }]
}

export function openRoomSocket(
  roomId: string,
  onEvent: (event: SessionEvent) => void,
  onClose: () => void,
): WebSocket {
  const socket = new WebSocket(sessionWsUrl(roomId))
  socket.addEventListener('message', (message) => {
    try {
      const event = JSON.parse(String(message.data)) as SessionEvent
      if (typeof event.seq === 'number' && typeof event.type === 'string') {
        onEvent(event)
      }
    } catch {
      // ignore a junk frame
    }
  })
  socket.addEventListener('close', onClose)
  return socket
}

export function sendSessionEvent(
  socket: WebSocket,
  peerId: string,
  type: 'hello' | 'tx' | 'node',
  payload: Record<string, unknown>,
) {
  if (socket.readyState !== WebSocket.OPEN) {
    return
  }
  socket.send(JSON.stringify({ type, peer_id: peerId, payload }))
}
