/**
 * Smoke-check that the high-lane tetris active piece changes position over time.
 * Run: npm run build && npm run preview
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

async function fallingFingerprint() {
  return falling.evaluate((node) => {
    const cells = [...node.querySelectorAll('span')]
    return cells
      .map((cell) => {
        const box = cell.getBoundingClientRect()
        return `${Math.round(box.left)},${Math.round(box.top)}`
      })
      .join('|')
  })
}

const samples = []
const deadline = Date.now() + 4_000
while (Date.now() < deadline && samples.length < 50) {
  if ((await falling.count()) === 1) {
    samples.push(await fallingFingerprint())
  }
  await page.waitForTimeout(80)
}

await page.screenshot({ path: `${SHOTS}/tetris-drop.png` })
await browser.close()

const unique = new Set(samples.filter(Boolean))
console.log(`falling fingerprints: ${unique.size} unique / ${samples.length} samples`)

if (unique.size < 2) {
  console.error('Tetris active piece did not change pose during the window')
  process.exitCode = 1
}
