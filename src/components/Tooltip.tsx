import type { ReactNode } from 'react'

type TooltipProps = {
  text: ReactNode
  children: ReactNode
}

export function Tooltip({ text, children }: TooltipProps) {
  return (
    <span className="relative inline-flex justify-center">
      <span className="peer cursor-help">{children}</span>
      <span className="pointer-events-none absolute bottom-full z-50 mb-2 hidden w-64 -translate-y-0 rounded-md border border-border bg-bg-panel px-3 py-2 text-left text-xs leading-relaxed text-text-primary shadow-lg peer-hover:block">
        {text}
      </span>
    </span>
  )
}
