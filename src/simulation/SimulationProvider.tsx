import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
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
  createWallet,
  renameWallet,
  restoreWallet as applyRestore,
  sendBitcoin,
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
  restoreWallet: (name: string, words: string) => void
  buyBtc: (address: string, cadAmount: number) => void
  sendBtc: (fromWalletId: string, toAddress: string, sats: number, feeRate: number) => void
}

const SimulationContext = createContext<SimulationContextValue | null>(null)

type SimulationProviderProps = {
  children: ReactNode
}

export function SimulationProvider({ children }: SimulationProviderProps) {
  const [blockInterval] = useState(sandboxBlockInterval)
  const [chain, setChain] = useState(createInitialChain)
  const [secondsLeft, setSecondsLeft] = useState(blockInterval)
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
    const height = chain.nextHeight
    setPlayer((current) => advanceBlock(current, marketRate, Math.random, height))
    setChain((current) => mineBlock(current, pickPool()))
    setSecondsLeft(blockInterval)
  }, [secondsLeft, blockInterval])

  const value = useMemo<SimulationContextValue>(
    () => ({
      chain,
      secondsLeft,
      player,
      btcPriceCad: BTC_PRICE_CAD,
      addWallet: (name) => setPlayer((current) => createWallet(current, name)),
      renameWallet: (walletId, name) => setPlayer((current) => renameWallet(current, walletId, name)),
      newAddress: (walletId) => setPlayer((current) => createAddress(current, walletId)),
      restoreWallet: (name, words) => setPlayer((current) => applyRestore(current, name, words)),
      buyBtc: (address, cadAmount) =>
        setPlayer((current) =>
          buyBitcoin(
            current,
            address,
            cadAmount,
            BTC_PRICE_CAD,
            marketQuotes(chain.marketRate).high,
          ),
        ),
      sendBtc: (fromWalletId, toAddress, sats, feeRate) =>
        setPlayer((current) => sendBitcoin(current, fromWalletId, toAddress, sats, feeRate)),
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
