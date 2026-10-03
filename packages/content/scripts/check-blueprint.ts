import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { compareBlueprint, parseBlueprintTable } from '../src/blueprint-check'
import { ExhibitsFileSchema } from '../src/schema'

const root = (path: string) => fileURLToPath(new URL(path, import.meta.url))

function main() {
  const blueprintMarkdown = readFileSync(root('../../../BLUEPRINT.md'), 'utf8')
  const exhibitsRaw = readFileSync(root('../data/exhibits.json'), 'utf8')

  const { exhibits } = ExhibitsFileSchema.parse(JSON.parse(exhibitsRaw))
  const blueprintRows = parseBlueprintTable(blueprintMarkdown)

  const diffs = compareBlueprint(blueprintRows, exhibits)

  if (diffs.length > 0) {
    for (const diff of diffs) {
      console.error(
        `${diff.id}: ${diff.field} differs (BLUEPRINT: "${diff.blueprint}", data: "${diff.exhibits}")`
      )
    }
    console.error(`\n${diffs.length} difference(s) between BLUEPRINT.md and data/exhibits.json.`)
    process.exitCode = 1
    return
  }

  console.log(`Blueprint check passed: ${blueprintRows.length} exhibits match.`)
}

main()
