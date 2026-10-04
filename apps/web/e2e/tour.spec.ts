import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// The tour is covered with fake audio that ends quickly, mocked guide and
// speak routes, and the listen-token route failing so the typed fallback is used.

const NDJSON = (events: Array<Record<string, unknown>>): string =>
  events.map((event) => JSON.stringify(event)).join('\n')

test.describe('Guided tour', () => {
  let spoken: string[] = []
  test.beforeEach(async ({ page }) => {
    spoken = []
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
        duration = 0
        volume = 1
        readyState = 4
        muted = false
        playbackRate = 1
        onended: (() => void) | null = null
        private listeners: Array<(event: unknown) => void> = []
        private timer: ReturnType<typeof setTimeout> | null = null
        constructor(src = '') {
          this.src = src
        }
        play() {
          if (this.timer) clearTimeout(this.timer)
          this.paused = false
          this.timer = setTimeout(() => {
            this.paused = true
            this.onended?.()
            const event = { type: 'ended', target: this }
            for (const fn of this.listeners) fn(event)
          }, 50)
          return Promise.resolve()
        }
        pause() {
          this.paused = true
          if (this.timer) clearTimeout(this.timer)
        }
        load() {}
        addEventListener(type: string, fn: (event: unknown) => void) {
          if (type === 'ended') this.listeners.push(fn)
        }
        removeEventListener(type: string, fn: (event: unknown) => void) {
          if (type === 'ended') this.listeners = this.listeners.filter((l) => l !== fn)
        }
        dispatchEvent() {
          return true
        }
      }
      ;(window as unknown as { Audio: unknown }).Audio = FakeAudio
    })
    await page.route('**/api/listen-token**', (route) =>
      route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'off' }) })
    )
    await page.route('**/api/speak**', (route) => {
      spoken.push(route.request().postData() ?? '')
      return route.fulfill({ contentType: 'audio/mpeg', body: Buffer.from('dummy audio') })
    })
  })

  const bar = (page: Page) => page.locator('[data-testid="tour-bar"]:visible')

  test('runs the whole route with Auto on and shows the outro', async ({ page }) => {
    test.setTimeout(240_000)
    await page.goto('/visit?tour=demo')
    await page.getByTestId('tour-start').click()
    const stop = bar(page).getByTestId('tour-stop')
    for (const [index, id] of ['A1', 'B2', 'C3', 'E3', 'D7', 'F10'].entries()) {
      await expect(stop).toContainText(`Stop ${index + 1} of 6: ${id}`, { timeout: index === 0 ? 60_000 : 30_000 })
      if (index === 0) {
        await expect(bar(page).getByTestId('tour-countdown')).toContainText('Next stop in', { timeout: 60_000 })
      }
    }
    await expect(stop).toContainText('Tour complete', { timeout: 60_000 })
  })

  test('controls live inside the exhibit pop-up while an exhibit is open', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/visit?tour=demo')
    await page.getByTestId('tour-start').click()
    await expect(bar(page).getByTestId('tour-stop')).toContainText('Stop 1 of 6', { timeout: 60_000 })
    await expect(bar(page)).toHaveCount(1)
    await expect(page.locator('[data-testid="portal-overlay"] [data-testid="tour-bar"]:visible')).toHaveCount(1)
  })

  test('Auto off waits for Next during play time', async ({ page }) => {
    test.setTimeout(180_000)
    await page.goto('/visit?tour=demo')
    await page.getByTestId('tour-start').click()
    const stop = bar(page).getByTestId('tour-stop')
    // Switch Auto off before the first dwell starts (during the intro or walk), so the
    // 3 s play timer can never fire first and make this race.
    const auto = bar(page).getByRole('switch', { name: 'Auto' })
    await auto.click()
    await expect(auto).toHaveAttribute('aria-checked', 'false')
    await expect(stop).toContainText('Stop 1 of 6', { timeout: 60_000 })
    await expect(bar(page).getByTestId('tour-countdown')).toContainText('Take your time')

    // Longer than PLAY_MS (3 s): the stop must not advance on its own.
    await page.waitForTimeout(6_000)
    await expect(stop).toContainText('Stop 1 of 6')

    await bar(page).getByRole('button', { name: 'Skip to next exhibit' }).click()
    await expect(stop).toContainText('Stop 2 of 6: B2', { timeout: 30_000 })
  })

  test('skip, pause and a typed question pause and resume the tour', async ({ page }) => {
    test.setTimeout(180_000)
    const guideBodies: Array<{ mode?: string }> = []
    await page.route('**/api/guide', async (route) => {
      guideBodies.push(route.request().postDataJSON() as { mode?: string })
      await route.fulfill({
        contentType: 'application/x-ndjson',
        body: NDJSON([{ type: 'text', text: 'Ada wrote it (see P5). ' }, { type: 'done' }])
      })
    })

    await page.goto('/visit?tour=demo')
    await page.getByTestId('tour-start').click()
    const stop = bar(page).getByTestId('tour-stop')
    await expect(stop).toContainText('Stop 1 of 6', { timeout: 60_000 })

    await bar(page).getByRole('button', { name: 'Skip to next exhibit' }).click()
    await expect(stop).toContainText('Stop 2 of 6: B2', { timeout: 30_000 })

    await bar(page).getByRole('button', { name: 'Pause' }).click()
    await expect(bar(page).getByRole('button', { name: 'Play' })).toBeVisible()
    await bar(page).getByRole('button', { name: 'Play' }).click()

    // Mic is unavailable (token 503), so the typed fallback appears after the first try.
    // Hold V until the token request fails: releasing while still connecting
    // cancels the press by design and would never mark the mic unavailable.
    const input = bar(page).getByLabel('Ask the guide')
    await page.keyboard.down('v')
    await expect(input).toBeVisible()
    await page.keyboard.up('v')
    await input.fill('Who wrote the first program?')
    await bar(page).getByRole('button', { name: 'Ask' }).click()

    await expect.poll(() => guideBodies.length).toBeGreaterThan(0)
    expect(guideBodies[0]?.mode).toBe('tour')
    // The answer is voiced through /api/speak. (No visible answer text exists during the
    // tour: the guide voice caption lives only inside the guide panel.)
    await expect.poll(() => spoken.some((body) => body.includes('Ada wrote it'))).toBe(true)
    // The tour resumed: Pause is back and enabled after the answer.
    await expect(bar(page).getByRole('button', { name: 'Pause' })).toBeEnabled({ timeout: 30_000 })
    await expect(stop).toContainText(/Stop [2-6] of 6/)
  })

  test('the tour bar has no accessibility violations', async ({ page }) => {
    test.setTimeout(120_000)
    await page.goto('/visit?tour=demo')
    await page.getByTestId('tour-start').click()
    await expect(bar(page)).toBeVisible()
    const floating = await new AxeBuilder({ page }).include('[data-testid="tour-bar"]').analyze()
    expect(floating.violations).toEqual([])
    await expect(bar(page).getByTestId('tour-stop')).toContainText('Stop 1 of 6', { timeout: 60_000 })
    // Let the pop-up's fade-in finish: axe samples mid-transition colours otherwise.
    await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity))
    await page.waitForTimeout(500)
    const inline = await new AxeBuilder({ page }).include('[data-testid="tour-bar"]').analyze()
    expect(inline.violations).toEqual([])
  })
})
