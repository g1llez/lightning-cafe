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

export function LayoutB() {
  const [openL2, setOpenL2] = useState(false)
  const [openL1, setOpenL1] = useState(false)

  return (
    <LayoutPreviewShell
      title="B — Visuel + table côte à côte"
      subtitle="Dans chaque layer : graphe/chaine à gauche, tableau + à droite."
      pros={['Lecture et actions séparées', 'Tables toujours visibles', 'Bonne densité desktop']}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <section className="flex min-h-0 flex-1 border-b border-border">
          <div className="flex min-w-0 flex-1 items-center justify-center text-sm text-text-muted">
            Graphe Lightning (L2)
          </div>
          <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-bg-secondary p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-text-muted">
                L2
              </h2>
              <PlusMenu
                open={openL2}
                onToggle={() => {
                  setOpenL2((value) => !value)
                  setOpenL1(false)
                }}
                items={L2_SERVICES}
              />
            </div>
            <AssetTable headers={['Node', 'Canaux', 'LN']} rows={NODE_ROWS} />
          </aside>
        </section>

        <section className="flex h-72 shrink-0 bg-bg-secondary">
          <div className="flex min-w-0 flex-1 items-center justify-center text-sm text-text-muted">
            Mempool + blocs (L1)
          </div>
          <aside className="flex w-72 shrink-0 flex-col border-l border-border bg-bg-panel/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-text-muted">
                L1
              </h2>
              <PlusMenu
                open={openL1}
                onToggle={() => {
                  setOpenL1((value) => !value)
                  setOpenL2(false)
                }}
                items={L1_SERVICES}
              />
            </div>
            <AssetTable headers={['Wallet', 'Sats', 'Addr']} rows={WALLET_ROWS} />
          </aside>
        </section>
      </div>
    </LayoutPreviewShell>
  )
}
