import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ExhibitsFileSchema } from '@museum/content'
import { computeAudioRecord, narrateExhibit } from './narrate'
import { loadPronunciation } from './pronunciation'

// tools/narrate/src/cli.ts -> repo root
const root = fileURLToPath(new URL('../../..', import.meta.url))
const exhibitsPath = join(root, 'packages/content/data/exhibits.json')
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

const built = raw.exhibits.filter(
  (exhibit) => exhibit.tier === 'built' && (exhibit.narration ?? '').trim() !== ''
)
const selected = options.only ? built.filter((exhibit) => exhibit.id === options.only) : built
if (options.only && selected.length === 0) {
  throw new Error(`no built exhibit with narration matched --only ${options.only}`)
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

if (!options.dryRun) {
  writeFileSync(exhibitsPath, JSON.stringify(raw, null, 1) + '\n')
}

console.log(`done: ${changed} changed, ${skipped} skipped`)
