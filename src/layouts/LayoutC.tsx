import { useState } from 'react'
import { LayoutPreviewShell, MockAssetsPanel, MockSandbox, MockServicesPanel } from './LayoutPreviewShell'

export function LayoutC() {
  const [servicesOpen, setServicesOpen] = useState(false)

  return (
    <LayoutPreviewShell
      title="Layout C — Assets fixe + drawer Services"
      subtitle="Inventaire toujours visible. Services s'ouvrent en panneau coulissant."
      pros={['Sandbox toujours visible', 'Services à la demande', 'Bon compromis mobile']}
    >
      <div className="relative flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-b border-border bg-bg-secondary p-4 md:w-56 md:border-r md:border-b-0">
          <MockAssetsPanel compact />
          <button
            type="button"
            onClick={() => setServicesOpen(true)}
            className="mt-3 w-full rounded-md border border-accent/60 bg-bg-panel px-3 py-2 text-sm text-accent"
          >
            Ouvrir Services →
          </button>
        </aside>

        <MockSandbox />

        {servicesOpen && (
          <>
            <button
              type="button"
              aria-label="Fermer"
              className="absolute inset-0 z-10 bg-black/50 md:left-56"
              onClick={() => setServicesOpen(false)}
            />
            <aside className="absolute top-0 right-0 z-20 flex h-full w-72 flex-col border-l border-border bg-bg-secondary p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Services</span>
                <button type="button" onClick={() => setServicesOpen(false)} className="text-text-muted">
                  ✕
                </button>
              </div>
              <MockServicesPanel />
            </aside>
          </>
        )}
      </div>
    </LayoutPreviewShell>
  )
}
