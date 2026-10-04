import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PlanInputSchema,
  BuildingSchema,
  ExhibitsFileSchema
} from '@museum/content'
import { generate } from './generate'
import { renderSvg } from './svg'
import { buildNavmesh, buildStandpoints } from './navmesh'

// tools/plan/src/cli.ts -> repo root
const root = fileURLToPath(new URL('../../..', import.meta.url))

const planPath = join(root, 'packages/content/data/plan.json')
const exhibitsPath = join(root, 'packages/content/data/exhibits.json')
const outDir = join(root, 'packages/content/generated')
const buildingPath = join(outDir, 'building.json')
const svgPath = join(outDir, 'plan.svg')
const navmeshPath = join(outDir, 'navmesh.bin')
const standpointsPath = join(outDir, 'standpoints.json')
const publicNavmeshPath = join(root, 'apps/web/public/navmesh.bin')

const plan = PlanInputSchema.parse(JSON.parse(readFileSync(planPath, 'utf8')))
const building = BuildingSchema.parse(generate(plan))
const exhibitsFile = ExhibitsFileSchema.parse(JSON.parse(readFileSync(exhibitsPath, 'utf8')))

mkdirSync(outDir, { recursive: true })
mkdirSync(join(root, 'apps/web/public'), { recursive: true })

writeFileSync(buildingPath, JSON.stringify(building, null, 2) + '\n')
writeFileSync(svgPath, renderSvg(building) + '\n')

const { bytes, query } = await buildNavmesh(building)
writeFileSync(navmeshPath, bytes)
writeFileSync(publicNavmeshPath, bytes)

const standpoints = buildStandpoints(query, building, exhibitsFile.exhibits)
writeFileSync(standpointsPath, JSON.stringify(standpoints, null, 2) + '\n')

console.log(`wrote ${buildingPath} (${building.walls.length} walls, ${building.rooms.length} rooms)`)
console.log(`wrote ${svgPath}`)
console.log(`wrote ${navmeshPath} (${bytes.byteLength} bytes)`)
console.log(`wrote ${standpointsPath} (${Object.keys(standpoints.exhibits).length} exhibits, ${Object.keys(standpoints.rooms).length} rooms)`)
console.log(`wrote ${publicNavmeshPath}`)
