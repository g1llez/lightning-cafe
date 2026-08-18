import type { ReactNode } from 'react'
import { LayoutLink } from './routing'

const MOCK = {
  balance: '1 000 $',
  sats: '100 000 sats',
  btcPrice: '100 000 $',
  wallets: [
    { name: 'Portefeuille 1', sats: '100 000 sats' },
    { name: 'Portefeuille 2', sats: '0 sats' },
  ],
  nodes: [{ name: 'Node 1', alias: 'LaFamilia', channels: 0 }],
}

type LayoutPreviewShellProps = {
  title: string
  subtitle: string
  pros: string[]
  children: ReactNode
}

export function LayoutPreviewShell({ title, subtitle, pros, children }: LayoutPreviewShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <header className="flex shrink-0 items-center justify-between border-b border-border bg-bg-secondary px-4 py-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-accent">Layout preview</p>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-text-muted">{subtitle}</p>
        </div>
        <div className="flex gap-2">
          <LayoutLink
            to="layouts"
            className="rounded-md border border-border bg-bg-panel px-3 py-2 text-sm hover:border-accent/60"
          >
            ← Layouts
          </LayoutLink>
          <LayoutLink
            to="app"
            className="rounded-md border border-border bg-bg-panel px-3 py-2 text-sm hover:border-accent/60"
          >
            App
          </LayoutLink>
        </div>
      </header>

      <div className="border-b border-border bg-bg-panel px-4 py-2 text-sm text-text-muted">
        {pros.map((item) => (
          <span key={item} className="mr-4">
            • {item}
          </span>
        ))}
      </div>

      {children}
    </div>
  )
}

export function MockSandbox() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 items-center justify-center border-b border-border bg-bg-primary">
        <span className="text-sm text-text-muted">Lightning (L2) — graphe</span>
      </div>
      <div className="flex h-44 shrink-0 items-center justify-center border-t border-border bg-bg-secondary">
        <span className="text-sm text-text-muted">Bitcoin (L1) — mempool + blocs</span>
      </div>
    </div>
  )
}

export function MockAssetsPanel({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex flex-col ${compact ? 'gap-2' : 'gap-3'}`}>
      <div className="rounded-md border border-border bg-bg-panel px-3 py-2">
        <p className="font-mono text-base">{MOCK.balance}</p>
        <p className="font-mono text-sm text-accent">{MOCK.sats}</p>
      </div>
      <div>
        <p className="mb-1 text-xs uppercase tracking-[0.16em] text-text-muted">Assets</p>
        {MOCK.wallets.map((wallet) => (
          <div key={wallet.name} className="mb-1 rounded border border-border bg-bg-panel px-2 py-1.5 text-sm">
            <span className="block">{wallet.name}</span>
            <span className="font-mono text-xs text-accent">{wallet.sats}</span>
          </div>
        ))}
        {MOCK.nodes.map((node) => (
          <div key={node.name} className="rounded border border-border bg-bg-panel px-2 py-1.5 text-sm">
            <span className="block">{node.name} · {node.alias}</span>
            <span className="text-xs text-text-muted">{node.channels} canaux</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function MockServicesPanel() {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.16em] text-text-muted">Services</p>
      <p className="text-xs text-text-muted">BTC {MOCK.btcPrice}</p>
      <div className="rounded border border-dashed border-border bg-bg-panel px-2 py-1.5 text-sm text-text-muted">
        npub1…
      </div>
      <button type="button" className="w-full rounded border border-border bg-bg-panel px-2 py-1.5 text-left text-sm">
        + Créer portefeuille
      </button>
      <button type="button" className="w-full rounded border border-border bg-bg-panel px-2 py-1.5 text-left text-sm">
        + Créer node
      </button>
      <button type="button" className="w-full rounded border border-border bg-bg-panel px-2 py-1.5 text-left text-sm">
        Acheter 100 $ de BTC
      </button>
    </div>
  )
}

export { MOCK }
