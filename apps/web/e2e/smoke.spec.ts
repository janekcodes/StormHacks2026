import { expect, test } from '@playwright/test'

test('home page shows the museum title', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('The NeXT-Gen Museum')
})
