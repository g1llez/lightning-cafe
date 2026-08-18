import { LayoutPreviewShell, MockAssetsPanel, MockSandbox, MockServicesPanel } from './LayoutPreviewShell'

export function LayoutA() {
  return (
    <LayoutPreviewShell
      title="Layout A — Sidebar empilée"
      subtitle="Assets en haut (inventaire), Services en bas (actions). Sandbox à droite."
      pros={['Tout visible', 'Séparation claire', 'Proche du layout actuel']}
    >
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="flex w-full shrink-0 flex-col border-b border-border bg-bg-secondary md:w-72 md:border-r md:border-b-0">
          <div className="flex-1 overflow-y-auto border-b border-accent/30 p-4">
            <MockAssetsPanel />
          </div>
          <div className="border-t border-accent/30 bg-bg-panel/50 p-4">
            <MockServicesPanel />
          </div>
        </aside>
        <MockSandbox />
      </div>
    </LayoutPreviewShell>
  )
}
