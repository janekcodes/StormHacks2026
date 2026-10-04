import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { exhibits, scopeVersion } from '@museum/content'
import {
  buildSystemPrompt,
  createGuideClient,
  validateToolCall,
  type GuideMessage,
  type ToolCall
} from '../src/index'

// packages/guide/evals/run.ts -> repo root
const root = fileURLToPath(new URL('../../..', import.meta.url))
const questionsPath = join(root, 'packages/guide/evals/questions.json')
const reportPath = join(root, 'docs/guide/report.md')

interface EvalQuestion {
  question: string
  expectFacts: string[]
  expectCitations: string[]
  expectTool?: { name: string; args?: Record<string, unknown> }
  expectNoTool?: boolean
}

const questions = JSON.parse(readFileSync(questionsPath, 'utf8')) as EvalQuestion[]

/** Parse `--only <ID>` / `--only=<ID>` (plan 13 verify: `eval -- --only E3`). */
function parseOnly(argv: string[]): string | null {
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] ?? ''
    if (arg === '--only') {
      const value = argv[i + 1]
      if (value !== undefined) return value
      i += 1
    } else if (arg.startsWith('--only=')) {
      return arg.slice('--only='.length)
    }
  }
  return null
}

const onlyId = parseOnly(process.argv.slice(2))
const selected = onlyId
  ? questions.filter((q) =>
      q.expectCitations.some((id) => id.toUpperCase() === onlyId.toUpperCase())
    )
  : questions

if (onlyId && selected.length === 0) {
  throw new Error(`no golden questions matched --only ${onlyId}`)
}

const apiKey = process.env.GEMINI_API_KEY
const model = process.env.GUIDE_MODEL
if (!apiKey) {
  throw new Error('missing GEMINI_API_KEY; set it before running the eval')
}
if (!model) {
  throw new Error('missing GUIDE_MODEL; set it before running the eval')
}

const builtIds = new Set(exhibits.filter((exhibit) => exhibit.tier === 'built').map((exhibit) => exhibit.id))
const systemInstruction = buildSystemPrompt(exhibits, scopeVersion)
const client = createGuideClient({ apiKey, model, systemInstruction })

const MAX_TURNS = 6

interface RunResult {
  text: string
  toolCalls: ToolCall[]
}

async function runQuestion(question: string): Promise<RunResult> {
  const messages: GuideMessage[] = [{ role: 'user', text: question }]
  let text = ''
  const toolCalls: ToolCall[] = []
  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const result = await client.runTurn(messages)
    text += (text.length > 0 && result.text ? '\n' : '') + result.text
    const calls = result.toolCalls
    toolCalls.push(...calls)
    if (calls.length === 0) break

    const toolResponses = calls.map((call) => ({
      id: call.id,
      name: call.name,
      result: { ok: true, message: 'executed in the browser' }
    }))
    messages.push({ role: 'assistant', text: result.text, toolCalls: calls })
    messages.push({ role: 'tool', toolResponses })
  }
  return { text, toolCalls }
}

function argsMatch(actual: Record<string, unknown>, expected: Record<string, unknown>): boolean {
  for (const [key, value] of Object.entries(expected)) {
    if (JSON.stringify(actual[key]) !== JSON.stringify(value)) return false
  }
  return true
}

interface Score {
  pass: boolean
  failures: string[]
}

function scoreQuestion(question: EvalQuestion, result: RunResult): Score {
  const failures: string[] = []
  const lower = result.text.toLowerCase()
  for (const fact of question.expectFacts) {
    if (!lower.includes(fact.toLowerCase())) failures.push(`missing fact "${fact}"`)
  }
  for (const id of question.expectCitations) {
    if (!new RegExp(`\\b${id}\\b`).test(result.text)) failures.push(`missing citation "${id}"`)
  }
  if (question.expectTool) {
    const matched = result.toolCalls.some(
      (call) =>
        call.name === question.expectTool?.name &&
        (!question.expectTool.args || argsMatch(call.args, question.expectTool.args))
    )
    if (!matched) failures.push(`missing tool call "${question.expectTool.name}"`)
  }
  if (question.expectNoTool && result.toolCalls.length > 0) {
    failures.push('unexpected tool call')
  }
  return { pass: failures.length === 0, failures }
}

async function main(): Promise<void> {
  const results: string[] = []
  let passCount = 0
  let invalidToolCalls = 0
  const invalidDetails: string[] = []

  for (const question of selected) {
    const result = await runQuestion(question.question)

    for (const call of result.toolCalls) {
      const validation = validateToolCall(call, { builtIds })
      if (!validation.ok) {
        invalidToolCalls += 1
        invalidDetails.push(`${question.question}: ${validation.error}`)
      }
    }

    const score = scoreQuestion(question, result)
    if (score.pass) passCount += 1
    const status = score.pass ? 'PASS' : 'FAIL'
    results.push(`${status} | ${question.question}`)
    for (const failure of score.failures) {
      results.push(`      ${failure}`)
    }
  }

  const passRate = ((passCount / selected.length) * 100).toFixed(1)
  const allIdsValid = invalidToolCalls === 0

  const body = [...results]
  if (invalidDetails.length > 0) {
    body.push('', '## Invalid tool calls', ...invalidDetails)
  }

  const summary = [
    `# Guide v1 eval report`,
    ``,
    `Model: ${model}`,
    ...(onlyId ? [`Filter: only exhibit ${onlyId}`] : []),
    `Pass rate: ${passCount}/${selected.length} (${passRate}%)`,
    `Tool calls with valid IDs: ${allIdsValid ? '100%' : `${invalidToolCalls} invalid`}`,
    ``,
    `## Results`,
    ...body
  ].join('\n')

  console.log(summary)

  mkdirSync(join(root, 'docs/guide'), { recursive: true })
  writeFileSync(reportPath, summary + '\n')

  if (passRate !== '100.0' && Number(passRate) < 90) {
    console.error(`\nEval failed: pass rate ${passRate}% is below the 90% threshold.`)
    process.exitCode = 1
  }
  if (!allIdsValid) {
    console.error('\nEval failed: not all tool calls used valid exhibit IDs.')
    process.exitCode = 1
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
})
