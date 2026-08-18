import type { ReactNode } from 'react'
import { LayoutLink } from './routing'

type LayoutPreviewShellProps = {
  title: string
  subtitle: string
  pros: string[]
  children: ReactNode
}

export function LayoutPreviewShell({ title, subtitle, pros, children }: LayoutPreviewShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-primary">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-bg-secondary px-4 py-3">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.18em] text-accent">Layout preview</p>
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-text-muted">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <StatusBar />
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

export function StatusBar() {
  return (
    <div className="hidden items-center gap-3 rounded-md border border-border bg-bg-panel px-3 py-2 font-mono text-sm sm:flex">
      <span className="text-text-primary">1 000 $</span>
      <span className="text-border">|</span>
      <span className="text-accent">BTC 100 000 $</span>
    </div>
  )
}

export function PlusMenu({
  open,
  onToggle,
  items,
}: {
  open: boolean
  onToggle: () => void
  items: string[]
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-accent/70 bg-bg-panel text-lg leading-none text-accent"
        aria-label="Services"
      >
        +
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-border bg-bg-panel py-1 shadow-lg">
          {items.map((item) => (
            <button
              key={item}
              type="button"
              className="block w-full px-3 py-2 text-left text-sm hover:bg-bg-secondary"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function AssetTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}) {
  return (
    <table className="w-full text-left text-sm">
      <thead>
        <tr className="text-[11px] uppercase tracking-[0.14em] text-text-muted">
          {headers.map((header) => (
            <th key={header} className="px-2 py-1 font-medium">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.join('-')} className="border-t border-border">
            {row.map((cell) => (
              <td key={cell} className="px-2 py-1.5 font-mono text-xs">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export const L1_SERVICES = ['Créer un portefeuille', 'Acheter 100 $ de BTC', 'Envoyer on-chain']
export const L2_SERVICES = ['Créer une node', 'Ouvrir un canal', 'Payer en Lightning']

export const WALLET_ROWS = [
  ['Portefeuille 1', '100 000 sats', 'bc1q…cafe'],
  ['Portefeuille 2', '0 sats', 'bc1q…sand'],
]

export const NODE_ROWS = [
  ['LaFamilia', '0 canaux', '0 sats LN'],
]
