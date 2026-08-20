import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BitcoinLayer } from './components/BitcoinLayer'
import { BuyModal } from './components/BuyModal'
import { Footer } from './components/Footer'
import { LightningLayer } from './components/LightningLayer'
import { Nav } from './components/Nav'
import { SatsFlight } from './components/SatsFlight'
import { SellModal } from './components/SellModal'
import { TetrisLab } from './components/TetrisLab'
import { Toast } from './components/Toast'
import { SimulationProvider } from './simulation/SimulationProvider'

function wantsTetrisLab(): boolean {
  if (typeof window === 'undefined') {
    return false
  }
  const params = new URLSearchParams(window.location.search)
  if (params.get('tetris-lab') === '1' || params.get('lab') === '1') {
    return true
  }
  if (window.location.hash.replace(/^#/, '') === 'tetris-lab') {
    return true
  }
  const path = window.location.pathname.replace(/\/+$/, '')
  return path.endsWith('/tetris-lab') || path.endsWith('tetris-lab')
}

export default function App() {
  if (wantsTetrisLab()) {
    return <TetrisLab />
  }

  return (
    <SimulationProvider>
      <AppShell />
    </SimulationProvider>
  )
}

function AppShell() {
  const { t } = useTranslation()
  const [toastMessage, setToastMessage] = useState('')
  const [buyOpen, setBuyOpen] = useState(false)
  const [sellOpen, setSellOpen] = useState(false)
  const [lightningOpen, setLightningOpen] = useState(false)
  const [flight, setFlight] = useState<{
    id: number
    label: string
    target: string
    from?: string
  } | null>(null)

  useEffect(() => {
    if (!toastMessage) {
      return
    }

    const timer = window.setTimeout(() => setToastMessage(''), 2400)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  return (
    <div className="flex h-full min-h-screen flex-col">
      <Nav
        onGuideClick={() => setToastMessage(t('nav.guideSoon'))}
        onBuyClick={() => setBuyOpen(true)}
        onSellClick={() => setSellOpen(true)}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <LightningLayer
          open={lightningOpen}
          onToggle={() => setLightningOpen((open) => !open)}
          onMessage={setToastMessage}
        />
        <BitcoinLayer
          fill={!lightningOpen}
          onMessage={setToastMessage}
          onSatsSent={(label, target, from) => setFlight({ id: Date.now(), label, target, from })}
        />
      </div>
      <Footer />
      {buyOpen && (
        <BuyModal
          onClose={() => setBuyOpen(false)}
          onMessage={setToastMessage}
          onSatsSent={(label, target) => setFlight({ id: Date.now(), label, target, from: 'funds' })}
        />
      )}
      {sellOpen && <SellModal onClose={() => setSellOpen(false)} onMessage={setToastMessage} />}
      {flight && (
        <SatsFlight
          key={flight.id}
          label={flight.label}
          target={flight.target}
          from={flight.from}
          onDone={() => setFlight(null)}
        />
      )}
      <Toast message={toastMessage} />
    </div>
  )
}
