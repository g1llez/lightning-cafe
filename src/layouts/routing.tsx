import { useEffect, useState, type ReactNode } from 'react'

export type LayoutRoute = 'app' | 'layouts' | 'layout-a' | 'layout-b' | 'layout-c'

function readRoute(): LayoutRoute {
  const hash = window.location.hash.replace('#', '') || '/'
  if (hash === '/layouts') return 'layouts'
  if (hash === '/layout-a') return 'layout-a'
  if (hash === '/layout-b') return 'layout-b'
  if (hash === '/layout-c') return 'layout-c'
  return 'app'
}

export function useLayoutRoute() {
  const [route, setRoute] = useState<LayoutRoute>(readRoute)

  useEffect(() => {
    const onHashChange = () => setRoute(readRoute())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  return route
}

export function LayoutLink({
  to,
  children,
  className = '',
}: {
  to: LayoutRoute
  children: ReactNode
  className?: string
}) {
  const href = to === 'app' ? '#/' : to === 'layouts' ? '#/layouts' : `#/${to}`

  return (
    <a
      href={href}
      onClick={(event) => {
        event.preventDefault()
        window.location.hash = href.slice(1)
      }}
      className={className}
    >
      {children}
    </a>
  )
}
