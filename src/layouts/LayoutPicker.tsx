import { LayoutLink } from './routing'

const OPTIONS = [
  {
    id: 'layout-a' as const,
    name: 'A — Sidebar empilée',
    desc: 'Assets (haut) + Services (bas) à gauche. Créer wallet/node dans Services → apparaît dans Assets.',
  },
  {
    id: 'layout-b' as const,
    name: 'B — Onglets',
    desc: 'Sandbox | Assets | Services en nav. Chaque zone a son écran. Le plus propre à long terme.',
  },
  {
    id: 'layout-c' as const,
    name: 'C — Drawer Services',
    desc: 'Assets toujours visible à gauche. Services en panneau coulissant. Sandbox jamais caché.',
  },
]

export function LayoutPicker() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-primary p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Choisir un layout</h1>
          <p className="mt-1 text-text-muted">Pages temporaires — on supprimera après le choix.</p>
        </div>
        <LayoutLink
          to="app"
          className="rounded-md border border-border bg-bg-panel px-4 py-2 text-sm hover:border-accent/60"
        >
          ← Retour app
        </LayoutLink>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {OPTIONS.map((option) => (
          <LayoutLink
            key={option.id}
            to={option.id}
            className="rounded-xl border border-border bg-bg-secondary p-6 text-left transition hover:border-accent/60"
          >
            <h2 className="text-lg font-semibold text-accent">{option.name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">{option.desc}</p>
            <span className="mt-4 inline-block text-sm text-text-primary">Voir la démo →</span>
          </LayoutLink>
        ))}
      </div>
    </div>
  )
}
