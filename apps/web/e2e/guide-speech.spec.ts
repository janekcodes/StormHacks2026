import { expect, test } from '@playwright/test'

// Guide speech is covered here with a mocked /api/guide (streamed text) and a
// mocked /api/speak (audio), so tests do not need the ElevenLabs key. Audio
// playback itself is stubbed so the test does not depend on a real codec.

const NDJSON = (events: Array<Record<string, unknown>>): string =>
  events.map((event) => JSON.stringify(event)).join('\n')

test.describe('Guide speech', () => {
  test('speaks streamed answers when enabled, shows a caption, and stops', async ({ page }) => {
    test.setTimeout(120_000)
    await page.addInitScript(() => {
      // Replace the audio element with a stub that never emits `ended`, so the
      // current sentence caption stays put until the visitor acts.
      class FakeAudio {
        src = ''
        onended: ((this: HTMLAudioElement, ev: Event) => unknown) | null = null
        paused = true
        currentTime = 0
        muted = false
        playbackRate = 1
        play(): Promise<void> {
          this.paused = false
          return Promise.resolve()
        }
        pause(): void {
          this.paused = true
        }
      }
      ;(window as unknown as { Audio: unknown }).Audio = FakeAudio
    })

    await page.route('**/api/guide', (route) =>
      route.fulfill({
        contentType: 'application/x-ndjson',
        body: NDJSON([
          { type: 'text', text: 'The transistor is in wing B. ' },
          { type: 'text', text: 'It switched in 1947.' },
          { type: 'done' }
        ])
      })
    )
    await page.route('**/api/speak', (route) =>
      route.fulfill({ contentType: 'audio/mpeg', body: Buffer.from('dummy audio') })
    )

    await page.goto('/visit')
    await page.getByTestId('guide-open').click()
    await expect(page.getByTestId('guide-panel')).toBeVisible()

    // Speech is opt-in and off by default.
    const toggle = page.getByRole('switch', { name: 'Speak answers' })
    await expect(toggle).toHaveAttribute('aria-checked', 'false')

    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-checked', 'true')

    await page.getByLabel('Ask the guide').fill('Show me the transistor')
    await page.getByRole('button', { name: 'Ask' }).click()

    // The first complete sentence is spoken and shown as a caption.
    await expect(page.getByTestId('guide-voice-caption')).toContainText(
      'The transistor is in wing B.'
    )

    // Stop clears the caption.
    await page.getByRole('button', { name: 'Stop' }).click()
    await expect(page.getByTestId('guide-voice-caption')).toHaveCount(0)
  })

  test('does not speak while the toggle is off', async ({ page }) => {
    test.setTimeout(120_000)
    await page.route('**/api/guide', (route) =>
      route.fulfill({
        contentType: 'application/x-ndjson',
        body: NDJSON([{ type: 'text', text: 'ENIAC was finished in 1945.' }, { type: 'done' }])
      })
    )

    const speakCalls: number[] = []
    await page.route('**/api/speak', (route) => {
      speakCalls.push(1)
      return route.fulfill({ contentType: 'audio/mpeg', body: Buffer.from('dummy audio') })
    })

    await page.goto('/visit')
    await page.getByTestId('guide-open').click()
    await expect(page.getByTestId('guide-panel')).toBeVisible()

    await page.getByLabel('Ask the guide').fill('Who programmed ENIAC?')
    await page.getByRole('button', { name: 'Ask' }).click()

    await expect(page.getByTestId('guide-panel')).toContainText('ENIAC was finished')

    // Off by default: no /api/speak call and no caption.
    expect(speakCalls).toHaveLength(0)
    await expect(page.getByTestId('guide-voice-caption')).toHaveCount(0)
  })
})
