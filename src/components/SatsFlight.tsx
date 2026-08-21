import { useEffect, useRef } from 'react'
import type { Priority } from '../simulation/chain'

type SatsFlightProps = {
  label: string
  target: string
  from?: string
  onDone: () => void
}

/** Single naming contract between the fee choice and the block that receives the chip. */
export function mempoolFlyId(priority: Priority): string {
  return `mempool-${priority}`
}

export function nodeFlyId(nodeId: string): string {
  return `node-${nodeId}`
}

function centerOf(element: Element): { x: number; y: number } {
  const rect = element.getBoundingClientRect()
  if (rect.width === 0) {
    return { x: window.innerWidth - 24, y: 24 }
  }
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

/** Shows the money leaving the player's funds and landing in the mempool block. */
export function SatsFlight({ label, target: targetId, from = 'funds', onDone }: SatsFlightProps) {
  const chipRef = useRef<HTMLDivElement>(null)
  const doneRef = useRef(onDone)
  doneRef.current = onDone

  useEffect(() => {
    const chip = chipRef.current
    const source = document.querySelector(`[data-fly="${from}"]`)
    const target = document.querySelector(`[data-fly="${targetId}"]`)

    if (!chip || !source || !target) {
      doneRef.current()
      return
    }

    const origin = centerOf(source)
    const dest = centerOf(target)
    chip.style.left = `${origin.x}px`
    chip.style.top = `${origin.y}px`

    const dx = dest.x - origin.x
    const dy = dest.y - origin.y
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const animation = chip.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.9)', opacity: 0 },
        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1, offset: 0.15 },
        {
          transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 40}px)) scale(1)`,
          opacity: 1,
          offset: 0.6,
        },
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.4)`,
          opacity: 0,
        },
      ],
      { duration: reduced ? 450 : 1_200, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
    )

    // Cancelling rejects `finished`; without this guard React's dev remount
    // would end the flight before the real animation is ever seen.
    let cancelled = false

    animation.finished
      .then(() => doneRef.current())
      .catch(() => {
        if (!cancelled) {
          doneRef.current()
        }
      })

    return () => {
      cancelled = true
      animation.cancel()
    }
  }, [from, targetId])

  return (
    <div
      ref={chipRef}
      data-testid="sats-flight"
      aria-hidden="true"
      className="pointer-events-none fixed z-[60] rounded-full bg-accent px-2 py-1 font-mono text-[11px] font-semibold whitespace-nowrap text-bg-primary opacity-0 shadow-lg"
    >
      {label}
    </div>
  )
}
