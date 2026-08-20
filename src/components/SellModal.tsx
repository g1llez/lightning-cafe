import { useTranslation } from 'react-i18next'
import { exchangeAddress, EXCHANGE_CONFIRMATIONS } from '../simulation/player'
import { Modal } from './Modal'
import { InfoMark } from './Tooltip'

type SellModalProps = {
  onClose: () => void
  onMessage: (message: string) => void
}

export function SellModal({ onClose, onMessage }: SellModalProps) {
  const { t } = useTranslation()
  const deposit = exchangeAddress()

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(deposit)
      onMessage(t('services.sellDepositCopied'))
    } catch {
      onMessage(t('services.pasteFailed'))
    }
  }

  return (
    <Modal title={t('services.sellTitle')} closeLabel={t('common.close')} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-[12px] leading-relaxed text-text-primary">{t('services.sellBlurb')}</p>

        <div>
          <p className="mb-1.5 text-xs uppercase tracking-[0.14em] text-text-muted">
            {t('services.sellDeposit')}
          </p>
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 break-all font-mono text-[11px] text-text-primary">{deposit}</p>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="shrink-0 rounded-md border border-border px-2.5 py-1.5 text-xs text-text-muted transition hover:border-accent/60 hover:text-accent"
            >
              {t('assets.copy')}
            </button>
          </div>
        </div>

        <p className="flex items-center gap-1.5 text-[12px] leading-relaxed text-text-muted">
          {t('services.sellConfirmations', { count: EXCHANGE_CONFIRMATIONS })}
          <InfoMark text={t('services.sellConfirmationsTip', { count: EXCHANGE_CONFIRMATIONS })} />
        </p>

        <p className="text-[12px] leading-relaxed text-text-muted">{t('services.sellNext')}</p>
      </div>
    </Modal>
  )
}
