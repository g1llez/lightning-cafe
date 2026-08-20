import { useTranslation } from 'react-i18next'
import { useSimulation } from '../simulation/SimulationProvider'

export function Footer() {
  const { t } = useTranslation()
  const { resetSandbox } = useSimulation()

  return (
    <footer className="shrink-0 border-t border-border bg-bg-primary px-4 py-2 text-center text-[11px] text-text-muted">
      <p>{t('app.disclaimer')}</p>
      <p className="mt-1">{t('footer.inspired')}</p>
      <p className="mt-1">
        <button
          type="button"
          onClick={() => {
            if (window.confirm(t('footer.resetConfirm'))) {
              resetSandbox()
            }
          }}
          className="text-[11px] text-text-muted underline decoration-border underline-offset-2 hover:text-text-primary"
        >
          {t('footer.reset')}
        </button>
      </p>
    </footer>
  )
}
