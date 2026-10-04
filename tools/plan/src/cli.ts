import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PlanInputSchema, BuildingSchema } from '@museum/content'
import { generate } from './generate'
import { renderSvg } from './svg'

// tools/plan/src/cli.ts -> repo root
const root = fileURLToPath(new URL('../../..', import.meta.url))

const planPath = join(root, 'packages/content/data/plan.json')
const outDir = join(root, 'packages/content/generated')
const buildingPath = join(outDir, 'building.json')
const svgPath = join(outDir, 'plan.svg')

const plan = PlanInputSchema.parse(JSON.parse(readFileSync(planPath, 'utf8')))
const building = BuildingSchema.parse(generate(plan))

mkdirSync(outDir, { recursive: true })
writeFileSync(buildingPath, JSON.stringify(building, null, 2) + '\n')
writeFileSync(svgPath, renderSvg(building) + '\n')

console.log(`wrote ${buildingPath} (${building.walls.length} walls, ${building.rooms.length} rooms)`)
console.log(`wrote ${svgPath}`)
