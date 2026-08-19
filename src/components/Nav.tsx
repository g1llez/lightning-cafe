import { useTranslation } from 'react-i18next'
import { setAppLanguage } from '../i18n'
import { pendingSats, totalSats } from '../simulation/player'
import { useSimulation } from '../simulation/SimulationProvider'
import { SessionMenu } from './SessionMenu'
import { Tooltip } from './Tooltip'

type NavProps = {
  onGuideClick: () => void
  onBuyClick: () => void
}

export function Nav({ onGuideClick, onBuyClick }: NavProps) {
  const { t, i18n } = useTranslation()
  const { player, btcPriceCad } = useSimulation()
  const currentLanguage = i18n.language.startsWith('fr') ? 'fr' : 'en'
  const waiting = pendingSats(player)

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
        <div data-fly="funds" className="hidden rounded-md border border-border bg-bg-panel px-3 py-1.5 sm:block">
          <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted">{t('nav.myFunds')}</p>
          <p className="flex items-center gap-2 font-mono text-sm leading-tight">
            <span>{player.cad.toLocaleString()} $</span>
            <span className="text-border">|</span>
            <span className="text-accent">{totalSats(player).toLocaleString()} sats</span>
            {waiting > 0 && (
              <span className="text-xs text-text-muted">
                {t('assets.pending', { sats: waiting.toLocaleString() })}
              </span>
            )}
          </p>
        </div>

        <div className="hidden rounded-md border border-dashed border-border px-3 py-1.5 md:block">
          <p className="text-[10px] uppercase tracking-[0.14em] text-text-muted">{t('nav.market')}</p>
          <Tooltip text={t('nav.priceTip')}>
            <p className="font-mono text-sm leading-tight text-text-muted">
              {t('nav.btcPrice', { price: btcPriceCad.toLocaleString() })}
            </p>
          </Tooltip>
        </div>

        <button
          type="button"
          onClick={onBuyClick}
          className="rounded-md bg-accent px-3 py-2 text-sm font-semibold text-bg-primary transition hover:brightness-110"
        >
          {t('services.buy')}
        </button>

        <SessionMenu />

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
