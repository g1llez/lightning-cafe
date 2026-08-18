import { useState } from 'react'
import { LayoutPreviewShell, MockAssetsPanel, MockSandbox, MockServicesPanel } from './LayoutPreviewShell'

type Tab = 'sandbox' | 'assets' | 'services'

export function LayoutB() {
  const [tab, setTab] = useState<Tab>('sandbox')

  return (
    <LayoutPreviewShell
      title="Layout B — Onglets"
      subtitle="Sandbox, Assets et Services = 3 écrans séparés via la nav."
      pros={['Interface très propre', 'Scale bien', 'Moins de bruit visuel']}
    >
      <nav className="flex shrink-0 gap-1 border-b border-border bg-bg-secondary px-4 py-2">
        {(['sandbox', 'assets', 'services'] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`rounded-md px-4 py-2 text-sm capitalize ${
              tab === item ? 'bg-accent text-bg-primary' : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {item === 'sandbox' ? 'Sandbox' : item === 'assets' ? 'Assets' : 'Services'}
          </button>
        ))}
      </nav>

      {tab === 'sandbox' && <MockSandbox />}
      {tab === 'assets' && (
        <div className="flex flex-1 justify-center p-8">
          <div className="w-full max-w-md">
            <MockAssetsPanel />
          </div>
        </div>
      )}
      {tab === 'services' && (
        <div className="flex flex-1 justify-center p-8">
          <div className="w-full max-w-md">
            <MockServicesPanel />
          </div>
        </div>
      )}
    </LayoutPreviewShell>
  )
}
