import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// The tour is covered with fake audio that ends quickly, mocked guide and
// speak routes, and the listen-token route failing so the typed fallback is used.

const NDJSON = (events: Array<Record<string, unknown>>): string =>
  events.map((event) => JSON.stringify(event)).join('\n')

test.describe('Guided tour', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.setItem('museum.welcome.v1', '1')
      } catch {
        /* private mode */
      }
      // Every clip "plays" for 50 ms then ends, so the tour advances fast.
      class FakeAudio {
        src = ''
        paused = true
        currentTime = 0
        muted = false
        playbackRate = 1
        onended: (() => void) | null = null
        private listeners: Array<() => void> = []
        private timer: ReturnType<typeof setTimeout> | null = null
        constructor(src = '') {
          this.src = src
        }
        play() {
          this.paused = false
          this.timer = setTimeout(() => {
            this.paused = true
            this.onended?.()
            for (const fn of this.listeners) fn()
          }, 50)
          return Promise.resolve()
        }
        pause() {
          this.paused = true
          if (this.timer) clearTimeout(this.timer)
        }
        addEventListener(type: string, fn: () => void) {
          if (type === 'ended') this.listeners.push(fn)
        }
      }
      ;(window as unknown as { Audio: unknown }).Audio = FakeAudio
    })
    await page.route('**/api/listen-token**', (route) =>
      route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'off' }) })
    )
    await page.route('**/api/speak', (route) =>
      route.fulfill({ contentType: 'audio/mpeg', body: Buffer.from('dummy audio') })
    )
  })

  test('runs the whole route with Auto on and shows the outro', async ({ page }) => {
    test.setTimeout(240_000)
    await page.goto('/visit?tour=demo')
    await page.getByTestId('tour-start').click()
    const stop = page.getByTestId('tour-stop')
    for (const [index, id] of ['A1', 'B2', 'C3', 'E3', 'D7', 'F10'].entries()) {
      await expect(stop).toContainText(`Stop ${index + 1} of 6: ${id}`, { timeout: 60_000 })
      if (index === 0) {
        const countdown = page.getByTestId('tour-countdown')
        await expect(countdown).toBeVisible({ timeout: 60_000 })
        await expect(countdown).toContainText('Next stop in')
      }
    }
    await expect(stop).toContainText('Tour complete', { timeout: 60_000 })
  })

  test('Auto off waits for Next during play time', async ({ page }) => {
    test.setTimeout(180_000)
    await page.goto('/visit?tour=demo')
    await page.getByTestId('tour-start').click()
    const stop = page.getByTestId('tour-stop')
    await expect(stop).toContainText('Stop 1 of 6', { timeout: 60_000 })

    const auto = page.getByRole('switch', { name: 'Auto' })
    await auto.click()
    await expect(auto).toHaveAttribute('aria-checked', 'false')
    await expect(page.getByTestId('tour-countdown')).toContainText('Take your time')

    // Longer than PLAY_MS (11 s): the stop must not advance on its own.
    await page.waitForTimeout(13_000)
    await expect(stop).toContainText('Stop 1 of 6')

    await page.getByTestId('tour-bar').getByRole('button', { name: 'Skip to next exhibit' }).click()
    await expect(stop).toContainText('Stop 2 of 6: B2')
  })

  test('skip, pause and a typed question pause and resume the tour', async ({ page }) => {
    test.setTimeout(180_000)
    await page.route('**/api/guide', async (route) => {
      const body = route.request().postDataJSON() as { mode?: string }
      expect(body.mode).toBe('tour')
      await route.fulfill({
        contentType: 'application/x-ndjson',
        body: NDJSON([{ type: 'text', text: 'Ada wrote it (see P5). ' }, { type: 'done' }])
      })
    })

    await page.goto('/visit?tour=demo')
    await page.getByTestId('tour-start').click()
    const bar = page.getByTestId('tour-bar')
    await expect(page.getByTestId('tour-stop')).toContainText('Stop 1 of 6', { timeout: 60_000 })

    await bar.getByRole('button', { name: 'Skip to next exhibit' }).click()
    await expect(page.getByTestId('tour-stop')).toContainText('Stop 2 of 6: B2')

    await bar.getByRole('button', { name: 'Pause' }).click()
    await expect(bar.getByRole('button', { name: 'Play' })).toBeVisible()
    await bar.getByRole('button', { name: 'Play' }).click()

    // Mic is unavailable (token 503), so the typed fallback appears after the first try.
    // Hold V until the token request fails: releasing while still connecting
    // cancels the press by design and would never mark the mic unavailable.
    const input = bar.getByLabel('Ask the guide')
    await page.keyboard.down('v')
    await expect(input).toBeVisible()
    await page.keyboard.up('v')
    await input.fill('Who wrote the first program?')
    await bar.getByRole('button', { name: 'Ask' }).click()
    await expect(page.getByTestId('tour-stop')).toContainText(/Stop [2-6] of 6/)
  })

  test('the tour bar has no accessibility violations', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/visit?tour=demo')
    await page.getByTestId('tour-start').click()
    await expect(page.getByTestId('tour-bar')).toBeVisible()
    const results = await new AxeBuilder({ page }).include('[data-testid="tour-bar"]').analyze()
    expect(results.violations).toEqual([])
  })
})
