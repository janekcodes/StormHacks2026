// Captures marketing stills (hero.jpg, og.jpg) from the live atrium and the
// plan 18 review screenshots. Needs the dev server on :3000.
//   node scripts/capture-stills.mjs stills   -> public/hero.jpg, public/og.jpg
//   node scripts/capture-stills.mjs review   -> test-results/plan18/*.png
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const root = fileURLToPath(new URL('..', import.meta.url))
const mode = process.argv[2] ?? 'review'

const HIDE_UI = `
  .site-header, .skip-link, .museum-left, .museum-minimap, .museum-help, .museum-crosshair,
  .museum-touch, .museum-prompt, .museum-welcome, nextjs-portal { display: none !important; }
  .visit-shell { grid-template-rows: minmax(0, 1fr) !important; }
`

async function openMuseum(page, { query = '', skipWelcome = true } = {}) {
  if (skipWelcome) {
    await page.addInitScript(() => sessionStorage.setItem('museum.welcome.v1', '1'))
  }
  await page.goto(`${BASE}/visit?quality=high${query}`)
  await page.locator('.museum-view[data-ready="true"]').waitFor({ timeout: 120_000 })
}

async function settle(page, ms = 2500) {
  // Wait until travel stops moving the player, then let lighting and textures land.
  let last = ''
  for (let i = 0; i < 120; i++) {
    const pos = await page.evaluate(() => {
      const v = document.querySelector('.museum-view')
      return `${v?.getAttribute('data-player-x')},${v?.getAttribute('data-player-z')}`
    })
    if (pos === last) break
    last = pos
    await page.waitForTimeout(500)
  }
  await page.waitForTimeout(ms)
}

async function stills(browser) {
  const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
  await openMuseum(page)
  await page.addStyleTag({ content: HIDE_UI })
  await page.evaluate(() => window.museum?.goRoom('Atr', { pitch: 0.04 }))
  await settle(page, 4000)
  await page.screenshot({ path: join(root, 'public', 'hero.jpg'), type: 'jpeg', quality: 78 })
  await page.setViewportSize({ width: 1200, height: 630 })
  await page.waitForTimeout(1500)
  await page.screenshot({ path: join(root, 'public', 'og.jpg'), type: 'jpeg', quality: 80 })
  await page.close()
}

async function review(browser) {
  const out = join(root, 'test-results', 'plan18')
  mkdirSync(out, { recursive: true })
  const shot = (page, name) => page.screenshot({ path: join(out, `${name}.png`) })
  const viewport = { width: 1280, height: 720 }

  let page = await browser.newPage({ viewport })
  await page.goto(`${BASE}/`)
  await page.waitForTimeout(800)
  await shot(page, 'landing')
  await page.screenshot({ path: join(out, 'landing-full.png'), fullPage: true })
  await page.close()

  page = await browser.newPage({ viewport })
  await page.goto(`${BASE}/visit?quality=high`)
  await page.locator('.museum-loading').waitFor({ timeout: 30_000 })
  await shot(page, 'visit-loading')
  await page.locator('.museum-view[data-ready="true"]').waitFor({ timeout: 120_000 })
  await page.waitForTimeout(2500)
  await shot(page, 'visit-welcome')
  await page.getByRole('button', { name: 'Start exploring' }).click()
  await page.evaluate(() => window.museum?.goRoom('Atr'))
  await settle(page)
  await shot(page, 'visit-hud')
  await page.getByRole('button', { name: 'Navigate' }).click()
  await page.waitForTimeout(400)
  await shot(page, 'visit-navigate')
  await page.keyboard.press('Escape')
  await page.getByTestId('guide-open').click()
  await page.waitForTimeout(600)
  await shot(page, 'visit-guide')
  await page.close()

  page = await browser.newPage({ viewport })
  await openMuseum(page, { query: '&exhibit=B2' })
  await page.getByTestId('portal-package').waitFor({ timeout: 120_000 })
  await page.waitForTimeout(1500)
  await shot(page, 'visit-portal')
  await page.close()

  page = await browser.newPage({ viewport })
  await page.goto(`${BASE}/map`)
  await page.waitForTimeout(600)
  await page.locator('a.floor-map-marker[data-exhibit-id="B2"]').focus()
  await shot(page, 'map')
  await page.close()

  page = await browser.newPage({ viewport })
  await page.goto(`${BASE}/exhibits`)
  await page.waitForTimeout(600)
  await shot(page, 'exhibits')
  await page.close()

  page = await browser.newPage({ viewport })
  await page.goto(`${BASE}/exhibit/B2`)
  await page.getByTestId('portal-package').waitFor({ timeout: 60_000 })
  await page.waitForTimeout(800)
  await page.screenshot({ path: join(out, 'exhibit-b2.png'), fullPage: true })
  await page.close()

  page = await browser.newPage({ viewport })
  await page.goto(`${BASE}/no-such-page`)
  await page.waitForTimeout(600)
  await shot(page, 'not-found')
  await page.close()
}

const browser = await chromium.launch()
try {
  if (mode === 'stills') await stills(browser)
  else await review(browser)
} finally {
  await browser.close()
}
