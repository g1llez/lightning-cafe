import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const URL = 'http://localhost:5173/lightning-cafe/'
const SHOTS = 'tests/browser/shots'

mkdirSync(SHOTS, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  permissions: ['clipboard-read', 'clipboard-write'],
})
const page = await context.newPage()

page.on('pageerror', (error) => console.log('[pageerror]', error.message))

await page.goto(URL, { waitUntil: 'networkidle' })

await page.getByRole('button', { name: /Créer un portefeuille|Create a wallet/ }).click()
await page.getByRole('button', { name: /^OK$/ }).click()
await page.getByRole('button', { name: /^Recevoir$|^Receive$/ }).click()
const address = (await page.locator('p.font-mono.break-all').first().innerText()).trim()
await page.getByRole('button', { name: /^Copier$|^Copy$/ }).click()

await page.getByRole('button', { name: /^Acheter$|^Buy$/ }).click()
await page.getByRole('button', { name: /^Coller$|^Paste$/ }).click()

const pasted = await page.getByPlaceholder(/lc1q/).inputValue()
console.log(`paste button: ${pasted === address ? 'ok' : `MISMATCH (${pasted})`}`)
await page.screenshot({ path: `${SHOTS}/1-buy-modal.png` })

const targetBox = await page.locator('[data-fly="mempool-high"]').boundingBox()
await page.getByRole('button', { name: /Acheter .*sats|^Buy .*sats/ }).click()

const chip = page.getByTestId('sats-flight')
await page.waitForTimeout(250)
console.log('chip visible mid-flight:', (await chip.count()) === 1)
await page.screenshot({ path: `${SHOTS}/2-flight-250ms.png` })

await page.waitForTimeout(700)
await page.screenshot({ path: `${SHOTS}/3-flight-950ms.png` })

const chipBox = await chip.boundingBox()
const center = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 })
const landing = center(chipBox)
const wanted = center(targetBox)
const drift = Math.hypot(landing.x - wanted.x, landing.y - wanted.y)
console.log(`landing drift from high block: ${Math.round(drift)}px`)

await browser.close()

if (pasted !== address || drift > 40) {
  process.exitCode = 1
}
