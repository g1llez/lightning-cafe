import { useState } from 'react'
import {
  AssetTable,
  L1_SERVICES,
  L2_SERVICES,
  LayerCanvas,
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
      title="B — Table au centre du canvas"
      subtitle="La table est un widget au milieu de L1 / L2, au-dessus du visuel."
      pros={['Assets au premier plan', 'Toujours dans la couche', 'Moins de place au graphe']}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <LayerCanvas
          tall
          title="Lightning (L2)"
          visual="Graphe Lightning"
          tablePosition="center"
          plus={
            <PlusMenu
              open={openL2}
              onToggle={() => {
                setOpenL2((value) => !value)
                setOpenL1(false)
              }}
              items={L2_SERVICES}
            />
          }
          table={<AssetTable headers={['Node', 'Canaux', 'Balance']} rows={NODE_ROWS} />}
        />
        <div className="border-t border-border" />
        <LayerCanvas
          title="Bitcoin (L1)"
          visual="Mempool + blocs"
          tablePosition="center"
          plus={
            <PlusMenu
              open={openL1}
              onToggle={() => {
                setOpenL1((value) => !value)
                setOpenL2(false)
              }}
              items={L1_SERVICES}
            />
          }
          table={<AssetTable headers={['Portefeuille', 'Sats', 'Adresse']} rows={WALLET_ROWS} />}
        />
      </div>
    </LayoutPreviewShell>
  )
}
