type BitcoinNodeIconProps = {
  className?: string
  title?: string
}

/** Simple orange round Bitcoin mark for network peers. */
export function BitcoinNodeIcon({ className = 'h-8 w-8', title }: BitcoinNodeIconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label={title ?? 'Bitcoin'}>
      {title ? <title>{title}</title> : null}
      <circle cx="16" cy="16" r="15" fill="#f7931a" />
      <circle cx="16" cy="16" r="15" fill="none" stroke="#c46e0a" strokeWidth="1.5" />
      <text
        x="16"
        y="17"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#1a1208"
        fontSize="15"
        fontWeight="700"
        fontFamily="ui-sans-serif, system-ui, sans-serif"
      >
        ₿
      </text>
    </svg>
  )
}
