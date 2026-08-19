import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BitcoinLayer } from './components/BitcoinLayer'
import { BuyModal } from './components/BuyModal'
import { Footer } from './components/Footer'
import { LightningLayer } from './components/LightningLayer'
import { Nav } from './components/Nav'
import { SatsFlight } from './components/SatsFlight'
import { Toast } from './components/Toast'
import { SimulationProvider } from './simulation/SimulationProvider'

export default function App() {
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
  const [lightningOpen, setLightningOpen] = useState(false)
  const [flight, setFlight] = useState<{ id: number; label: string; target: string } | null>(null)

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
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <LightningLayer
          open={lightningOpen}
          onToggle={() => setLightningOpen((open) => !open)}
          onMessage={setToastMessage}
        />
        <BitcoinLayer fill={!lightningOpen} onMessage={setToastMessage} />
      </div>
      <Footer />
      {buyOpen && (
        <BuyModal
          onClose={() => setBuyOpen(false)}
          onMessage={setToastMessage}
          onSatsSent={(label, target) => setFlight({ id: Date.now(), label, target })}
        />
      )}
      {flight && (
        <SatsFlight
          key={flight.id}
          label={flight.label}
          target={flight.target}
          onDone={() => setFlight(null)}
        />
      )}
      <Toast message={toastMessage} />
    </div>
  )
}
