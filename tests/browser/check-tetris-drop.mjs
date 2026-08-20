/**
 * Smoke-check that the high-lane tetris piece actually moves down via CSS.
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

async function fallingTop() {
  return falling.evaluate((node) => node.getBoundingClientRect().top)
}

const samples = []
const deadline = Date.now() + 3_000
while (Date.now() < deadline && samples.length < 40) {
  if ((await falling.count()) === 1) {
    samples.push(await fallingTop())
  }
  await page.waitForTimeout(50)
}

await page.screenshot({ path: `${SHOTS}/tetris-drop.png` })
await browser.close()

let downSteps = 0
for (let index = 1; index < samples.length; index += 1) {
  const prev = samples[index - 1]
  const next = samples[index]
  // Screen Y grows downward; a falling piece's top increases.
  if (Number.isFinite(prev) && Number.isFinite(next) && next > prev + 1) {
    downSteps += 1
  }
}

console.log(
  `falling top px: ${samples
    .slice(0, 6)
    .map((y) => Math.round(y))
    .join(' -> ')}... (${samples.length} samples, ${downSteps} down-steps)`,
)

if (downSteps < 2) {
  console.error('Tetris piece did not move down during the drop window')
  process.exitCode = 1
}
