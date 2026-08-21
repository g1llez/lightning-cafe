import type { CSSProperties } from 'react'

type BitcoinNodeIconProps = {
  className?: string
  style?: CSSProperties
  title?: string
}

/** Orange Bitcoin mark — official ₿ (two stems) centered on the disc. */
export function BitcoinNodeIcon({ className = 'h-8 w-8', style, title }: BitcoinNodeIconProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} style={style} role="img" aria-label={title ?? 'Bitcoin'}>
      {title ? <title>{title}</title> : null}
      <circle cx="16" cy="16" r="16" fill="#f7931a" />
      <path
        fill="#fff"
        d="M22.62 14.12c.31-2.1-1.29-3.23-3.48-3.99l.71-2.84-1.73-.43-.69 2.77c-.45-.11-.92-.22-1.38-.33l.7-2.79-1.73-.43-.71 2.84c-.38-.09-.75-.17-1.1-.26l.01-.02-2.38-.59-.46 1.84s1.28.29 1.25.31c.7.17.82.63.8 1l-1.86 7.44c-.09.22-.31.55-.65.42.01.02-1.25.31-1.25.31l-.85 1.97 2.24.56c.41.1.82.22 1.22.32l-.72 2.88 1.73.43.71-2.84c.47.13.93.24 1.38.36l-.71 2.82 1.73.43.72-2.87c2.96.56 5.19.33 6.12-2.33.75-2.15-.04-3.38-1.58-4.18 1.13-.26 1.98-1.01 2.2-2.54zm-3.94 5.53c-.53 2.15-4.14.98-5.31.65l.95-3.81c1.17.29 4.92 1.17 4.36 3.16zm.53-5.56c-.49 1.95-3.5.96-4.47.72l.86-3.45c.97.24 4.12.7 3.61 2.73z"
      />
    </svg>
  )
}
