/**
 * Smoke-check that the high-lane tetris piece actually moves down.
 * Run with a local preview: npm run build && npm run preview
 * Then: npm run test:browser:tetris
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const URL = process.env.TETRIS_URL ?? 'http://127.0.0.1:4173/lightning-cafe/?block=12'
const SHOTS = 'tests/browser/shots'

mkdirSync(SHOTS, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

page.on('pageerror', (error) => console.log('[pageerror]', error.message))

await page.goto(URL, { waitUntil: 'networkidle' })

const falling = page.getByTestId('tetris-falling')
await falling.waitFor({ state: 'visible', timeout: 8_000 })

const samples = []
const deadline = Date.now() + 2_500
while (Date.now() < deadline && samples.length < 50) {
  if ((await falling.count()) === 1) {
    samples.push(Number(await falling.getAttribute('data-y')))
  }
  await page.waitForTimeout(40)
}

await page.screenshot({ path: `${SHOTS}/tetris-drop.png` })
await browser.close()

let rose = 0
for (let index = 1; index < samples.length; index += 1) {
  const prev = samples[index - 1]
  const next = samples[index]
  if (Number.isFinite(prev) && Number.isFinite(next) && next > prev + 0.2) {
    rose += 1
  }
}

console.log(`falling samples: ${samples.slice(0, 8).map((y) => y.toFixed(2)).join(' -> ')}... (${samples.length} total, ${rose} down-steps)`)

if (rose < 2) {
  console.error('Tetris piece did not move down during the drop window')
  process.exitCode = 1
}
