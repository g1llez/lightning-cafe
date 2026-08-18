import type { ReactNode } from 'react'
import { PlusMenu } from './PlusMenu'

type LayerAssetCardProps = {
  title: string
  plusLabel: string
  plusOpen: boolean
  onPlusToggle: () => void
  plusItems: { label: string; onClick: () => void }[]
  extra?: ReactNode
  children: ReactNode
}

export function LayerAssetCard({
  title,
  plusLabel,
  plusOpen,
  onPlusToggle,
  plusItems,
  extra,
  children,
}: LayerAssetCardProps) {
  return (
    <div className="absolute top-1/2 left-4 z-10 w-[min(22rem,calc(100%-2rem))] -translate-y-1/2 rounded-lg border border-border bg-bg-panel/95 p-3 shadow-lg backdrop-blur">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs leading-none uppercase tracking-[0.14em] text-text-muted">{title}</span>
        <PlusMenu open={plusOpen} onToggle={onPlusToggle} items={plusItems} label={plusLabel} />
      </div>
      {children}
      {extra}
    </div>
  )
}
