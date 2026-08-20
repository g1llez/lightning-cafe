/** Read-only checks against cafe-session prod. No POST, no WS, no container restart. */

const BASE = 'https://cafe-session.sarius.ca'
const PAGES = 'https://g1llez.github.io'

async function get(path, origin) {
  const headers = origin ? { Origin: origin } : {}
  const response = await fetch(`${BASE}${path}`, { headers })
  const body = await response.json()
  return { status: response.status, body, allowOrigin: response.headers.get('access-control-allow-origin') }
}

function assert(ok, message) {
  if (!ok) {
    throw new Error(message)
  }
}

const health = await get('/health')
assert(health.status === 200 && health.body.status === 'ok', `health ${health.status}`)

const missing = await get('/rooms/notarealroom00000')
assert(missing.status === 404 && missing.body.error === 'not_found', `missing room ${missing.status}`)

const pages = await get('/health', PAGES)
assert(pages.allowOrigin === PAGES, `cors pages ${pages.allowOrigin}`)

const foreign = await get('/health', 'https://evil.example')
assert(foreign.status === 200 && foreign.allowOrigin === null, `cors foreign ${foreign.allowOrigin}`)

console.log('OK')
