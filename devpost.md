# Hello Museum

*Hello World. Meet your history.*

**[hellomuseum.tech](https://hellomuseum.tech)** | StormHacks 2026

---

## Inspiration

Museums about computing tend to be either a wall of placards ("read this about ENIAC") or a hardware graveyard of beige boxes behind glass. The moment you stop reading, the ideas stop being alive.

We wanted to build the opposite: a museum where *every exhibit is something you do*, not something you read. The one-line promise we wrote down on day one was "Every exhibit is a portal. If there is nothing to do, it is a placard, not an exhibit."

It's also a tribute. Ada Lovelace, Turing, Hopper, the ENIAC Six, the ARPANET team — the people who made modern computing possible deserve a space that makes their ideas feel urgent, not archival.

## What it does

Hello Museum is an interactive computer science museum you walk through in your browser — no install, no headset.

- **A walkable 3D building.** Six themed wings (logic, hardware, software, networks, interaction, AI) open off a concourse that rings a glass atrium. 76 exhibit positions sit on a real floor plan, generated from one source of data so the 2D map and 3D scene can never disagree.
- **Every exhibit opens a portal.** Step up to a plaque and click, and the exhibit becomes a hands-on interactive: step a Turing machine tape, wire patch cables, punch a FORTRAN card, race a dial-up modem's handshake, watch attention weights light up in a Transformer. Thirteen exhibits are fully built today.
- **Narration with synced captions.** Each exhibit has a spoken description in one consistent museum voice (ElevenLabs), generated at build time with character-level alignment so captions highlight as they're spoken.
- **Real movement, not teleports.** Recast/Detour navmesh pathfinding walks you through doorways and era bridges to any exhibit.
- **A web-first museum.** Every exhibit has a URL (`/exhibit/B4`) that renders a fully accessible 2D page without WebGL, so nothing is locked behind a graphics card.

## How we built it

We prototyped the whole experience first in a design canvas, then rebuilt it for production as a TypeScript monorepo:

- **App shell:** Next.js (App Router), with the 3D world as a client-only React Three Fiber component and a 2D fallback page per exhibit.
- **3D:** three.js via React Three Fiber + drei. The building shell is generated from plan geometry, then baked lighting provides the realism (one directional light for shadows plus a pool of six spotlights that follow the nearest exhibits).
- **Content is a single source of truth.** The exhibit registry and plan geometry live in `packages/content` as JSON validated with Zod. CI fails if `exhibits.json` doesn't match the blueprint, if a fact is missing a source, or if a "first" claim lacks a caveat.
- **One portal package per exhibit.** Each portal is its own lazy-loaded package exporting `{ id, meta, Portal }`, so the 13 interactives are isolated and testable.
- **Movement:** navmesh generated at build time with `recast-navigation`, plus a 2D collision layer. No physics engine.
- **Narration:** `tools/narrate` calls ElevenLabs text-to-speech *with timestamps* at build time, producing a content-hashed MP3 plus an alignment file, and regenerates only changed exhibits.
- **Testing:** Vitest for portal logic, schemas, and alignment, and Playwright for end-to-end flows and headless WebGL screenshot diffs.

## Challenges we ran into

- **Keeping every layer in agreement.** A 2D map, a 3D scene, a navmesh, and per-exhibit pages all describe the same building. Any drift between them is a bug, so we made the plan geometry the single input and *generated* walls, navmesh, and map from it. The generator scripts had to move into the repo before anything else made sense.
- **Movement without a physics engine.** Replacing the prototype's fade-teleport with real pathfinding through doorways meant tuning Recast voxel size against an agent radius of 0.35 m, and writing a system that cancels travel on any keypress so the player always stays in control.
- **Narration that stays in sync.** Spoken captions need audio and text to line up. We generate character-level alignment from ElevenLabs timestamps, and a pronunciation dictionary (ENIAC, Dijkstra, Lovelace...) so the voice says the names right while captions keep the real spelling.
- **A museum about bloat can't ship bloat.** We enforce a performance budget in CI — sub-3 MB initial load, under 150 KB of JS per portal, under 600 KB per narration clip — and a Bloat Audit exhibit (S3) that would be hypocritical if the page were heavy.
- **Staying honest about history.** "First computer" is a contested claim, so we enforced sourced facts, caveats on firsts, and a rule against inventing numbers. Unknowns are explicit `[TBD]` markers, not guesses.

## Accomplishments that we're proud of

- **A real, walkable building** with six wings, an atrium, and era bands where depth equals date — walking toward the windows moves you forward through time.
- **Thirteen fully working portals**, each a genuine interaction rather than a slideshow, built as isolated packages.
- **The geometry pipeline.** One source of truth (`exhibits.json` + plan geometry) generates the 2D plan, the 3D walls, and the navmesh, so the map and the world can't contradict each other.
- **Narration with synced captions** in a single licensed museum voice, generated reproducibly with content-hashed filenames.
- **A discipline layer around accuracy** — every fact sourced, every "first" caveated, CI failing on any mismatch — that most demo projects skip.

## What we learned

- **Generate, don't hand-model.** Once we made the plan geometry the input and generated everything downstream, entire classes of "the map doesn't match the 3D" bugs disappeared.
- **A single source of truth is a superpower.** Blueprint-first development meant every build plan had clear deliverables and acceptance criteria, and we could hand plans to agents without them inventing scope.
- **Interactive beats informative.** The exhibits people remember are the ones where they *do* the thing — step the machine, race the modem, watch the weights — not the ones with the longest text.
- **Accessibility is architecture, not a patch.** Designing every exhibit to also work as a plain 2D page forced us to keep content and interaction clean from the start.
- **Performance and honesty are the same virtue here.** A computing museum that ships a 5 MB page or invents statistics would undermine its own subject.

## What's next for Hello Museum

- **The AI guide.** A Gemini-powered curator that knows where you're standing, answers from museum content first (citing exhibit IDs), and can `walkTo`, `openPortal`, or build you a guided tour through its tools. Text first, then streamed speech in the same museum voice.
- **The remaining 63 exhibits.** 24 "Core" exhibits are next (person-led exhibits first), each to the full contract: model, plaque, portal, narration, stats, sources.
- **Guided tours and a live voice guide** so a visitor can ask a question out loud and get walked to the answer.
- **Mobile controls and WebXR** on the same scene, plus the full performance budget shipped.
- **Open to contributions** — the Future Lab literally reserves an open slot (`X2`) for a future exhibit, and we'd love the community to help fill it.
