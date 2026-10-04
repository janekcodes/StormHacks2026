import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const BUILT = ['A1', 'B2', 'B3', 'B11', 'C1', 'C3', 'C10', 'D6', 'D7', 'F2', 'F7', 'F10'] as const

test.describe('built portals on exhibit pages', () => {
  for (const id of BUILT) {
    test(`/exhibit/${id} embeds its portal with no serious axe violations`, async ({ page }) => {
      await page.goto(`/exhibit/${id}`)
      const portal = page.getByTestId('portal-package')
      await expect(portal).toBeVisible()
      await expect(portal).toHaveAttribute('data-portal-id', id)

      const results = await new AxeBuilder({ page }).include('[data-testid="portal-package"]').analyze()
      const serious = results.violations.filter((item) => item.impact === 'serious' || item.impact === 'critical')
      expect(serious, JSON.stringify(serious, null, 2)).toEqual([])
    })
  }
})
