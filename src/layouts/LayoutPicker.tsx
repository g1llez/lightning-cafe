import { LayoutLink } from './routing'

const OPTIONS = [
  {
    id: 'layout-a' as const,
    name: 'A — Table dans la couche',
    desc: 'Tableau d assets sous le titre L1 / L2. Le + ouvre uniquement les services de cette couche (wallet/achat en L1, node/canal en L2).',
  },
  {
    id: 'layout-b' as const,
    name: 'B — Visuel + table côte à côte',
    desc: 'Chaque layer est coupé : graphe ou chaine à gauche, tableau + menu à droite. Inventaire toujours visible.',
  },
  {
    id: 'layout-c' as const,
    name: 'C — Sandbox propre',
    desc: 'L1 et L2 restent visuels. Le + ouvre à la fois le menu de services et le tableau de cette couche.',
  },
]

export function LayoutPicker() {
  return (
    <div className="flex min-h-screen flex-col bg-bg-primary p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Choisir un layout</h1>
          <p className="mt-1 text-text-muted">
            $ et prix BTC en haut à droite. Services collés à L1 ou L2 via un +.
          </p>
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
