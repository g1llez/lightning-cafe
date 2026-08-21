type BitcoinNodeIconProps = {
  className?: string
  title?: string
}

/** Simple orange round Bitcoin mark — ₿ path is geometrically centered. */
export function BitcoinNodeIcon({ className = 'h-8 w-8', title }: BitcoinNodeIconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label={title ?? 'Bitcoin'}>
      {title ? <title>{title}</title> : null}
      <circle cx="16" cy="16" r="15" fill="#f7931a" />
      <circle cx="16" cy="16" r="15" fill="none" stroke="#c46e0a" strokeWidth="1.5" />
      <path
        fill="#1a1208"
        d="M18.35 7.2V5.55h-1.7V7.2h-1.05V5.55h-1.7V7.22c-2.42.28-4.05 1.86-4.05 4.18 0 1.78 1.02 3.08 2.58 3.66-2.02.66-3.12 2.16-3.12 4.18 0 2.62 2.08 4.42 4.92 4.62v1.68h1.7v-1.66h1.05v1.66h1.7v-1.68c2.58-.22 4.42-1.96 4.42-4.58 0-2.08-1.18-3.52-3.12-4.14 1.86-.66 2.88-2.08 2.88-3.88 0-2.32-1.82-3.9-4.26-4.18zm.15 11.42c0 1.52-1.18 2.48-3.12 2.48h-2.52c-1.78 0-2.92-.96-2.92-2.44 0-1.48 1.16-2.5 3-2.5h2.52c1.86 0 3.04.98 3.04 2.46zm-.18-7.18c0 1.36-1.04 2.24-2.72 2.24h-2.28c-1.62 0-2.62-.88-2.62-2.24s1.04-2.24 2.7-2.24h2.28c1.64 0 2.64.88 2.64 2.24z"
      />
    </svg>
  )
}
