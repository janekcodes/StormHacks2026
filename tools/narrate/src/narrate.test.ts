import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { SynthesisResult } from './client'
import { narrateExhibit } from './narrate'

function fakeSynth(text: string): Promise<SynthesisResult> {
  const chars = [...text]
  return Promise.resolve({
    audio: new Uint8Array([1, 2, 3]),
    characters: chars,
    starts: chars.map((_, i) => i),
    ends: chars.map((_, i) => i + 1)
  })
}

interface AlignShape {
  words: Array<{ text: string; startMs: number; endMs: number }>
}

describe('narrateExhibit', () => {
  it('writes mp3 and alignment and applies pronunciation', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'narrate-'))
    const synth = vi.fn(fakeSynth)
    const out = await narrateExhibit({
      id: 'B2',
      narration: 'ENIAC was built',
      voiceId: 'v',
      modelId: 'm',
      apiKey: 'k',
      audioDir: dir,
      dictionary: { ENIAC: 'EE-nee-ack' },
      synth
    })

    expect(out.changed).toBe(true)
    expect(synth).toHaveBeenCalledWith('EE-nee-ack was built')

    const align = JSON.parse(
      readFileSync(join(dir, `B2.${out.hash}.align.json`), 'utf8')
    ) as AlignShape
    expect(align.words.map((word) => word.text)).toEqual(['ENIAC', 'was', 'built'])
    expect(readFileSync(join(dir, `B2.${out.hash}.mp3`)).length).toBeGreaterThan(0)

    rmSync(dir, { recursive: true, force: true })
  })

  it('skips synthesis when the hash is unchanged', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'narrate-'))
    const synth = vi.fn(fakeSynth)
    const input = {
      id: 'B2',
      narration: 'ENIAC was built',
      voiceId: 'v',
      modelId: 'm',
      apiKey: 'k',
      audioDir: dir,
      dictionary: { ENIAC: 'EE-nee-ack' }
    }

    const first = await narrateExhibit({ ...input, synth })
    const second = await narrateExhibit({ ...input, synth, existingHash: first.hash })

    expect(first.changed).toBe(true)
    expect(second.changed).toBe(false)
    expect(synth).toHaveBeenCalledTimes(1)

    rmSync(dir, { recursive: true, force: true })
  })

  it('reports the spoken duration from the last word, and null when unchanged', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'narrate-'))
    const first = await narrateExhibit({
      id: 'T1', narration: 'two words', voiceId: 'v', modelId: 'm', apiKey: 'k',
      audioDir: dir, dictionary: {}, synth: fakeSynth
    })
    // fakeSynth: char i ends at (i + 1) seconds; "two words" has 9 chars.
    expect(first.durationMs).toBe(9000)
    const again = await narrateExhibit({
      id: 'T1', narration: 'two words', voiceId: 'v', modelId: 'm', apiKey: 'k',
      audioDir: dir, dictionary: {}, synth: fakeSynth, existingHash: first.hash
    })
    expect(again.durationMs).toBeNull()
    rmSync(dir, { recursive: true, force: true })
  })
})
