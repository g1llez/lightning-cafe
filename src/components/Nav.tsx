import { useTranslation } from 'react-i18next'
import { setAppLanguage } from '../i18n'
import { totalSats } from '../simulation/player'
import { useSimulation } from '../simulation/SimulationProvider'

type NavProps = {
  onGuideClick: () => void
}

export function Nav({ onGuideClick }: NavProps) {
  const { t, i18n } = useTranslation()
  const { player, btcPriceCad } = useSimulation()
  const currentLanguage = i18n.language.startsWith('fr') ? 'fr' : 'en'

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-bg-secondary px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <img
          src={`${import.meta.env.BASE_URL}logo.png`}
          alt=""
          className="h-10 w-10 shrink-0 rounded-lg object-cover"
        />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">{t('app.title')}</h1>
          <p className="truncate text-sm text-text-muted">{t('app.subtitle')}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-3 rounded-md border border-border bg-bg-panel px-3 py-2 font-mono text-sm sm:flex">
          <span>{player.cad.toLocaleString()} $</span>
          <span className="text-border">|</span>
          <span className="text-accent">{totalSats(player).toLocaleString()} sats</span>
          <span className="text-border">|</span>
          <span className="text-text-muted">{t('services.price', { price: btcPriceCad.toLocaleString() })}</span>
        </div>

        <button
          type="button"
          onClick={onGuideClick}
          className="rounded-md border border-border bg-bg-panel px-3 py-2 text-sm transition hover:border-accent/60"
        >
          {t('nav.guide')}
        </button>

        <div
          className="flex rounded-md border border-border bg-bg-panel p-1"
          role="group"
          aria-label={t('nav.language')}
        >
          {(['fr', 'en'] as const).map((language) => (
            <button
              key={language}
              type="button"
              onClick={() => setAppLanguage(language)}
              className={`rounded px-2.5 py-1 text-xs font-semibold uppercase tracking-wide transition ${
                currentLanguage === language
                  ? 'bg-accent text-bg-primary'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {language}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
