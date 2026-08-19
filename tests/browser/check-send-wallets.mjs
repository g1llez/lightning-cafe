import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const URL = 'http://localhost:5173/lightning-cafe/?block=1'
const SHOTS = 'tests/browser/shots'

mkdirSync(SHOTS, { recursive: true })

function readSats(text) {
  return Number(String(text).replace(/[^\d]/g, ''))
}

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  permissions: ['clipboard-read', 'clipboard-write'],
})
const page = await context.newPage()
page.on('pageerror', (error) => console.log('[pageerror]', error.message))

await page.goto(URL, { waitUntil: 'networkidle' })

async function createWallet() {
  await page.getByRole('button', { name: /Créer un portefeuille|Create a wallet/ }).click()
  await page.getByRole('button', { name: /^OK$/ }).click()
}

async function walletSats(id) {
  return readSats(await page.getByTestId(`wallet-sats-${id}`).innerText())
}

async function waitConfirmed(id, sats, timeout = 8000) {
  await page.waitForFunction(
    ({ id, sats }) => {
      const el = document.querySelector(`[data-testid="wallet-sats-${id}"]`)
      return el && el.textContent.replace(/[^\d]/g, '') === String(sats)
    },
    { id, sats },
    { timeout },
  )
}

await createWallet()
await createWallet()
await page.getByTestId('wallet-row-w-2').waitFor()

await page.getByTestId('receive-w-1').click()
await page.getByRole('button', { name: /^Copier$|^Copy$/ }).click()
await page.keyboard.press('Escape')

await page.getByRole('button', { name: /^Acheter$|^Buy$/ }).click()
await page.getByRole('button', { name: /^Coller$|^Paste$/ }).click()
await page.getByRole('button', { name: /Acheter .*sats|^Buy .*sats/ }).click()

await waitConfirmed('w-1', 100000)
console.log(`after buy: w1=${await walletSats('w-1')} w2=${await walletSats('w-2')}`)

await page.getByTestId('send-w-1').click()
await page.getByTestId('send-to-w-2').click()
await page.screenshot({ path: `${SHOTS}/4-send-to-w2.png` })
await page.getByRole('button', { name: /Envoyer .*sats|^Send .*sats/ }).click()

await page.waitForTimeout(250)
const pendingOnW1 = await page.getByTestId('wallet-pending-w-1').count()
const w1AfterSend = await walletSats('w-1')
console.log(`after send w1→w2: pending on w1=${pendingOnW1} w1=${w1AfterSend}`)

if (pendingOnW1 === 0) {
  console.log('FAIL: change did not show as pending on wallet 1')
}

await page.waitForFunction(
  () => {
    const el = document.querySelector('[data-testid="wallet-sats-w-2"]')
    return el && Number(el.textContent.replace(/[^\d]/g, '')) > 0
  },
  null,
  { timeout: 8000 },
)

const w2AfterConfirm = await walletSats('w-2')
const w1AfterConfirm = await walletSats('w-1')
console.log(`after confirm w1→w2: w1=${w1AfterConfirm} w2=${w2AfterConfirm}`)
await page.screenshot({ path: `${SHOTS}/5-w2-received.png` })

const firstHopOk =
  pendingOnW1 > 0 &&
  w1AfterSend === 0 &&
  w2AfterConfirm > 0 &&
  w1AfterConfirm > 0 &&
  w1AfterConfirm < 100000 &&
  w1AfterConfirm + w2AfterConfirm < 100000

await page.getByTestId('send-w-2').click()
await page.getByTestId('send-to-w-1').click()
await page.getByRole('button', { name: /Envoyer .*sats|^Send .*sats/ }).click()

await page.waitForTimeout(250)
const pendingOnW2 = await page.getByTestId('wallet-pending-w-2').count()
console.log(`after send w2→w1: pending on w2=${pendingOnW2}`)

await page.waitForFunction(
  ({ before }) => {
    const el = document.querySelector('[data-testid="wallet-sats-w-1"]')
    return el && Number(el.textContent.replace(/[^\d]/g, '')) > before
  },
  { before: w1AfterConfirm },
  { timeout: 8000 },
)

const w1Back = await walletSats('w-1')
const w2Back = await walletSats('w-2')
console.log(`after confirm w2→w1: w1=${w1Back} w2=${w2Back}`)
await page.screenshot({ path: `${SHOTS}/6-round-trip.png` })

await browser.close()

const roundTripOk = pendingOnW2 === 0 && w1Back > w1AfterConfirm && w2Back < w2AfterConfirm

if (!firstHopOk || !roundTripOk) {
  process.exitCode = 1
}
