import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ZONES } from '../src/zones'

const root = (path: string) => fileURLToPath(new URL(path, import.meta.url))

interface SeedExhibit {
  id: string
  year: string
  title: string
  zone: string
  band: string | null
  tier: string
  prototypePortal: { artboard: string; exhibit: string } | null
  position: { x: number; z: number; face: [number, number] }
}

interface BuiltContent {
  caption: string
  stats: Array<{ k: string; v: string }>
}

// Copied from seed/prototype/MuseumBuilding.dc.html built() method.
const builtContent: Record<string, BuiltContent> = {
  B2: {
    caption: 'The first general-purpose electronic digital computer, completed in 1945 and unveiled in February 1946. Every glowing dot in this portal stands for 50 of its vacuum tubes. Some just burned out: find them and swap them.',
    stats: [
      { k: 'Vacuum tubes', v: '~17,500' },
      { k: 'Mass', v: '~27 t' },
      { k: 'Speed', v: '5,000 adds/s' }
    ]
  },
  C1: {
    caption: 'ENIAC’s first programmers, including Kay McNulty, Betty Jennings and Frances Bilas, set up each problem by rewiring cables and switches. Changing the program meant changing the machine.',
    stats: [
      { k: 'Program medium', v: 'Cables + switches' },
      { k: 'Stored-program idea', v: 'EDVAC, 1945' },
      { k: 'Early assembly', v: 'K. Booth, 1947' }
    ]
  },
  A1: {
    caption: 'Alan Turing, 1936: a tape, a head and a table of rules can carry out any computation. This machine adds 1 to a binary number. Step it and watch the carry ripple left.',
    stats: [
      { k: 'Paper', v: 'On Computable Numbers, 1936' },
      { k: 'ACE design', v: 'NPL, 1945/46' },
      { k: 'Imitation Game', v: '1950' }
    ]
  },
  B3: {
    caption: 'Bell Labs built the first transistor in 1947 from germanium, and Morris Tanenbaum made the first silicon one there in 1954. A switch with no filament to burn out. Flip the base and watch current flow.',
    stats: [
      { k: 'First transistor', v: 'Bell Labs, 1947' },
      { k: 'First silicon', v: 'Bell Labs, 1954' },
      { k: 'Nobel Prize', v: '1956' }
    ]
  },
  C3: {
    caption: 'FORTRAN let engineers write formulas instead of machine code; IBM shipped its compiler in 1957. One line of code was one 80-column card, and a program was a deck. Pick a statement and punch it.',
    stats: [
      { k: 'FORTRAN compiler', v: 'IBM, 1957' },
      { k: 'LISP', v: 'MIT, 1958' },
      { k: 'Card width', v: '80 columns' }
    ]
  },
  F2: {
    caption: 'Summer 1956: the workshop whose 1955 proposal coined “artificial intelligence.” Meet the four proposers, then run the Logic Theorist on Principia Mathematica.',
    stats: [
      { k: 'Term coined', v: '1955 proposal' },
      { k: 'Workshop', v: 'Summer 1956' },
      { k: 'Logic Theorist', v: '38 of 52 proofs' }
    ]
  },
  D6: {
    caption: 'The web was written on a NeXT computer at CERN, and most people first reached it through a dial-up modem. Race the first web page against a 2025 median home page over a 14.4 kbit/s line.',
    stats: [
      { k: 'Dev machine', v: 'NeXT, CERN' },
      { k: 'Modem', v: 'V.32bis 14.4k' },
      { k: 'First site', v: 'info.cern.ch' }
    ]
  },
  D7: {
    caption: 'About 18 elements and one method, GET. Flip the article into 1991 mode: the styling, scripts and images vanish, and the meaning stays.',
    stats: [
      { k: 'HTML elements', v: '~18' },
      { k: 'HTTP methods', v: '1 (GET)' },
      { k: 'CSS arrives', v: '1996' }
    ]
  },
  F7: {
    caption: 'ChipTest (1985) and Deep Thought (1988) grew into IBM’s Deep Blue, which beat Garry Kasparov in 1997. Their strength was raw search. Drag the depth and watch the game tree explode.',
    stats: [
      { k: 'Branching factor', v: '~35' },
      { k: 'Deep Thought', v: '~700K pos/s' },
      { k: 'Deep Blue, 1997', v: '~200M pos/s' }
    ]
  },
  B11: {
    caption: 'AI accelerators are built around matrix multiply. A systolic array pulses data through a grid of multiply-accumulate cells, so every value is reused without another trip to memory.',
    stats: [
      { k: 'First TPU in service', v: '2015' },
      { k: 'TPU v1 matrix unit', v: '256 × 256' },
      { k: 'Core operation', v: 'Multiply-accumulate' }
    ]
  },
  C10: {
    caption: 'React, Next.js and the Python data stack made software composable, and pages heavier. Each square in this portal is one kilobyte.',
    stats: [
      { k: 'Median JS (mobile)', v: '632 KB' },
      { k: 'Median page', v: '2.56 MB' },
      { k: 'Median requests', v: '75' }
    ]
  },
  F10: {
    caption: '“Attention Is All You Need” (2017) introduced the Transformer, the architecture behind today’s Large Language Models. Every token decides how much to look at every other token. Click a word to see where it looks.',
    stats: [
      { k: 'Architecture', v: 'Transformer, 2017' },
      { k: 'Mechanism', v: 'Self-attention' },
      { k: 'Weights shown', v: 'Illustrative' }
    ]
  }
}

// Caveats required by the "first" claim rule (BLUEPRINT section 7 and plan 02 step 2).
const caveats: Record<string, string> = {
  B2: "The label 'first' applies to general-purpose electronic digital computers, not to computing machines as a whole.",
  B3: "The label 'first' refers to the transistor of 1947 and the silicon transistor of 1954.",
  B4: "The label 'first' refers to running a stored program, not to being the first computer.",
  C1: "The label 'first' refers to the programmers who set up ENIAC by rewiring its cables and switches.",
  D6: "The label 'first' describes the common early dial-up experience, not a claim that a single machine was the web's only origin."
}

const TBD_SOURCE = '[TBD: source]'

function main() {
  const seedPath = root('../../../seed/exhibits.seed.json')
  const seed = JSON.parse(readFileSync(seedPath, 'utf8')) as { scopeVersion: string; exhibits: SeedExhibit[] }

  const exhibits = seed.exhibits.map((exhibit) => {
    const base = {
      id: exhibit.id,
      year: exhibit.year,
      title: exhibit.title,
      zone: exhibit.zone,
      band: exhibit.band,
      tier: exhibit.tier,
      position: exhibit.position,
      ...(caveats[exhibit.id] ? { caveat: caveats[exhibit.id] } : {})
    }

    if (exhibit.tier !== 'built') {
      return base
    }

    const content = builtContent[exhibit.id]
    if (!content) {
      throw new Error(`No built content recorded for ${exhibit.id}`)
    }

    return {
      ...base,
      portal: { package: `@museum/portal-${exhibit.id.toLowerCase()}` },
      caption: content.caption,
      stats: content.stats.map((stat) => ({ ...stat, sourceId: TBD_SOURCE })),
      sources: [{ id: TBD_SOURCE, label: TBD_SOURCE, url: TBD_SOURCE }]
    }
  })

  const exhibitsPath = root('../data/exhibits.json')
  const zonesPath = root('../data/zones.json')
  mkdirSync(dirname(exhibitsPath), { recursive: true })

  writeFileSync(exhibitsPath, JSON.stringify({ scopeVersion: seed.scopeVersion, exhibits }, null, 1) + '\n')


  const zones = ZONES.map((zone) => ({
    code: zone.code,
    name: zone.name,
    location: zone.location,
    ink: zone.ink,
    tint: zone.tint,
    built: zone.built,
    core: zone.core,
    extended: zone.extended,
    open: zone.open
  }))
  writeFileSync(zonesPath, JSON.stringify({ zones }, null, 1) + '\n')

  console.log(`Wrote ${exhibits.length} exhibits and ${zones.length} zones.`)
}

main()
