import { expect, test } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test.describe('exhibit runtime', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem('museum.passport.v1')
    })
  })

  test('renders 77 exhibits under the draw-call budget on high', async ({ page }) => {
    test.setTimeout(90_000)
    await page.goto('/visit?quality=high')
    const view = page.locator('.museum-view')
    await expect(view).toHaveAttribute('data-ready', 'true', { timeout: 60_000 })
    await expect(view).toHaveAttribute('data-nav', 'true')
    await expect(view).toHaveAttribute('data-exhibit-count', '77')
    await expect(view).toHaveAttribute('data-quality', 'high')
    await expect(page.getByTestId('passport')).toHaveText(/0 of 76/)
    const calls = Number(await view.getAttribute('data-draw-calls'))
    expect(calls).toBeGreaterThan(0)
    expect(calls).toBeLessThan(400)
  })

  test('click walks to an exhibit and opens the planned card', async ({ page }) => {
    test.setTimeout(120_000)
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('/visit')
    const view = page.locator('.museum-view')
    await expect(view).toHaveAttribute('data-ready', 'true', { timeout: 60_000 })
    await expect(view).toHaveAttribute('data-nav', 'true')

    const walked = await page.evaluate(() => window.museum?.walkTo('G2') ?? false)
    expect(walked).toBe(true)
    await expect(view).toHaveAttribute('data-focus', 'G2', { timeout: 90_000 })

    const canvas = view.locator('canvas')
    const box = await canvas.boundingBox()
    expect(box).toBeTruthy()
    if (!box) return
    await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } })
    const overlay = page.getByTestId('portal-overlay')
    await expect(overlay).toBeVisible({ timeout: 30_000 })
    await expect(page.getByTestId('planned-card')).toBeVisible()
    await expect(page.getByTestId('portal-package')).toHaveCount(0)
    await expect(page.getByTestId('passport')).toHaveText(/1 of 76/)
    await expect(view).toHaveAttribute('data-paused', 'true')

    await page.getByTestId('portal-close').click()
    await expect(overlay).toHaveCount(0)
    await expect(view).toBeFocused()

    expect(errors, errors.join('\n')).toEqual([])
  })

  test('deep link walks to a built exhibit and loads its portal chunk', async ({ page }) => {
    test.setTimeout(120_000)
    const requests: string[] = []
    page.on('request', (request) => requests.push(request.url()))

    await page.goto('/visit?exhibit=B2')
    const view = page.locator('.museum-view')
    await expect(view).toHaveAttribute('data-ready', 'true', { timeout: 60_000 })
    await expect(page.getByTestId('portal-overlay')).toBeVisible({ timeout: 90_000 })
    await expect(page.getByTestId('portal-overlay')).toContainText('ENIAC')
    await expect(page.getByTestId('portal-package')).toHaveAttribute('data-portal-id', 'B2')
    await expect(page.getByTestId('planned-card')).toHaveCount(0)
    const loaded = requests.some((url) => /portal[-_]b2|portals[/_]b2/i.test(url))
    expect(loaded, requests.filter((url) => /portal|chunk|b2/i.test(url)).slice(0, 40).join('\n')).toBe(
      true
    )

    await page.keyboard.press('Escape')
    await expect(page.getByTestId('portal-overlay')).toHaveCount(0)
    await expect(view).toBeFocused()
  })

  test('exhibit page links into the museum', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/exhibit/B2')
    await page.getByRole('link', { name: 'Open in museum' }).click()
    await expect(page).toHaveURL(/\/visit\?exhibit=B2/)
    await expect(page.getByTestId('portal-overlay')).toBeVisible({ timeout: 90_000 })
  })
})
