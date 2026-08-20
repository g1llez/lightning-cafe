import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const MEASUREMENT_ID = 'G-RBJEC5VLPF'
const html = readFileSync(resolve(import.meta.dirname, '../index.html'), 'utf8')

describe('visit analytics', () => {
  it('loads gtag with the cafe measurement id', () => {
    expect(html).toContain(`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`)
    expect(html).toContain(`gtag('config', '${MEASUREMENT_ID}')`)
  })
})
