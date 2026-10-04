import AxeBuilder from '@axe-core/playwright'
import { EXHIBIT_IDS } from '@museum/content/schema'
import { expect, test } from '@playwright/test'

test.describe('2D floor plan and exhibit pages', () => {
  test('/map renders all 77 markers and navigates on click', async ({ page }) => {
    await page.goto('/map')
    const markers = page.locator('a.floor-map-marker')
    await expect(markers).toHaveCount(77)

    await page.locator('a.floor-map-marker[data-exhibit-id="B2"]').click()
    await expect(page).toHaveURL(/\/exhibit\/B2$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('ENIAC')
  })

  test('all 77 exhibit pages return 200', async ({ request }) => {
    for (const id of EXHIBIT_IDS) {
      const response = await request.get(`/exhibit/${id}`)
      expect(response.status(), id).toBe(200)
    }
  })

  test('map markers are reachable by keyboard in zone order', async ({ page }) => {
    await page.goto('/map')
    const markers = page.locator('a.floor-map-marker')
    await expect(markers).toHaveCount(77)

    // Tab from the document until the first map marker receives focus.
    await page.locator('body').click({ position: { x: 0, y: 0 } })
    let focusedId: string | null = null
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab')
      focusedId = await page.evaluate(() => {
        const el = document.activeElement
        if (!el) return null
        return el.getAttribute('data-exhibit-id')
      })
      if (focusedId) break
    }
    expect(focusedId).toBe('P1')

    const order: string[] = [focusedId as string]
    for (let i = 1; i < 77; i++) {
      await page.keyboard.press('Tab')
      const id = await page.evaluate(() => document.activeElement?.getAttribute('data-exhibit-id') ?? null)
      expect(id, `marker ${i}`).toBeTruthy()
      order.push(id as string)
    }

    expect(order[0]).toBe('P1')
    expect(order.indexOf('P1')).toBeLessThan(order.indexOf('A1'))
    expect(order.indexOf('A1')).toBeLessThan(order.indexOf('B2'))
    expect(order.indexOf('B2')).toBeLessThan(order.indexOf('X2'))
    expect(order[order.length - 1]).toBe('X2')
  })

  test('axe reports no serious violations on /map and /exhibit/B2', async ({ page }) => {
    for (const path of ['/map', '/exhibit/B2']) {
      await page.goto(path)
      const results = await new AxeBuilder({ page }).analyze()
      const serious = results.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical'
      )
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([])
    }
  })

  test('map and exhibit routes do not load WebGL code', async ({ page }) => {
    const suspects: string[] = []
    page.on('request', (request) => {
      const url = request.url().toLowerCase()
      if (
        url.includes('three') ||
        url.includes('@react-three') ||
        url.includes('webgl') ||
        url.includes('r3f')
      ) {
        suspects.push(url)
      }
    })

    await page.goto('/map')
    await page.goto('/exhibit/B2')

    const hasWebGL = await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      if (!canvas) return false
      const gl =
        canvas.getContext('webgl') ||
        canvas.getContext('webgl2') ||
        canvas.getContext('experimental-webgl')
      return Boolean(gl)
    })

    expect(suspects).toEqual([])
    expect(hasWebGL).toBe(false)
  })
})
