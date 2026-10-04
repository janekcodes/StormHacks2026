# Hello Museum

A walk-through museum of computer science history that runs in the browser. Visitors explore a 3D building, step up to exhibits and open a **portal** for each one: a hands-on interactive where you do the thing the milestone was about. Step a Turing machine tape, punch a FORTRAN card, race a dial-up modem, watch Transformer attention.

> Every exhibit is a portal. If there is nothing to do, it is a placard, not an exhibit.

**Live:** [hellomuseum.tech](https://hellomuseum.tech)

## Built at StormHacks 2026

Hello Museum is our project for **StormHacks 2026**, submitted to the **CSSS SFU CS Legacy Track**. The brief was a tribute to the history of computer science; our answer was a place where that history still works under your hands, instead of a timeline to scroll past.

## Features

- **A real building.** Six themed wings around a glass atrium, plus a People Gallery, Society & Ethics and a Future Lab. Inside each wing, depth is date: walking toward the windows moves you forward in time, so 1971 in Hardware is one door away from 1971 in Software.
- **77 exhibit slots, 13 working portals.** Every planned exhibit already stands in its place on the floor plan; the rest show a "planned" card.
- **Narration with live captions.** Every built exhibit has an ElevenLabs narration track, generated at build time, with word-timed subtitles and a transcript.
- **AI guide.** A Gemini docent that knows which room you are in, answers from the museum's own content with exhibit references, and can walk you to an exhibit, open its portal, highlight exhibits or build a tour. Answers can be spoken in the same museum voice.
- **Guided demo tour.** A six-stop tour (`/visit?tour=demo`, about 2.5 minutes) walks you through the most polished exhibits and plays each one's narration. It has Pause, Prev, Skip, an Auto on/off switch, and **hold to ask**: speak a question through ElevenLabs realtime speech to text, the guide answers in two sentences, and the tour carries on.
- **Works without WebGL.** A 2D floor plan (`/map`), an exhibit list (`/exhibits`) and a page per exhibit (`/exhibit/<ID>`) reach every exhibit with no 3D at all.
- **Honest content.** Every fact has a source. We never write "the first computer"; "first" claims and contested claims carry a caveat, unknowns are marked, and simulated data is labelled illustrative.

### The portals

| Year    | Exhibit                       | ID  |
| ------- | ----------------------------- | --- |
| 1936    | Turing's universal machine    | A1  |
| 1945    | ENIAC                         | B2  |
| 1945    | Patch-cable programming       | C1  |
| 1947/54 | The transistor                | B3  |
| 1956    | Dartmouth Workshop            | F2  |
| 1957    | FORTRAN & LISP                | C3  |
| 1968    | Engelbart's demo              | E3  |
| 1991    | NeXT + dial-up                | D6  |
| 1991    | HTML & HTTP                   | D7  |
| 1997    | Deep Blue                     | F7  |
| 2013+   | Bundle Tower: React & Next.js | C10 |
| 2015    | Tensor Processing Unit        | B11 |
| 2017    | The Transformer               | F10 |

## Controls

| Input                | Action                           |
| -------------------- | -------------------------------- |
| W A S D / arrow keys | Walk and turn                    |
| Drag                 | Look around                      |
| Shift                | Hurry                            |
| E, Enter or Space    | Open the exhibit in front of you |
| M                    | Floor plan                       |
| Esc                  | Back to the museum               |

During the tour: **P** pause or play, **N** next exhibit, **B** previous, **hold V** to ask the guide.

## Getting started

Requirements: Node 24 or newer and pnpm 9.15.

```bash
pnpm install
cp .env.example .env        # then fill in the keys you have
pnpm --filter web dev       # http://localhost:3000
```

Open `/visit` for the 3D museum or `/visit?tour=demo` to start the guided tour. The museum, portals and recorded narration work with no keys at all; the keys only enable the AI guide, its speech and the tour microphone.

### Environment

All secrets are **server only**. They are never imported in client code or printed, and CI checks the client bundle for them (`pnpm --filter web check:no-key`). Model IDs are configuration, never hardcoded.

| Variable                                             | Used by                                                            |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| `GEMINI_API_KEY`, `GUIDE_MODEL`                      | AI guide (`/api/guide`)                                            |
| `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`          | Narration build, guide speech, tour microphone                     |
| `NARRATION_MODEL`                                    | Build-time narration (`tools/narrate`)                             |
| `SPEECH_MODEL`                                       | Live guide speech (`/api/speak`)                                   |
| `LISTEN_MODEL`                                       | Realtime speech to text tokens (`/api/listen-token`)               |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limiting; leave empty for the in-memory fallback in local dev |

Current defaults are listed in `.env.example`.

## Commands

```bash
pnpm build | lint | typecheck | test     # all packages via Turborepo
pnpm --filter web test:e2e               # Playwright end-to-end tests
pnpm --filter @museum/plan build:plan    # regenerate the floor plan, walls and navmesh
pnpm --filter @museum/narrate narrate    # regenerate narration audio (needs ElevenLabs keys)
```

## Project layout

```
apps/web               Next.js App Router shell: /visit (3D), /map, /exhibits, /exhibit/[id],
                       and the server routes /api/guide, /api/speak, /api/listen-token
packages/scene         React Three Fiber museum: building, controls, navmesh travel, exhibits,
                       HUD, minimap, narration player, passport, guide UI, guided tour, voice input
packages/portals/<id>  one lazy-loaded package per built exhibit (start from _template)
packages/content       exhibits.json, plan.json, zones, tour.json, Zod schemas, generated geometry
packages/guide         Gemini system prompt, tools, context builder, response validation, evals
tools/plan             plan.json → walls, navmesh, 2D floor plan, exhibit standpoints, shell model
tools/narrate          narration text → ElevenLabs audio + word alignment, content-hashed
tools/assets           glTF optimisation pipeline (meshopt, KTX2)
docs/                  build plans, decisions, exhibit and guide notes
seed/                  reference geometry and the original design prototypes
```

### How it fits together

Data flows one way. `packages/content` holds the exhibit registry and the floor plan as validated JSON; `tools/plan` turns the plan into the walls, navmesh and 2D map, so the floor plan and the 3D scene can never disagree; `tools/narrate` turns each exhibit's narration text into audio; the scene and the web app read the results at runtime.

The guide runs on the server: the browser sends the question with the visitor's context, `/api/guide` streams Gemini's answer and tool calls back, and the browser validates every exhibit ID before acting on it. Spoken answers stream sentence by sentence from `/api/speak`. The tour microphone gets a single-use token from `/api/listen-token` and talks to ElevenLabs realtime speech to text directly, so no key reaches the browser.

## Quality gates

CI (`.github/workflows/ci.yml`) runs lint, typecheck, unit tests and build across the workspace, the Playwright end-to-end suite, the performance budget and the no-key bundle check. Budgets: initial load under 3 MB, under 150 KB of JavaScript per portal, under 600 KB of narration per exhibit, under 400 draw calls per room view on the high tier. Narration audio is regenerated by the `narrate` workflow on `main` and the guide evals by `guide-eval`.

## Credits

Narration and guide voice by ElevenLabs. AI guide by Google Gemini. Third-party textures are credited with their licences in [`apps/web/public/textures/CREDITS.md`](apps/web/public/textures/CREDITS.md).
