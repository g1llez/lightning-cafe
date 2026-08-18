import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AssetsPanel } from './components/AssetsPanel'
import { BitcoinLayer } from './components/BitcoinLayer'
import { Footer } from './components/Footer'
import { LightningLayer } from './components/LightningLayer'
import { Nav } from './components/Nav'
import { Toast } from './components/Toast'

export default function App() {
  const { t } = useTranslation()
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    if (!toastMessage) {
      return
    }

    const timer = window.setTimeout(() => setToastMessage(''), 2400)
    return () => window.clearTimeout(timer)
  }, [toastMessage])

  return (
    <div className="flex h-full min-h-screen flex-col">
      <Nav onGuideClick={() => setToastMessage(t('nav.guideSoon'))} />

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <AssetsPanel onSoon={() => setToastMessage(t('assets.soon'))} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <LightningLayer />
          <BitcoinLayer />
        </div>
      </div>
      <Footer />
      <Toast message={toastMessage} />
    </div>
  )
}
