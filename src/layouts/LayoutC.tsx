import { useState } from 'react'
import {
  AssetTable,
  L1_SERVICES,
  L2_SERVICES,
  LayoutPreviewShell,
  NODE_ROWS,
  WALLET_ROWS,
} from './LayoutPreviewShell'

function LayerPlus({
  open,
  onToggle,
  services,
  table,
}: {
  open: boolean
  onToggle: () => void
  services: string[]
  table: { headers: string[]; rows: string[][] }
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-accent/70 bg-bg-panel text-lg leading-none text-accent"
      >
        +
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-md border border-border bg-bg-panel p-3 shadow-lg">
          <p className="mb-2 text-xs uppercase tracking-[0.14em] text-text-muted">Assets</p>
          <AssetTable headers={table.headers} rows={table.rows} />
          <p className="mt-3 mb-1 text-xs uppercase tracking-[0.14em] text-text-muted">Services</p>
          {services.map((item) => (
            <button
              key={item}
              type="button"
              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-bg-secondary"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function LayoutC() {
  const [openL2, setOpenL2] = useState(false)
  const [openL1, setOpenL1] = useState(false)

  return (
    <LayoutPreviewShell
      title="C — Sandbox propre, tout dans le +"
      subtitle="L1 et L2 restent visuels. Le + ouvre le tableau de la couche et ses services."
      pros={['Interface la plus propre', 'Tables à la demande', 'Services toujours contextuels']}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <section className="flex min-h-0 flex-1 flex-col border-b border-border">
          <header className="flex items-center justify-between px-4 py-3">
            <h2 className="text-xl font-semibold">Lightning (L2)</h2>
            <LayerPlus
              open={openL2}
              onToggle={() => {
                setOpenL2((value) => !value)
                setOpenL1(false)
              }}
              services={L2_SERVICES}
              table={{ headers: ['Node', 'Canaux', 'LN'], rows: NODE_ROWS }}
            />
          </header>
          <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
            Graphe Lightning
          </div>
        </section>

        <section className="flex h-72 shrink-0 flex-col bg-bg-secondary">
          <header className="flex items-center justify-between px-4 py-3">
            <h2 className="text-xl font-semibold">Bitcoin (L1)</h2>
            <LayerPlus
              open={openL1}
              onToggle={() => {
                setOpenL1((value) => !value)
                setOpenL2(false)
              }}
              services={L1_SERVICES}
              table={{ headers: ['Portefeuille', 'Sats', 'Adresse'], rows: WALLET_ROWS }}
            />
          </header>
          <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
            Mempool + blocs
          </div>
        </section>
      </div>
    </LayoutPreviewShell>
  )
}
