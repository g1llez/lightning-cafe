import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  applyServerTick,
  createInitialChain,
  marketQuotes,
  mineBlock,
  pickPool,
  sandboxBlockInterval,
  type ChainState,
} from './chain'
import {
  advanceBlock,
  BTC_PRICE_CAD,
  buyBitcoin,
  createAddress,
  createInitialPlayer,
  createOwnNode,
  ingestRemoteTx,
  renameWallet,
  deleteOwnNode,
  renameOwnNode as applyRenameOwnNode,
  deleteWallet as applyDelete,
  restoreWallet as applyRestore,
  selectBroadcastNode,
  sendBitcoin,
  createWallet,
  type PlayerState,
} from './player'
import {
  clearPersist,
  hydrateSandbox,
  persistBlob,
  readPersistRaw,
  writePersist,
} from './persist'
import {
  EXCHANGE_NODE_ID,
  pickBlockOrigin,
  type NetworkPulse,
} from './nodes'
import {
  createRoom,
  fetchEvents,
  fetchRoom,
  openRoomSocket,
  parseRemoteTx,
  parseRoomInput,
  parseTick,
  roomIdFromLocation,
  sendSessionEvent,
  sessionPeerId,
  writeRoomToLocation,
  type SessionEvent,
} from './sessionApi'

export type SessionStatus = 'off' | 'connecting' | 'live' | 'error'

type SimulationContextValue = {
  chain: ChainState
  secondsLeft: number
  player: PlayerState
  btcPriceCad: number
  roomId: string | null
  sessionStatus: SessionStatus
  networkPulse: NetworkPulse | null
  addWallet: (name: string) => void
  renameWallet: (walletId: string, name: string) => void
  newAddress: (walletId: string) => void
  restoreWallet: (name: string, words: string) => void
  deleteWallet: (walletId: string) => void
  addOwnNode: (name: string) => void
  removeOwnNode: () => void
  renameOwnNode: (name: string) => void
  chooseBroadcastNode: (nodeId: string) => void
  buyBtc: (address: string, cadAmount: number) => void
  sendBtc: (fromWalletId: string, toAddress: string, sats: number, feeRate: number) => void
  createCafe: () => Promise<void>
  joinCafe: (roomId: string) => Promise<void>
  leaveCafe: () => void
  resetSandbox: () => void
}

const SimulationContext = createContext<SimulationContextValue | null>(null)

type SimulationProviderProps = {
  children: ReactNode
}

export function SimulationProvider({ children }: SimulationProviderProps) {
  const [boot] = useState(() => {
    const interval = sandboxBlockInterval()
    const room = roomIdFromLocation()
    return {
      blockInterval: interval,
      roomId: room,
      ...hydrateSandbox(readPersistRaw(), room, interval),
    }
  })
  const blockInterval = boot.blockInterval
  const [chain, setChain] = useState(boot.chain)
  const [secondsLeft, setSecondsLeft] = useState(boot.secondsLeft)
  const [player, setPlayer] = useState(boot.player)
  const [roomId, setRoomId] = useState<string | null>(boot.roomId)
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('off')
  const [networkPulse, setNetworkPulse] = useState<NetworkPulse | null>(null)
  const chainRef = useRef(chain)
  const socketRef = useRef<WebSocket | null>(null)
  const seqRef = useRef(0)
  const peerIdRef = useRef('')
  const outboxRef = useRef<
    { kind: 'buy' | 'send'; address: string; sats: number; fee_rate: number; id: string }[]
  >([])
  chainRef.current = chain

  useEffect(() => {
    writePersist(persistBlob(player, chain, secondsLeft))
  }, [player, chain, secondsLeft])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1))
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (roomId) {
      return
    }
    if (secondsLeft > 0) {
      return
    }

    const marketRate = chain.marketRate
    const height = chain.nextHeight
    setPlayer((current) => advanceBlock(current, marketRate, Math.random, height))
    setChain((current) => mineBlock(current, pickPool()))
    setNetworkPulse({ id: `block-${height}`, kind: 'block', originId: pickBlockOrigin() })
    setSecondsLeft(blockInterval)
  }, [secondsLeft, blockInterval, roomId, chain.marketRate, chain.nextHeight])

  useEffect(() => {
    if (!roomId) {
      setSessionStatus('off')
      return
    }

    const activeRoom = roomId
    let cancelled = false
    let retryTimer = 0
    const peerId = sessionPeerId()
    peerIdRef.current = peerId
    seqRef.current = 0
    setSessionStatus('connecting')
    setChain(createInitialChain())
    chainRef.current = createInitialChain()
    setSecondsLeft(60)

    function applyEvent(event: SessionEvent) {
      if (event.seq <= seqRef.current) {
        return
      }
      seqRef.current = event.seq

      if (event.type === 'tick') {
        const tick = parseTick(event.payload)
        if (!tick) {
          return
        }
        const marketRate = chainRef.current.marketRate
        setPlayer((current) => advanceBlock(current, marketRate, null, tick.height))
        setChain((current) => {
          const next = applyServerTick(current, tick)
          chainRef.current = next
          return next
        })
        setNetworkPulse({ id: `block-${tick.height}`, kind: 'block', originId: pickBlockOrigin() })
        setSecondsLeft(60)
        return
      }

      if (event.type === 'tx') {
        const tx = parseRemoteTx(event.payload)
        if (tx) {
          setPlayer((current) => ingestRemoteTx(current, tx))
        }
      }
    }

    async function connect(after: number) {
      try {
        await fetchRoom(activeRoom)
        if (cancelled) {
          return
        }
        const events = await fetchEvents(activeRoom, after)
        if (cancelled) {
          return
        }

        if (after === 0) {
          let nextChain = createInitialChain()
          setPlayer((currentPlayer) => {
            let nextPlayer = currentPlayer
            for (const event of events) {
              seqRef.current = event.seq
              if (event.type === 'tick') {
                const tick = parseTick(event.payload)
                if (!tick) {
                  continue
                }
        nextPlayer = advanceBlock(nextPlayer, nextChain.marketRate, null, tick.height)
                nextChain = applyServerTick(nextChain, tick)
              } else if (event.type === 'tx') {
                const tx = parseRemoteTx(event.payload)
                if (tx) {
                  nextPlayer = ingestRemoteTx(nextPlayer, tx)
                }
              }
            }
            chainRef.current = nextChain
            return nextPlayer
          })
          setChain(nextChain)
        } else {
          for (const event of events) {
            applyEvent(event)
          }
        }

        const stale = socketRef.current
        socketRef.current = null
        stale?.close()

        const socket = openRoomSocket(
          activeRoom,
          applyEvent,
          () => {
            if (cancelled || socketRef.current !== socket) {
              return
            }
            socketRef.current = null
            setSessionStatus('connecting')
            retryTimer = window.setTimeout(() => {
              void connect(seqRef.current)
            }, 2000)
          },
        )
        socketRef.current = socket
        socket.addEventListener('open', () => {
          if (cancelled) {
            return
          }
          setSessionStatus('live')
          sendSessionEvent(socket, peerId, 'hello', {})
          for (const payload of outboxRef.current) {
            sendSessionEvent(socket, peerId, 'tx', payload)
          }
          outboxRef.current = []
        })
      } catch {
        if (!cancelled) {
          setSessionStatus('error')
        }
      }
    }

    void connect(0)

    return () => {
      cancelled = true
      window.clearTimeout(retryTimer)
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [roomId])

  function publishTx(kind: 'buy' | 'send', address: string, sats: number, feeRate: number, id: string) {
    const payload = {
      kind,
      address,
      sats,
      fee_rate: feeRate,
      id,
    }
    const socket = socketRef.current
    if (socket && socket.readyState === WebSocket.OPEN) {
      sendSessionEvent(socket, peerIdRef.current, 'tx', payload)
      return
    }
    if (roomId) {
      outboxRef.current = [...outboxRef.current, payload]
    }
  }

  function chainTip(): number {
    return chain.confirmed[0]?.height ?? chain.nextHeight - 1
  }

  const value = useMemo<SimulationContextValue>(
    () => ({
      chain,
      secondsLeft,
      player,
      btcPriceCad: BTC_PRICE_CAD,
      roomId,
      sessionStatus,
      networkPulse,
      addWallet: (name) => setPlayer((current) => createWallet(current, name)),
      renameWallet: (walletId, name) => setPlayer((current) => renameWallet(current, walletId, name)),
      newAddress: (walletId) => setPlayer((current) => createAddress(current, walletId)),
      restoreWallet: (name, words) => {
        const next = applyRestore(player, name, words)
        setPlayer(next)
      },
      deleteWallet: (walletId) => {
        const next = applyDelete(player, walletId)
        setPlayer(next)
      },
      addOwnNode: (name) =>
        setPlayer((current) => createOwnNode(current, name, chainTip())),
      removeOwnNode: () => setPlayer((current) => deleteOwnNode(current)),
      renameOwnNode: (name) => setPlayer((current) => applyRenameOwnNode(current, name)),
      chooseBroadcastNode: (nodeId) =>
        setPlayer((current) => selectBroadcastNode(current, nodeId, chainTip())),
      buyBtc: (address, cadAmount) => {
        const next = buyBitcoin(
          player,
          address,
          cadAmount,
          BTC_PRICE_CAD,
          marketQuotes(chain.marketRate).high,
        )
        setPlayer(next)
        const tx = next.pending[next.pending.length - 1]
        if (tx) {
          publishTx('buy', tx.address, tx.sats, tx.feeRate, tx.id)
          setNetworkPulse({ id: `tx-${tx.id}`, kind: 'tx', originId: EXCHANGE_NODE_ID })
        }
      },
      sendBtc: (fromWalletId, toAddress, sats, feeRate) => {
        const next = sendBitcoin(player, fromWalletId, toAddress, sats, feeRate)
        setPlayer(next)
        const tx = next.pending[next.pending.length - 1]
        if (tx) {
          publishTx('send', tx.address, tx.sats, tx.feeRate, tx.id)
          setNetworkPulse({
            id: `tx-${tx.id}`,
            kind: 'tx',
            originId: player.selectedNodeId,
          })
        }
      },
      createCafe: async () => {
        const id = await createRoom()
        writeRoomToLocation(id)
        setRoomId(id)
      },
      joinCafe: async (id) => {
        const trimmed = parseRoomInput(id)
        await fetchRoom(trimmed)
        writeRoomToLocation(trimmed)
        setRoomId(trimmed)
      },
      leaveCafe: () => {
        writeRoomToLocation(null)
        outboxRef.current = []
        setRoomId(null)
        setSessionStatus('off')
      },
      resetSandbox: () => {
        clearPersist()
        writeRoomToLocation(null)
        outboxRef.current = []
        setRoomId(null)
        setSessionStatus('off')
        setPlayer(createInitialPlayer())
        setChain(createInitialChain())
        setSecondsLeft(blockInterval)
        setNetworkPulse(null)
      },
    }),
    [chain, player, secondsLeft, roomId, sessionStatus, blockInterval, networkPulse],
  )

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>
}

export function useSimulation() {
  const context = useContext(SimulationContext)
  if (!context) {
    throw new Error('useSimulation must be used inside SimulationProvider')
  }
  return context
}
