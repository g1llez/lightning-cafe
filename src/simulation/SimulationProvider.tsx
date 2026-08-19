import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  BLOCK_INTERVAL_SECONDS,
  createInitialChain,
  mineBlock,
  pickPool,
  type ChainState,
} from './chain'
import {
  advanceBlock,
  BTC_PRICE_CAD,
  buyBitcoin,
  createAddress,
  createInitialPlayer,
  createWallet,
  renameWallet,
  type PlayerState,
} from './player'

type SimulationContextValue = {
  chain: ChainState
  secondsLeft: number
  player: PlayerState
  btcPriceCad: number
  addWallet: (name: string) => void
  renameWallet: (walletId: string, name: string) => void
  newAddress: (walletId: string) => void
  buyBtc: (address: string, cadAmount: number, feeRate: number) => void
}

const SimulationContext = createContext<SimulationContextValue | null>(null)

type SimulationProviderProps = {
  children: ReactNode
}

export function SimulationProvider({ children }: SimulationProviderProps) {
  const [chain, setChain] = useState(createInitialChain)
  const [secondsLeft, setSecondsLeft] = useState(BLOCK_INTERVAL_SECONDS)
  const [player, setPlayer] = useState(createInitialPlayer)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => current - 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (secondsLeft > 0) {
      return
    }

    const marketRate = chain.marketRate
    setPlayer((current) => advanceBlock(current, marketRate))
    setChain((current) => mineBlock(current, pickPool()))
    setSecondsLeft(BLOCK_INTERVAL_SECONDS)
  }, [secondsLeft])

  const value = useMemo<SimulationContextValue>(
    () => ({
      chain,
      secondsLeft,
      player,
      btcPriceCad: BTC_PRICE_CAD,
      addWallet: (name) => setPlayer((current) => createWallet(current, name)),
      renameWallet: (walletId, name) => setPlayer((current) => renameWallet(current, walletId, name)),
      newAddress: (walletId) => setPlayer((current) => createAddress(current, walletId)),
      buyBtc: (address, cadAmount, feeRate) =>
        setPlayer((current) => buyBitcoin(current, address, cadAmount, BTC_PRICE_CAD, feeRate)),
    }),
    [chain, player, secondsLeft],
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
