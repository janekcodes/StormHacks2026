import { expect, test } from '@playwright/test'

// The guide is covered here with a mocked /api/guide so tests do not need the
// Gemini key. The model behaviour itself is exercised by packages/guide/evals.

const NDJSON = (events: Array<Record<string, unknown>>): string =>
  events.map((event) => JSON.stringify(event)).join('\n')

test.describe('AI guide', () => {
  test('3D panel streams a mocked answer and shows a walkTo chip', async ({ page }) => {
    await page.route('**/api/guide', (route) =>
      route.fulfill({
        contentType: 'application/x-ndjson',
        body: NDJSON([
          { type: 'text', text: 'The transistor is ' },
          { type: 'text', text: 'in wing B.' },
          { type: 'tool', id: 'c1', name: 'walkTo', args: { exhibitId: 'B3' } },
          { type: 'done' }
        ])
      })
    )

    await page.goto('/visit')
    await page.getByTestId('guide-open').click()
    const panel = page.getByTestId('guide-panel')
    await expect(panel).toBeVisible()

    await page.getByLabel('Ask the guide').fill('Show me the transistor')
    await page.getByRole('button', { name: 'Ask' }).click()

    await expect(panel).toContainText('The transistor is in wing B.')
    await expect(panel).toContainText('Walking to B3')
  })

  test('2D guide on /exhibits renders and streams a mocked answer', async ({ page }) => {
    await page.route('**/api/guide', (route) =>
      route.fulfill({
        contentType: 'application/x-ndjson',
        body: NDJSON([
          { type: 'text', text: 'ENIAC was programmed by women including Jean Jennings.' },
          { type: 'done' }
        ])
      })
    )

    await page.goto('/exhibits')
    await page.getByTestId('guide-open').click()
    const panel = page.getByTestId('guide-panel')
    await expect(panel).toBeVisible()

    await page.getByLabel('Ask the guide').fill('Who programmed ENIAC?')
    await page.getByRole('button', { name: 'Ask' }).click()

    await expect(panel).toContainText('ENIAC was programmed')
  })

  test('rate limit shows a friendly message, not an error page', async ({ page }) => {
    await page.route('**/api/guide', (route) =>
      route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'You have asked a lot of questions. Wait a moment and try again.' })
      })
    )

    await page.goto('/visit')
    await page.getByTestId('guide-open').click()
    const panel = page.getByTestId('guide-panel')
    await expect(panel).toBeVisible()

    await page.getByLabel('Ask the guide').fill('Hello')
    await page.getByRole('button', { name: 'Ask' }).click()

    await expect(panel).toContainText('Wait a moment and try again')
  })

  test('portal "Ask the guide" pre-seeds the panel with that exhibit', async ({ page }) => {
    test.setTimeout(120_000)
    await page.route('**/api/guide', (route) =>
      route.fulfill({
        contentType: 'application/x-ndjson',
        body: NDJSON([{ type: 'text', text: 'B2 is ENIAC.' }, { type: 'done' }])
      })
    )

    await page.goto('/visit?exhibit=B2')
    await expect(page.getByTestId('portal-overlay')).toBeVisible({ timeout: 90_000 })
    await page.getByTestId('portal-ask-guide').click()
    const panel = page.getByTestId('guide-panel')
    await expect(panel).toBeVisible()
    await expect(page.getByLabel('Ask the guide')).toHaveValue(/B2/)
  })
})
