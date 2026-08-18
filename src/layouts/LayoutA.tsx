import { useState } from 'react'
import {
  AssetTable,
  L1_SERVICES,
  L2_SERVICES,
  LayoutPreviewShell,
  NODE_ROWS,
  PlusMenu,
  WALLET_ROWS,
} from './LayoutPreviewShell'

export function LayoutA() {
  const [openL2, setOpenL2] = useState(false)
  const [openL1, setOpenL1] = useState(false)

  return (
    <LayoutPreviewShell
      title="A — Table dans la couche"
      subtitle="Chaque layer a son tableau d assets et un + pour les services de cette couche."
      pros={['Services collés à L1 ou L2', 'Inventaire visible sans sidebar', 'Statut $ / BTC en nav']}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <section className="flex min-h-0 flex-1 flex-col border-b border-border">
          <header className="flex items-center justify-between px-4 py-3">
            <h2 className="text-xl font-semibold">Lightning (L2)</h2>
            <PlusMenu
              open={openL2}
              onToggle={() => {
                setOpenL2((value) => !value)
                setOpenL1(false)
              }}
              items={L2_SERVICES}
            />
          </header>
          <div className="px-4 pb-3">
            <AssetTable headers={['Node', 'Canaux', 'Balance']} rows={NODE_ROWS} />
          </div>
          <div className="flex flex-1 items-center justify-center bg-bg-secondary/40 text-sm text-text-muted">
            Graphe Lightning
          </div>
        </section>

        <section className="flex h-72 shrink-0 flex-col bg-bg-secondary">
          <header className="flex items-center justify-between px-4 py-3">
            <h2 className="text-xl font-semibold">Bitcoin (L1)</h2>
            <PlusMenu
              open={openL1}
              onToggle={() => {
                setOpenL1((value) => !value)
                setOpenL2(false)
              }}
              items={L1_SERVICES}
            />
          </header>
          <div className="px-4 pb-3">
            <AssetTable headers={['Portefeuille', 'Sats', 'Adresse']} rows={WALLET_ROWS} />
          </div>
          <div className="flex flex-1 items-center justify-center text-sm text-text-muted">
            Mempool + blocs
          </div>
        </section>
      </div>
    </LayoutPreviewShell>
  )
}
