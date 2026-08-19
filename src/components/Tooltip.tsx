import type { ReactNode } from 'react'

type TooltipProps = {
  text: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom'
}

export function Tooltip({ text, children, side = 'top' }: TooltipProps) {
  const place =
    side === 'bottom'
      ? 'top-full mt-2'
      : 'bottom-full mb-2'

  return (
    <span className="relative inline-flex justify-center">
      <span className="peer">{children}</span>
      <span
        className={`pointer-events-none absolute ${place} z-[70] hidden w-64 rounded-md border border-border bg-bg-panel px-3 py-2 text-left text-xs font-normal normal-case tracking-normal leading-relaxed text-text-primary shadow-lg peer-hover:block`}
      >
        {text}
      </span>
    </span>
  )
}

export function InfoMark({ text }: { text: ReactNode }) {
  return (
    <Tooltip text={text}>
      <span className="cursor-help text-[11px] text-text-muted">ⓘ</span>
    </Tooltip>
  )
}
