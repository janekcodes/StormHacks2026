import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ExhibitsFileSchema, TourSchema } from '@museum/content'
import { computeAudioRecord, narrateExhibit } from './narrate'
import { loadPronunciation } from './pronunciation'
import { tourNarrationTargets } from './tour'

// tools/narrate/src/cli.ts -> repo root
const root = fileURLToPath(new URL('../../..', import.meta.url))
const exhibitsPath = join(root, 'packages/content/data/exhibits.json')
const tourPath = join(root, 'packages/content/data/tour.json')
const pronunciationPath = join(root, 'packages/content/pronunciation/dictionary.json')
const audioDir = join(root, 'apps/web/public/audio')

interface RawExhibitAudio {
  src?: string
  align?: string
  voiceId?: string
  modelId?: string
  hash?: string
}

interface RawExhibit {
  id: string
  tier?: string
  narration?: string
  audio?: RawExhibitAudio
}

interface RawExhibitsFile {
  scopeVersion: string
  exhibits: RawExhibit[]
}

interface CliOptions {
  only?: string
  dryRun: boolean
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? ''
    if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--only') {
      const value = argv[i + 1]
      if (value !== undefined) options.only = value
      i += 1
    } else if (arg.startsWith('--only=')) {
      options.only = arg.slice('--only='.length)
    }
  }
  return options
}

const options = parseArgs(process.argv.slice(2))
const apiKey = process.env.ELEVENLABS_API_KEY
const voiceId = process.env.ELEVENLABS_VOICE_ID
const modelId = process.env.NARRATION_MODEL

const raw = JSON.parse(readFileSync(exhibitsPath, 'utf8')) as RawExhibitsFile
// Validate against the content schema; we mutate and write back `raw` so the
// original key order and formatting are preserved.
ExhibitsFileSchema.parse(raw)

const dictionary = loadPronunciation(pronunciationPath)

// Narration is generated for every tier with a written narration: Built, Core
// and Extended (BLUEPRINT section 12; plan 16 widened this from Built only).
const NARRATED_TIERS = new Set(['built', 'core', 'extended'])
const targets = raw.exhibits.filter(
  (exhibit) =>
    exhibit.tier !== undefined &&
    NARRATED_TIERS.has(exhibit.tier) &&
    (exhibit.narration ?? '').trim() !== ''
)
const selected = options.only ? targets.filter((exhibit) => exhibit.id === options.only) : targets
if (options.only && selected.length === 0 && !options.only.startsWith('tour-')) {
  throw new Error(`no exhibit with narration matched --only ${options.only}`)
}

let changed = 0
let skipped = 0

for (const exhibit of selected) {
  const narration = exhibit.narration as string
  const record = computeAudioRecord(exhibit.id, narration, voiceId ?? '', modelId ?? '')

  if (exhibit.audio?.hash === record.hash && exhibit.audio?.src === record.src) {
    skipped += 1
    console.log(`skip ${exhibit.id} (unchanged)`)
    continue
  }

  if (options.dryRun) {
    changed += 1
    console.log(`dry-run ${exhibit.id}: would write ${record.src}`)
    continue
  }

  if (!apiKey || !voiceId || !modelId) {
    throw new Error('missing ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID or NARRATION_MODEL')
  }

  await narrateExhibit({
    id: exhibit.id,
    narration,
    voiceId,
    modelId,
    apiKey,
    audioDir,
    dictionary,
    ...(exhibit.audio?.hash ? { existingHash: exhibit.audio.hash } : {})
  })

  exhibit.audio = {
    src: record.src,
    align: record.align,
    voiceId,
    modelId,
    hash: record.hash
  }
  changed += 1
  console.log(`generated ${exhibit.id} -> ${record.src}`)
}

// Tour lines (spec: guided tour) share the voice, hashing and output dir.
const rawTour = JSON.parse(readFileSync(tourPath, 'utf8')) as Record<string, unknown>
const tour = TourSchema.parse(rawTour)
const tourTargets = tourNarrationTargets(tour).filter((target) => !options.only || target.id === options.only)

for (const { id, line } of tourTargets) {
  const record = computeAudioRecord(id, line.text, voiceId ?? '', modelId ?? '')
  if (line.audio?.hash === record.hash && line.audio?.src === record.src) {
    skipped += 1
    console.log(`skip ${id} (unchanged)`)
    continue
  }
  if (options.dryRun) {
    changed += 1
    console.log(`dry-run ${id}: would write ${record.src}`)
    continue
  }
  if (!apiKey || !voiceId || !modelId) {
    throw new Error('missing ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID or NARRATION_MODEL')
  }
  const out = await narrateExhibit({
    id, narration: line.text, voiceId, modelId, apiKey, audioDir, dictionary,
    // Only trust the hash when the file name still matches, so a renamed stop regenerates.
    ...(line.audio?.hash && line.audio.src === record.src ? { existingHash: line.audio.hash } : {})
  })
  // `line` is an object inside the parsed tour; mutate the raw JSON in step with it.
  line.audio = { src: record.src, align: record.align, voiceId, modelId, hash: record.hash }
  if (out.durationMs !== null) line.durationMs = out.durationMs
  changed += 1
  console.log(`generated ${id} -> ${record.src}`)
}

if (options.only?.startsWith('tour-') && tourTargets.length === 0) {
  throw new Error(`no tour target matched --only ${options.only}`)
}

if (!options.dryRun) {
  writeFileSync(exhibitsPath, JSON.stringify(raw, null, 1) + '\n')
  writeFileSync(tourPath, JSON.stringify(tour, null, 2) + '\n')
}

console.log(`done: ${changed} changed, ${skipped} skipped`)
