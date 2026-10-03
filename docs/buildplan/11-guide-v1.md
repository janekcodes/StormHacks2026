> **Source of truth:** [BLUEPRINT.md](../../BLUEPRINT.md) · Scope v1.1
> **Exhibits:** all (as context)
> **Status:** Ready
> **Depends on:** 06, 07

# 11 · Guide v1 (text)

## Goal

A text guide panel in the museum, powered by Gemini through a server route, that answers from museum content, cites exhibit IDs, and acts through validated tools (walk, open, highlight, tour). Covered by an eval suite in CI.

## Read first

- BLUEPRINT §0 rules 8 and 10, §8 rule 9, §11 (all of it), §13 open decision 8
- Google Gen AI SDK for JavaScript (`@google/genai`) docs: streaming, function calling, structured output, context caching. Check the current API surface before coding.

## Deliverables

```
packages/guide/src/systemPrompt.ts     persona + rules (BLUEPRINT §11) + compact registry
packages/guide/src/context.ts          buildContext(visitor, exhibitsDetail)
packages/guide/src/tools.ts            tool declarations + Zod schemas for arguments
packages/guide/src/validate.ts         validateToolCall(call) → ok | error message for the model
packages/guide/evals/questions.json    ~40 golden questions
packages/guide/evals/run.ts            eval runner
apps/web/app/api/guide/route.ts        POST, streaming, server-only key, rate limited
packages/scene/src/guide/GuidePanel.tsx   chat UI, streaming text, tool execution
packages/scene/src/guide/executor.ts      runs validated tools via the scene API from 06/07
```

## Steps

1. **System prompt** = BLUEPRINT §11 rules verbatim + a compact line per exhibit (`ID | year | title | zone | band | tier`), generated from `@museum/content`. Mark it cacheable.
2. **Per-request context:** visitor room, nearest exhibit, open portal, visited IDs, plus full content (caption, stats, sources, caveat) for the open or nearest exhibit only. No vector store.
3. **Tools:** `walkTo(exhibitId)`, `openPortal(exhibitId)`, `highlight(exhibitIds[])`, `startTour(title, exhibitIds[2..8])`, `getVisitorContext()`. Argument schemas use the `ExhibitId` enum from 02.
4. **Validation:** every call is checked before execution. Unknown IDs, planned exhibits passed to `openPortal` when the visitor expects a demo, or tours over 8 stops are rejected and the error is returned to the model as the tool result.
5. **Route:** reads `GEMINI_API_KEY` and `GUIDE_MODEL` from env; streams text and tool calls; per-session rate limit (Upstash or KV) and max output length; logs question text only, no IP or user ID.
6. **Panel:** opens from the HUD and from an "Ask the guide" button in every portal (pre-seeded with that exhibit). Clearly labelled "AI guide". Streaming text; tool actions shown as small chips ("Walking to B4").
7. **Evals:** each golden question has `expectFacts[]`, `expectCitations[]`, optional `expectTool`. Runner scores pass/fail; CI job runs nightly and on changes to `packages/guide` or `GUIDE_MODEL`. Start with at least:
   - "Who programmed ENIAC?" → cites C1 and G1
   - "Show me the transistor" → `walkTo('B3')`
   - "Is the Turing test on display?" → says F1 is planned
   - "Give me a tour of AI and hardware" → valid `startTour` with IDs from wings B and F
   - "What's the weather?" → polite redirect, no tool call
8. Decision 8 (search grounding) defaults to **off** in v1; do not add it.

## Acceptance criteria

- [ ] Eval pass rate ≥ 90%, and 100% of tool calls in evals use valid IDs.
- [ ] Key never reaches the client (CI grep on build output).
- [ ] Rate limit returns a friendly message, not an error page.
- [ ] Every answer that states a museum fact cites at least one exhibit ID (checked in evals).
- [ ] Guide works in 2D mode too (`/exhibits` and `/exhibit/[id]`), where `walkTo` becomes a link.

## Out of scope

Speech (12), Gemini Live, search grounding, accounts.

## Verify

```bash
pnpm --filter @museum/guide test
GEMINI_API_KEY=... pnpm --filter @museum/guide eval
pnpm --filter web test:e2e -- guide.spec.ts   # with a mocked route
```

## Handoff

Commit the eval report. Note the model ID used and its pass rate in `docs/guide/`.
