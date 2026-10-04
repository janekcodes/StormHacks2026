# Hello Museum

**Source of truth · Scope v1.1 · 2026-10-03**

This file defines what Hello Museum is, what it covers, how it is laid out, how the prototype is built, and the stack, AI guide and narration voice for the production build. Every other Markdown file in this project points back here. If another file disagrees with this one, this one wins, and the other file is the bug.

---

## 0. Rules for every contributor (human or agent)

1. **Read this file first.** Every task starts here, then reads only the files it needs.
2. **Exhibit IDs are permanent.** IDs in [§6 Exhibit registry](#6-exhibit-registry) (for example `B4`, `F11`) are the only way to refer to an exhibit. Never invent, renumber or reuse an ID. New exhibits get the next free number in their zone, added here first.
3. **Scope changes happen here first.** Adding, removing, moving or re-tiering an exhibit means editing this file (registry + changelog) before any other file changes.
4. **Every fact needs a source.** Dates, numbers and "first" claims in any exhibit file must cite a source. No invented statistics. Unknowns are written as `[TBD: what is missing]`.
5. **Contested claims carry a caveat.** See [§8 Content rules](#8-content-and-accuracy-rules).
6. **No em or en dashes in UI copy.** Use commas, colons, "to" for ranges (`1936 to 1969`) and `/` for paired years (`1947/54`).
7. **Point back.** Every new Markdown file starts with the header block in [§14](#14-documentation-conventions).
8. **API keys stay on the server.** Gemini and ElevenLabs keys live only in server environment variables. No key, and no direct call with a key, ever ships to the browser.
9. **No imitation of real people's voices.** Narration and the guide use a library or designed voice. Never clone or imitate a historical figure or any real person.
10. **Model IDs are configuration.** Never hardcode a Gemini or ElevenLabs model ID in application code; read it from config (see [§10](#10-production-stack)).

---

## 1. What this is

An interactive, explorable museum of computer science history. Visitors walk a 3D building, step up to physical exhibits, and open a **portal** for each one: a hands-on interactive that lets them do the thing the milestone was about (step a Turing machine, punch a FORTRAN card, race a dial-up modem, watch attention weights).

Two voices travel with the visitor:

- an **AI guide** (Gemini) that answers questions, knows where the visitor is standing, and can walk them to exhibits or build a tour;
- a **narrator** (ElevenLabs) that reads each exhibit's description aloud, with synced captions, the moment the visitor clicks it.

**Current status:** working prototype. The full building, all 76 exhibit positions, 13 built exhibits with working portals, and 63 placeholders. The guide and narration are specified here and not yet built.

**One-line promise:** _Every exhibit is a portal. If there is nothing to do, it is a placard, not an exhibit._

---

## 2. Organising principle

### Wings by theme, depth by time

- Six **themed wings** open off a **concourse** that rings a central glass **atrium**.
- Inside every wing, **depth is date**. Walking from the concourse toward the outer windows moves you forward in time.
- Every wing uses the same three **era bands**, so 1971 in Hardware is one door away from 1971 in Software.

| Band     | Name               | Years         | Position in a wing      |
| -------- | ------------------ | ------------- | ----------------------- |
| Prologue | Before the machine | before 1936   | Atrium                  |
| Inner    | Foundations        | 1936 to 1969  | Next to the concourse   |
| Middle   | Expansion          | 1970 to 1999  | Middle of the wing      |
| Outer    | Ubiquity           | 2000 to today | By the exterior windows |

### Two ways to walk

- **Theme walk:** enter a wing from the concourse, walk toward the windows. One strand, start to present.
- **Era walk:** stay in one band and cross sideways through the doors between neighbouring wings.
- **No backtracking:** the outer bands connect wing to wing around the building and finish in the two front galleries, which open onto the foyer. Nobody walks backwards through time to leave.

---

## 3. Scope

### In scope when an exhibit

1. changed what computers could do, or who could use them;
2. can be dated to a specific machine, paper, program or event;
3. has a hands-on or visual hook for its portal;
4. fits exactly one zone and one band (no exhibit lives in two places).

### Out of scope

- company and product histories for their own sake (one exhibit per idea, not per brand);
- spec-sheet comparisons and gadget nostalgia beyond one representative object;
- predictions outside the Future Lab;
- contested claims stated as fact (they get a caveat label instead);
- pre-1936 history beyond the seven atrium pieces.

### Tiers

| Tier          | Count | Meaning                                  |
| ------------- | ----- | ---------------------------------------- |
| **Built**     | 13    | Object and portal exist in the prototype |
| **Core**      | 24    | Needed for a complete story; build next  |
| **Extended**  | 39    | Depth for later phases                   |
| **Open slot** | 1     | `X2`, reserved for a future milestone    |

**Total: 76 planned exhibits + 1 open slot.**

---

## 4. Zones

| Code | Zone                             | Location in the building         | Built / Core / Ext |
| ---- | -------------------------------- | -------------------------------- | ------------------ |
| P    | Prologue                         | Atrium (centre)                  | 0 / 2 / 5          |
| A    | Logic, Theory & Cryptography     | South-west wing                  | 1 / 3 / 5          |
| B    | Hardware & Architecture          | West wing                        | 3 / 4 / 5          |
| C    | Software, Languages & Systems    | North-west wing                  | 3 / 4 / 3          |
| D    | Networks & the Web               | North-east wing                  | 2 / 3 / 6          |
| E    | Interaction & Personal Computing | North wing (smallest room)       | 1 / 3 / 4          |
| F    | Artificial Intelligence          | East wing                        | 3 / 3 / 5          |
| G    | People Gallery                   | Front gallery, west of the foyer | 0 / 1 / 2          |
| S    | Society & Ethics                 | Front-right room, larger half    | 0 / 1 / 3          |
| X    | Future Lab                       | Front-right room, smaller half   | 0 / 0 / 1 + slot   |

Non-exhibit spaces: **Foyer** (entrance, tickets, information), **Museum Shop** (front gallery, east of the foyer), **Concourse** (ring around the atrium).

Zone colours (ink / floor tint):

| Zone    | Ink       | Tint      |
| ------- | --------- | --------- |
| A       | `#5a49c4` | `#ebe8fb` |
| B       | `#a8601a` | `#fbeedd` |
| C       | `#23744a` | `#e3f3ea` |
| D       | `#1f6699` | `#e1eef8` |
| E       | `#a8375f` | `#f9e4ed` |
| F       | `#0e7272` | `#ddf2f2` |
| P       | `#7a6a48` | `#efe9dc` |
| G, S, X | `#4f5963` | `#eceef0` |

The `tint` fills the **2D floor plan** room washes. The 3D scene uses realistic stone and wood materials instead (see `docs/decisions/0010-museum-materials.md`); `ink` is the wayfinding accent in both.

---

## 5. The building

### Footprint

A wide building with chamfered back corners, a curved glass foyer at the front centre, and two front blocks either side of it. An eight-sided glass atrium sits in the middle; the concourse rings it; rooms fill the space between the concourse and the exterior walls.

```
                 C (NW)      E (N)      D (NE)
              ┌──────────┬─────────┬──────────┐
              │          │         │          │
      B (W)   │        ┌─┴─────────┴─┐        │   F (E)
              │        │  CONCOURSE  │        │
              │        │  ┌───────┐  │        │
              │        │  │ATRIUM │  │        │
              │        │  └───────┘  │        │
      A (SW)  │        └──┬───────┬──┘        │   S + X (SE)
              │     People│ FOYER │Shop       │
              └───────────┘ (   ) └───────────┘
                          ENTRANCE
```

### Plan geometry (authoritative numbers)

All plan coordinates are in plan pixels, origin at the atrium centre `(1000, 640)`, north up, entrance south.

| Element    | Value                                                                                                                            |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Atrium     | regular octagon, circumradius 150 px, flat sides facing N/S/E/W                                                                  |
| Concourse  | octagon ring, outer circumradius 232 px                                                                                          |
| Rooms      | 8 sectors of 45° bounded by radial walls from the concourse octagon's vertices to the exterior                                   |
| Sector map | E = F, SE = S + X (split at 45°), S = Foyer + People + Shop, SW = A, W = B, NW = C, N = E, NE = D                                |
| Era bands  | each room's depth split into thirds, measured perpendicular to the sector's centre line                                          |
| Doors      | concourse to wing: 64 px; between wings: three 34 px era bridges per radial wall; front rooms to galleries: one near the windows |
| Exterior   | glass curtain wall between 0.9 m and 4.2 m, mullions about every 3 m                                                             |

### 3D scale

- **1 plan px = 0.042 m.** The building is about 59 m × 42 m.
- Ceiling 5 m. Atrium skylight 7.5 m.
- World axes: `x = (planX − 1000) × 0.042`, `z = (planY − 640) × 0.042`. North is −z.
- Minimum exhibit spacing is about 2.4 m. Floor-standing exhibits need a 2.3 m × 2.0 m platform; plinth exhibits a 1.3 m plinth; placeholders a 0.9 m plinth.
- Every exhibit faces the atrium centre (people in the G gallery face the foyer), so visitors walking outward always meet the front of an exhibit.

---

## 6. Exhibit registry

The canonical list. **Portal** gives the portal artboard and its `exhibit` prop for built items.

| ID  | Year       | Exhibit                                   | Zone             | Band     | Tier      | Portal          |
| --- | ---------- | ----------------------------------------- | ---------------- | -------- | --------- | --------------- |
| P1  | c. 100 BCE | Antikythera mechanism                     | Atrium           | Prologue | Extended  |                 |
| P2  | c. 820     | Al-Khwarizmi and the word "algorithm"     | Atrium           | Prologue | Extended  |                 |
| P3  | 1804       | Jacquard's punched-card loom              | Atrium           | Prologue | Extended  |                 |
| P4  | 1822/37    | Babbage's Difference & Analytical Engines | Atrium           | Prologue | Core      |                 |
| P5  | 1843       | Ada Lovelace's Note G                     | Atrium           | Prologue | Core      |                 |
| P6  | 1854       | Boole's algebra of logic                  | Atrium           | Prologue | Extended  |                 |
| P7  | 1890       | Hollerith's census tabulator              | Atrium           | Prologue | Extended  |                 |
| A1  | 1936       | Turing's universal machine                | Wing A           | Inner    | Built     | Portal1945 / ai |
| A2  | 1937       | Shannon: circuits as Boolean logic        | Wing A           | Inner    | Extended  |                 |
| A3  | 1940/44    | Bletchley Park: Bombe & Colossus          | Wing A           | Inner    | Core      |                 |
| A4  | 1948       | Information theory                        | Wing A           | Inner    | Core      |                 |
| A5  | 1959       | Dijkstra's shortest path                  | Wing A           | Inner    | Extended  |                 |
| A6  | 1971       | NP-completeness                           | Wing A           | Middle   | Extended  |                 |
| A7  | 1976/77    | Public-key crypto: Diffie-Hellman, RSA    | Wing A           | Middle   | Core      |                 |
| A8  | 1994       | Shor's algorithm                          | Wing A           | Middle   | Extended  |                 |
| A9  | 2024       | Post-quantum crypto standards             | Wing A           | Outer    | Extended  |                 |
| B1  | 1941       | Zuse Z3                                   | Wing B           | Inner    | Extended  |                 |
| B2  | 1945       | ENIAC                                     | Wing B           | Inner    | Built     | Portal1945 / hw |
| B3  | 1947/54    | The transistor                            | Wing B           | Inner    | Built     | Portal1956 / hw |
| B4  | 1948       | Manchester Baby: first stored program     | Wing B           | Inner    | Core      |                 |
| B5  | 1958/59    | The integrated circuit                    | Wing B           | Inner    | Core      |                 |
| B6  | 1965       | Moore's law                               | Wing B           | Inner    | Extended  |                 |
| B7  | 1971       | Intel 4004 microprocessor                 | Wing B           | Middle   | Core      |                 |
| B8  | 1976       | Cray-1 supercomputer                      | Wing B           | Middle   | Extended  |                 |
| B9  | 1985       | ARM1                                      | Wing B           | Middle   | Extended  |                 |
| B10 | 2007       | CUDA & GPU computing                      | Wing B           | Outer    | Core      |                 |
| B11 | 2015       | Tensor Processing Unit                    | Wing B           | Outer    | Built     | Portal2026 / hw |
| B12 | 2019       | Quantum processors                        | Wing B           | Outer    | Extended  |                 |
| C1  | 1945       | Patch-cable programming                   | Wing C           | Inner    | Built     | Portal1945 / sw |
| C2  | 1952       | Hopper's A-0 compiler                     | Wing C           | Inner    | Core      |                 |
| C3  | 1957       | FORTRAN & LISP                            | Wing C           | Inner    | Built     | Portal1956 / sw |
| C4  | 1959       | COBOL                                     | Wing C           | Inner    | Extended  |                 |
| C5  | 1968/69    | Software engineering & Apollo code        | Wing C           | Inner    | Extended  |                 |
| C6  | 1969/72    | Unix & C                                  | Wing C           | Middle   | Core      |                 |
| C7  | 1970       | Relational databases                      | Wing C           | Middle   | Core      |                 |
| C8  | 1983/91    | GNU & Linux                               | Wing C           | Middle   | Core      |                 |
| C9  | 2005       | Git                                       | Wing C           | Outer    | Extended  |                 |
| C10 | 2013+      | Bundle Tower: React & Next.js             | Wing C           | Outer    | Built     | Portal2026 / sw |
| D1  | 1969       | ARPANET                                   | Wing D           | Inner    | Core      |                 |
| D2  | 1971       | Email                                     | Wing D           | Middle   | Extended  |                 |
| D3  | 1973       | Ethernet                                  | Wing D           | Middle   | Extended  |                 |
| D4  | 1974/83    | TCP/IP                                    | Wing D           | Middle   | Core      |                 |
| D5  | 1983       | DNS                                       | Wing D           | Middle   | Extended  |                 |
| D6  | 1991       | NeXT + dial-up                            | Wing D           | Middle   | Built     | Portal1991 / hw |
| D7  | 1991       | HTML & HTTP                               | Wing D           | Middle   | Built     | Portal1991 / sw |
| D8  | 1993       | Mosaic browser                            | Wing D           | Middle   | Extended  |                 |
| D9  | 1998       | Search: PageRank                          | Wing D           | Middle   | Extended  |                 |
| D10 | 2001       | Wikipedia                                 | Wing D           | Outer    | Extended  |                 |
| D11 | 2006       | The cloud: AWS                            | Wing D           | Outer    | Core      |                 |
| E1  | 1962       | Spacewar!                                 | Wing E           | Inner    | Extended  |                 |
| E2  | 1963       | Sketchpad                                 | Wing E           | Inner    | Core      |                 |
| E3  | 1968       | Engelbart's demo                          | Wing E           | Inner    | Built     | @museum/portal-e3 |
| E4  | 1973       | Xerox Alto                                | Wing E           | Middle   | Extended  |                 |
| E5  | 1975/77    | Altair 8800 & Apple II                    | Wing E           | Middle   | Extended  |                 |
| E6  | 1981/84    | IBM PC & Macintosh                        | Wing E           | Middle   | Core      |                 |
| E7  | 2007       | Smartphone & multi-touch                  | Wing E           | Outer    | Core      |                 |
| E8  | 2009       | Screen readers go mainstream              | Wing E           | Outer    | Extended  |                 |
| F1  | 1950       | The Turing test                           | Wing F           | Inner    | Extended  |                 |
| F2  | 1956       | Dartmouth Workshop                        | Wing F           | Inner    | Built     | Portal1956 / ai |
| F3  | 1958       | The Perceptron                            | Wing F           | Inner    | Core      |                 |
| F4  | 1966       | ELIZA                                     | Wing F           | Inner    | Extended  |                 |
| F5  | 1974/93    | AI winters & expert systems               | Wing F           | Middle   | Extended  |                 |
| F6  | 1986       | Backpropagation                           | Wing F           | Middle   | Extended  |                 |
| F7  | 1997       | Deep Blue                                 | Wing F           | Middle   | Built     | Portal1991 / ai |
| F8  | 2012       | AlexNet & ImageNet                        | Wing F           | Outer    | Core      |                 |
| F9  | 2016       | AlphaGo                                   | Wing F           | Outer    | Extended  |                 |
| F10 | 2017       | The Transformer                           | Wing F           | Outer    | Built     | Portal2026 / ai |
| F11 | 2022       | ChatGPT                                   | Wing F           | Outer    | Core      |                 |
| G1  | 1945       | The ENIAC Six                             | People Gallery   | n/a      | Core      |                 |
| G2  | 1940s/60s  | NASA's human computers                    | People Gallery   | n/a      | Extended  |                 |
| G3  | all eras   | Wall of names                             | People Gallery   | n/a      | Extended  |                 |
| S1  | 1999/2000  | Y2K                                       | Society & Ethics | Middle   | Extended  |                 |
| S2  | 2018       | GDPR & privacy                            | Society & Ethics | Outer    | Extended  |                 |
| S3  | 2025       | The Bloat Audit                           | Society & Ethics | Outer    | Core      |                 |
| S4  | today      | Energy & e-waste                          | Society & Ethics | Outer    | Extended  |                 |
| X1  | next       | Quantum futures                           | Future Lab       | n/a      | Extended  |                 |
| X2  | next       | [YOUR FUTURE EXHIBIT]                     | Future Lab       | n/a      | Open slot |                 |

> **Note on portals:** the four portal artboards are grouped by the original four-hall prototype (1945, 1956, 1991, 2026), not by wing. That grouping is legacy. New portals are one package per exhibit, named by ID (see [§10](#10-production-stack)).

---

## 7. Exhibit contract

Every exhibit, when it reaches **Built**, must have all of the following.

| Part              | Requirement                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Object**        | A 3D model on a plinth (≤ 1.3 m) or platform (≤ 2.3 m × 2.0 m), facing the atrium, readable from 2.5 m                         |
| **Plaque**        | ID, year, title, one-line hook, "click to open portal"                                                                         |
| **Portal**        | One clear interaction that demonstrates the idea (not a slideshow). Works with mouse, keyboard and touch.                      |
| **Caption**       | 2 to 3 sentences, plain language, ends with the interaction prompt                                                             |
| **Narration**     | A spoken version of the caption written for the ear (see [§12](#12-narration-voice)), plus generated audio and alignment files |
| **Stats**         | Exactly 3 key facts, each sourced                                                                                              |
| **Sources**       | Listed in the exhibit's own file                                                                                               |
| **Caveat**        | Required if the exhibit makes or implies a "first" or a contested claim                                                        |
| **Accessibility** | Real buttons and inputs, visible focus, text contrast ≥ 4.5:1, reduced motion respected                                        |

A **Core** or **Extended** exhibit in the prototype is a placeholder plinth with its plaque and a "portal in development" card. It must still sit at its registry position.

---

## 8. Content and accuracy rules

1. **Dates.** Single year where clear. Paired years `1947/54` when two events define it. Ranges as `1974 to 1993` in prose.
2. **"First" claims.** Z3, Colossus, ENIAC and the Manchester Baby each have one. Each label says exactly what it was first at. Never write "the first computer".
3. **Illustrative data.** Anything simulated (attention weights in F10, next-token odds) must be labelled "illustrative" in the portal itself.
4. **Modern figures.** Web-weight numbers come from the HTTP Archive Web Almanac 2025 (median mobile home page: 2.56 MB, 75 requests, 632 KB of JavaScript). The 1991 first-page size (~2 KB) is an approximation and is labelled as one.
5. **Recency.** Outer-band exhibits after 2015 describe ideas, not products, and are reviewed once a year. Quantum advantage claims (B12, X1) carry a caveat.
6. **Brands.** No logos or brand marks reproduced. Real names of machines and people are fine; their trademarks are not drawn.
7. **People.** Target: every wing has at least one person-led Core exhibit (today only Lovelace P5, Hopper C2 and the ENIAC Six G1 qualify).
8. **Spoken text.** Narration states the same facts as the caption, never extra ones. Numbers, symbols and paired years are written out for speech (`1947/54` becomes "in 1947, and in silicon in 1954").
9. **AI answers.** The guide answers from museum content first and cites exhibit IDs. Anything from outside the collection is labelled as such. Rules in [§11](#11-guide-bot).

---

## 9. Prototype architecture

The prototype lives in one **Design canvas** artifact. Each `.dc.html` file is an artboard.

| Artboard                 | Role                                                                                          | Status     |
| ------------------------ | --------------------------------------------------------------------------------------------- | ---------- |
| `MuseumBuilding.dc.html` | **Main prototype.** 3D walkable building on the floor plan, all 76 exhibits, minimap, portals | Current    |
| `Portal1945.dc.html`     | Portals for A1 (`ai`), B2 (`hw`), C1 (`sw`)                                                   | Current    |
| `Portal1956.dc.html`     | Portals for B3 (`hw`), C3 (`sw`), F2 (`ai`)                                                   | Current    |
| `Portal1991.dc.html`     | Portals for D6 (`hw`), D7 (`sw`), F7 (`ai`)                                                   | Current    |
| `Portal2026.dc.html`     | Portals for B11 (`hw`), C10 (`sw`), F10 (`ai`)                                                | Current    |
| `FloorPlan.dc.html`      | 2D floor plan with every exhibit marker                                                       | Current    |
| `Scope.dc.html`          | Curatorial scope board: matrix, coverage check, gaps                                          | Current    |
| `Museum3D.dc.html`       | First 3D build (straight corridor)                                                            | Superseded |
| `Main.dc.html`           | 2D side-scrolling walk                                                                        | Superseded |

### Tech

- **Rendering:** three.js r149 (UMD build, uploaded as an artifact asset), WebGL, ACES tone mapping, image-based lighting, one shadow-casting directional light that follows the player, a pool of 6 spotlights reassigned to the nearest exhibits.
- **Performance:** static architecture is merged into a few draw calls; exhibits further than 40 m are hidden. A `quality` tweak (`high` / `balanced`) lowers pixel ratio and shadow resolution.
- **Portals** are separate artboards mounted with `<dc-import name="PortalXXXX" exhibit="hw|sw|ai">`.
- **Controls:** WASD / arrows, Shift to run, drag to look, click or E to open, M toggles the minimap, Esc closes a portal.

### Geometry pipeline

```
exhibit data (registry)  ─┐
                           ├─► plan generator ─► FloorPlan.dc.html (2D)
plan geometry (§5)        ─┘          │
                                      └─► 3D export (JSON, metres) ─► MuseumBuilding.dc.html
```

The registry and plan geometry are the inputs; the 2D plan and 3D scene are both generated from them, so they can never disagree. **Status: the generator scripts are not yet in a repository.** Moving them in is task 1 of Phase 2.

### Visual language

| Token                 | Value                   |
| --------------------- | ----------------------- |
| Display font          | Chakra Petch 600 / 700  |
| Body and data font    | IBM Plex Mono 400 / 500 |
| Screen font (portals) | VT323                   |
| Plan ground           | `#f4f2ed`               |
| Ink                   | `#1d2024`               |
| Muted                 | `#5b6168`               |
| Museum accent         | `#ffb347`               |

---

## 10. Production stack

The prototype proves the experience. The real build is **web-first**: a link, no install, works on laptops and phones, with WebXR available later on the same scene.

| Layer           | Choice                                                                                                          | Notes                                                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Language        | **TypeScript** everywhere                                                                                       | Strict mode. Shared types between scene, portals, content and server.                                                           |
| App shell       | **Next.js** (App Router)                                                                                        | Every exhibit has a URL (`/exhibit/B4`) that renders a 2D page without WebGL. The 3D world is a client-only component.          |
| 3D              | **React Three Fiber + drei** (three.js)                                                                         | Scene, exhibits and portals share one React tree.                                                                               |
| Movement        | **2D collision from `plan.json` + navmesh** (`recast-navigation-js`)                                            | No physics engine. Navmesh pathfinding replaces the prototype's fade-teleport.                                                  |
| Assets          | **Blender → glTF/GLB**, optimised with **gltf-transform** (Meshopt or Draco, KTX2 textures)                     | One GLB per exhibit object.                                                                                                     |
| Lighting        | **Baked lightmaps** (Blender) + 1 to 2 real-time lights                                                         | Main source of realism; keeps the GPU cost low.                                                                                 |
| State           | **Zustand**                                                                                                     | Player position, passport, quality tier, audio settings.                                                                        |
| Content         | **JSON + MDX in the repo, validated with Zod**                                                                  | `packages/content/exhibits.json` mirrors [§6](#6-exhibit-registry). CI fails on any mismatch, missing source or missing caveat. |
| Portals         | **One package per exhibit** (`packages/portals/<ID>`), lazy-loaded                                              | Each exports `{ id, meta, Portal }`.                                                                                            |
| AI guide        | **Gemini API** via `@google/genai`                                                                              | See [§11](#11-guide-bot).                                                                                                       |
| Narration       | **ElevenLabs API**                                                                                              | Build-time narration plus streamed guide speech. See [§12](#12-narration-voice).                                                |
| Device tiers    | **detect-gpu**                                                                                                  | Picks `high`, `balanced` or `low` automatically.                                                                                |
| Tests           | **Vitest** (portal logic, schemas, guide tools) + **Playwright** (end to end, screenshot diffs, headless WebGL) |                                                                                                                                 |
| Hosting         | **Vercel or Cloudflare Pages**                                                                                  | Static assets and audio on the CDN; server routes for the guide only.                                                           |
| Rate limiting   | **Upstash Redis or Cloudflare KV**                                                                              | Per-session limits on guide and live speech.                                                                                    |
| Backend (later) | **Supabase** or a small API                                                                                     | Only for passport sync, accounts and analytics, when needed.                                                                    |

### Repository layout

```
BLUEPRINT.md                   ← this file
apps/web                       ← Next.js shell, routes, 2D fallback, /api/guide, /api/speak
packages/scene                 ← R3F building, controls, minimap, audio player
packages/portals/<ID>          ← one portal per exhibit
packages/content               ← exhibits.json, plan.json, Zod schemas, MDX
packages/guide                 ← system prompt, tool definitions, context builder, evals
tools/plan                     ← plan.json → walls, navmesh, 2D map, exhibit positions
tools/narrate                  ← narration text → audio + alignment files
public/audio                   ← generated narration (content-hashed filenames)
docs/                          ← see §14
```

pnpm workspaces + Turborepo. A task such as "build portal E3" should touch exactly one package plus its content entry.

### Configuration

| Variable              | Where              | Purpose                                             |
| --------------------- | ------------------ | --------------------------------------------------- |
| `GEMINI_API_KEY`      | server only        | Guide                                               |
| `GUIDE_MODEL`         | server             | Gemini model for the text guide                     |
| `ELEVENLABS_API_KEY`  | server and CI only | Narration build + live speech                       |
| `ELEVENLABS_VOICE_ID` | server and CI      | The museum voice (one voice for narrator and guide) |
| `NARRATION_MODEL`     | CI                 | ElevenLabs model for build-time narration           |
| `SPEECH_MODEL`        | server             | ElevenLabs model for live guide speech              |
| `LISTEN_MODEL`        | server             | ElevenLabs realtime speech to text model for the tour microphone |

Values as of 2026-10: `GUIDE_MODEL = gemini-3.8-flash`, `NARRATION_MODEL = eleven_multilingual_v2` (or `eleven_v3`), `SPEECH_MODEL = eleven_flash_v2_5` (or `eleven_v4_turbo`), `LISTEN_MODEL = scribe_v2_realtime`. Check the providers' model pages before changing them; both retire models regularly.

### Performance budget (enforced in CI)

| Budget                                                   | Limit    |
| -------------------------------------------------------- | -------- |
| Initial load before exhibit assets                       | < 3 MB   |
| JavaScript per portal package                            | < 150 KB |
| Narration clip per exhibit                               | < 600 KB |
| Draw calls per room view, `high` tier                    | < 400    |
| Frame rate target, `balanced` tier on a mid-range laptop | 60 fps   |

A museum with a Bloat Audit exhibit (S3) does not get to ship a bloated page.

### Accessibility

- Every exhibit and portal is reachable without WebGL, from the 2D floor plan or a list.
- Narration always has on-screen captions.
- Reduced motion, keyboard-only use and screen readers are supported in the shell and every portal.

---

## 11. Guide bot

A built-in museum guide powered by Gemini. It answers questions, knows where the visitor is, and acts in the museum through tools. It points people **to** portals; it never replaces them. If the bot explains an idea better than its portal does, the portal is the bug.

### Flow

```
Browser: question + visitor context
   → POST /api/guide (server, holds GEMINI_API_KEY)
   → Gemini (GUIDE_MODEL), streaming, with tools
   ← streamed text + tool calls
Browser: validates tool calls, executes them, shows text, optionally speaks it (§12)
```

### Context sent with every request

1. **System prompt** (cached): persona, rules below, the compact registry (ID, year, title, zone, band, tier) for all 77 entries.
2. **Visitor context**: current room, nearest exhibit, open portal, visited IDs.
3. **Exhibit detail**: full caption, stats, sources and caveat for the open or nearest exhibit only.

No vector database. The whole collection fits in context; revisit only if exhibit texts grow beyond that.

### Tools

| Tool                | Arguments                        | Browser action                                      |
| ------------------- | -------------------------------- | --------------------------------------------------- |
| `walkTo`            | `exhibitId`                      | Pathfind the visitor to the exhibit's viewing point |
| `openPortal`        | `exhibitId`                      | Open the portal (starts narration)                  |
| `highlight`         | `exhibitIds[]`                   | Raise spotlights, mark on minimap                   |
| `startTour`         | `title`, `exhibitIds[]` (2 to 8) | Run a guided route, stop by stop                    |
| `getVisitorContext` | none                             | Return room, facing, visited, passport              |

Every ID is validated against `exhibits.json` before execution. An unknown ID is rejected and reported back to the model, never executed.

### Guide rules

1. Answer from museum content first; cite exhibit IDs ("see B4").
2. Questions outside the collection: say so, or answer with Google Search grounding and label it "outside the museum".
3. Planned exhibits (Core, Extended) are described as planned, never as on display.
4. Never present illustrative portal data (F10 weights, next-token odds) as real model output.
5. Stay on computer science and the museum; redirect politely otherwise.
6. Keep answers short (under about 120 words) unless asked for more; spoken answers shorter still.
7. Visibly labelled as an AI guide. No personal data is sent to the model.

### Limits and logging

- Per-session rate limit and maximum response length.
- Anonymised question logs (no IP, no user ID) to learn what visitors ask.

### Evals (CI)

- About 40 golden questions with expected facts and expected citations (for example: "Who programmed ENIAC?" must cite C1 and G1).
- Every tool call in eval runs must use valid IDs; tours must pass the Zod schema.
- Re-run on any prompt change and on any `GUIDE_MODEL` change.

### Later: live voice conversation

Gemini Live (as of 2026-10, `gemini-3.8-live`) supports low-latency spoken conversation. If adopted, the browser connects with **ephemeral tokens** issued by the server, never the API key. Decision pending: Gemini Live's own voice vs the ElevenLabs museum voice (see open decisions).

---

## 12. Narration voice

ElevenLabs voices the museum. **One voice** for both the narrator and the guide.

### Two pipelines

| Speech                             | Generated                               | Model                             | Delivery                      |
| ---------------------------------- | --------------------------------------- | --------------------------------- | ----------------------------- |
| **Exhibit narration** (fixed text) | At build time in CI, by `tools/narrate` | `NARRATION_MODEL` (quality first) | Static files on the CDN       |
| **Guide answers** (dynamic)        | At runtime, by `/api/speak`             | `SPEECH_MODEL` (low latency)      | Streamed sentence by sentence |

### Build-time narration

1. Each exhibit has a `narration` field written for the ear (rule 8 in [§8](#8-content-and-accuracy-rules)).
2. `tools/narrate` calls ElevenLabs text to speech **with timestamps**, producing audio plus character-level alignment.
3. Output files are named by a hash of narration text + voice ID + model ID + settings: `public/audio/<ID>.<hash>.mp3` and `<ID>.<hash>.align.json`. Only changed exhibits are regenerated.
4. A **pronunciation dictionary** lives in `packages/content/pronunciation` and covers at least: ENIAC, Colossus, Hollerith, Al-Khwarizmi, Dijkstra, Engelbart, Jacquard, Lovelace, Shor.

Exhibit record additions:

```json
"narration": "ENIAC was finished in 1945...",
"audio": {
  "src": "/audio/B2.3f9a1c.mp3",
  "align": "/audio/B2.3f9a1c.align.json",
  "voiceId": "...",
  "modelId": "eleven_multilingual_v2"
}
```

### Playback rules

- Clicking an exhibit starts narration together with the walk-to; the click is the user gesture that unlocks audio.
- Captions show on screen from the alignment file, highlighted as spoken.
- Controls: play/pause, mute (remembered), speed 1× / 1.25×.
- Narration stops when the portal closes or Next/Prev is pressed. Guide speech interrupts narration; the two never overlap.
- Narration is not spatialised. 3D positional audio is for ambience only.

### Live guide speech

`/api/speak` receives guide text, splits it into sentences, and streams ElevenLabs audio back as each sentence is ready. The key never leaves the server. Rate-limited with the guide.

### Voice licence

The chosen voice ID, its source (library or designed) and its licence terms are recorded in `docs/decisions/` before narration is generated. Rule 9 in [§0](#0-rules-for-every-contributor-human-or-agent) applies: no imitation of real people.

---

## 13. Roadmap

| Phase                    | Goal                                     | Done when                                                                                                                                               |
| ------------------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Prototype** ✅      | Prove the walk, the portals and the plan | Building, 12 built exhibits, scope and plan exist                                                                                                       |
| **2. Foundation + Core** | Real stack, complete story               | Stack in [§10](#10-production-stack) running; all 25 Core exhibits built to the [§7 contract](#7-exhibit-contract) with narration; guide v1 (text) live |
| **3. Extended**          | Depth                                    | Extended exhibits built in priority order                                                                                                               |
| **4. Polish**            | Ship quality                             | Guided tours, live voice guide, mobile controls pass, performance budget met                                                                            |

### Phase 2 order of work

1. Set up the monorepo and move the registry and plan into `packages/content` (`exhibits.json`, `plan.json`) with Zod schemas and the BLUEPRINT consistency check.
2. Port the plan generator into `tools/plan`; generate walls, navmesh and the 2D map.
3. Port the 12 built exhibits: one GLB and one portal package each.
4. Choose and license the museum voice; build `tools/narrate`; narrate the 12 built exhibits.
5. Guide v1: `/api/guide`, tools, evals. Text only.
6. Build **E3** (Engelbart's demo) first among Core: Wing E has nothing built.
7. Person-led Core exhibits next: **P5**, **C2**, **G1**.
8. Remaining Core exhibits, one wing at a time, each with narration.

### Open decisions

| #   | Question                                                                       | Default if undecided                                    |
| --- | ------------------------------------------------------------------------------ | ------------------------------------------------------- |
| 1   | Add CSIRAC (1949) and MESM (1951) to Wing B to widen geography?                | Add as Extended                                         |
| 2   | Add the Utah teapot (1975) to Wing E for graphics coverage?                    | Add as Extended                                         |
| 3   | Promote C5 (Hamilton, Apollo) to Core?                                         | Yes                                                     |
| 4   | Promote A5 (Dijkstra) to Core for a playable algorithms exhibit?               | Undecided                                               |
| 5   | Persist passport progress across sessions?                                     | Local only                                              |
| 6   | Live voice guide: Gemini Live's own voice, or Gemini text + ElevenLabs speech? | Gemini text + ElevenLabs (one consistent voice)         |
| 7   | Which museum voice (library or designed) and in which languages?               | One English library voice; more languages after Phase 2 |
| 8   | Add Google Search grounding to the guide, or collection-only answers?          | Collection-only in v1                                   |

---

## 14. Documentation conventions

### Header block (required at the top of every other `.md` file)

```markdown
> **Source of truth:** [BLUEPRINT.md](../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** B4, B5 <!-- registry IDs this file covers, or "none" -->
> **Status:** Draft | In review | Final
```

### Docs layout

```
docs/
  exhibits/<ID>.md         ← one per exhibit: research, sources, narration draft, portal spec, caveats
  zones/<code>.md          ← wing narrative and ordering notes
  decisions/NNNN-title.md  ← one file per decision (ADR style), including the voice licence
  agents/<role>.md         ← instructions for each agent role
  guide/                   ← guide prompt notes, eval questions, logged-question reviews
```

Code and data layout is in [§10](#10-production-stack). Machine-readable mirrors of this file: `packages/content/exhibits.json` (§6) and `packages/content/plan.json` (§5).

### Rules for agent files

- An agent may **read** any file but **writes** only the files its task names.
- If an agent finds a conflict with this BLUEPRINT, it stops and records it in `docs/decisions/` instead of guessing.
- Agent output that adds facts must include sources inline.
- The registry in §6 and `packages/content/exhibits.json` must always match. Any agent that changes one changes both in the same task.
- An agent that edits a `narration` field does not commit audio by hand; `tools/narrate` regenerates it in CI.
- Agents never read, print or write API keys.

---

## 15. Glossary

| Term           | Meaning                                                                           |
| -------------- | --------------------------------------------------------------------------------- |
| **Atrium**     | Central glass octagon; holds the Prologue                                         |
| **Band**       | One of three era depths inside a wing                                             |
| **Concourse**  | Walkway ring around the atrium; every wing opens off it                           |
| **Era bridge** | Door between neighbouring wings within the same band                              |
| **Guide**      | The Gemini-powered museum assistant that answers questions and acts through tools |
| **Narration**  | The spoken description of an exhibit, generated at build time in the museum voice |
| **Portal**     | The interactive that opens when a visitor engages an exhibit                      |
| **Tier**       | Built, Core, Extended or Open slot                                                |
| **Zone**       | A wing (A to F) or a gallery (P, G, S, X)                                         |

---

## 16. Changelog

| Version | Date       | Change                                                                                                                                                                                                              |
| ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.6     | 2026-10-04 | Guided demo tour (A1, B2, C3, E3, D7, F10) with push-to-talk questions; adds LISTEN_MODEL. |
| 1.5     | 2026-10-04 | Decision 0012: heritage museum art direction (panelled walls, coffered ceiling, stone, marble and parquet floors, brass vitrines), CC0 PBR textures, interim N8AO, web fonts via `next/font` matching §9. Plans 17 and 18 added. |
| 1.4     | 2026-10-04 | Compacted the museum: plan scale 0.07 to 0.042, building about 98 × 69 m to about 59 × 42 m, exhibits re-placed tighter while keeping the 2.4 m minimum spacing. |
| 1.1     | 2026-10-03 | Added production stack (§10), Gemini guide bot (§11), ElevenLabs narration voice (§12); rules 8 to 10 on keys, voices and model config; narration in the exhibit contract; Phase 2 reordered; open decisions 6 to 8 |
| 1.2     | 2026-10-04 | Built E3 (Engelbart's demo, 1968) per plan 13: tier Core to Built, portal and procedural object added. Built 12 to 13, Core 25 to 24; Wing E 0/4/4 to 1/3/4. New portal package `@museum/portal-e3`. |
| 1.3     | 2026-10-04 | Plan 16: enriched all Core and Extended exhibits with caption/stats/sources/narration; programmatic GLB models; realistic museum materials (3D floor tint retired, §4 note added). |
| 1.0     | 2026-10-03 | First source of truth: scope (76 + 1 slot), zones, building geometry, registry, exhibit contract, prototype architecture, roadmap                                                                                   |
