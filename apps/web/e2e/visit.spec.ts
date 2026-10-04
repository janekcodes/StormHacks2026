import { expect, test } from '@playwright/test'
import path from 'node:path'

test.describe('3D scene shell /visit', () => {
  test('loads, reaches ready, screenshots foyer and atrium without console errors', async ({
    page
  }) => {
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/visit')
    const view = page.locator('.museum-view')
    await expect(view).toBeVisible({ timeout: 60_000 })
    await expect(view).toHaveAttribute('data-ready', 'true', { timeout: 60_000 })
    await expect(view).toHaveAttribute('data-nav', 'true', { timeout: 60_000 })
    await expect(page.getByTestId('zone-hud')).toContainText(/ready/i)
    await expect(view).toHaveAttribute('data-draw-calls', /^(?:[1-9]|[1-9]\d|1[0-4]\d)$/, {
      timeout: 15_000
    })

    const outDir = path.join('test-results', 'visit')
    await page.screenshot({
      path: path.join(outDir, 'foyer.png'),
      fullPage: false
    })

    // Click to focus the shell, then walk via the nav API (pathfind through doors).
    // Keyboard hold is flaky in headless CI when blur clears the key store mid-hold.
    await view.click({ position: { x: 40, y: 40 } })
    const walked = await page.evaluate(() => {
      const api = window.museum
      if (!api) return false
      return api.goRoom('Atr')
    })
    expect(walked).toBe(true)

    await expect(page.getByTestId('zone-hud')).toContainText(/Atrium|Concourse/i, {
      timeout: 20_000
    })

    await page.screenshot({
      path: path.join(outDir, 'atrium.png'),
      fullPage: false
    })

    expect(errors, errors.join('\n')).toEqual([])
  })
})
