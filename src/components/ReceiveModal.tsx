import { useTranslation } from 'react-i18next'
import { receiveAddress, type Wallet } from '../simulation/player'
import { Tooltip } from './Tooltip'
import { Modal } from './Modal'

type ReceiveModalProps = {
  wallet: Wallet
  onClose: () => void
  onCopy: (address: string) => void
  onNewAddress: () => void
}

export function ReceiveModal({ wallet, onClose, onCopy, onNewAddress }: ReceiveModalProps) {
  const { t } = useTranslation()
  const address = receiveAddress(wallet)

  return (
    <Modal title={t('assets.receiveTitle')} closeLabel={t('common.close')} onClose={onClose}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-[0.14em] text-text-muted">
            {t('assets.receive')}
          </span>
          <Tooltip text={t('assets.publicTip')}>
            <span className="text-[11px] text-text-muted">ⓘ</span>
          </Tooltip>
        </div>
        <p className="break-all rounded-md border border-border bg-bg-primary px-2 py-1.5 font-mono text-[11px]">
          {address}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onCopy(address)}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-bg-primary transition hover:brightness-110"
          >
            {t('assets.copy')}
          </button>
          <button
            type="button"
            onClick={onNewAddress}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-text-muted transition hover:border-accent/60 hover:text-text-primary"
          >
            {t('assets.newAddress')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
