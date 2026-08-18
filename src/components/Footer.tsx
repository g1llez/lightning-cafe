import { useTranslation } from 'react-i18next'

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="shrink-0 border-t border-border bg-bg-primary px-4 py-2 text-center text-[11px] text-text-muted">
      <p>{t('app.disclaimer')}</p>
      <p className="mt-1">{t('footer.inspired')}</p>
    </footer>
  )
}
