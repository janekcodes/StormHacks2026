import { NodeIO, type Document } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { dedup, meshopt, prune, weld } from '@gltf-transform/functions'
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * Model budgets from BLUEPRINT section 10 and the plan 09 model spec:
 * one GLB per exhibit object, <= 30k triangles, <= 1.5 MB, textures <= 2048 px.
 */
export interface ModelLimits {
  maxTriangles: number
  maxBytes: number
  maxTextureSize: number
}

export const DEFAULT_LIMITS: ModelLimits = {
  maxTriangles: 30_000,
  maxBytes: 1_500_000,
  maxTextureSize: 2048
}

/** Count rendered triangles across every mesh primitive in the document. */
export function countTriangles(doc: Document): number {
  let triangles = 0
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices()
      const positions = prim.getAttribute('POSITION')
      const count = indices ? indices.getCount() : positions ? positions.getCount() : 0
      triangles += Math.floor(count / 3)
    }
  }
  return triangles
}

/** Largest texture edge in pixels, or 0 when no texture reports a size. */
export function maxTextureEdge(doc: Document): number {
  let max = 0
  for (const texture of doc.getRoot().listTextures()) {
    const size = texture.getSize()
    if (!size) continue
    max = Math.max(max, size[0], size[1])
  }
  return max
}

/** Throw a clear, human-readable error when a model exceeds any budget. */
export function assertWithinBudget(
  id: string,
  triangles: number,
  bytes: number,
  textureEdge: number,
  limits: ModelLimits = DEFAULT_LIMITS
): void {
  if (triangles > limits.maxTriangles) {
    throw new Error(
      `${id}: ${triangles} triangles exceeds the ${limits.maxTriangles} triangle budget. ` +
        'Simplify the mesh or split it across multiple LODs before committing.'
    )
  }
  if (textureEdge > limits.maxTextureSize) {
    throw new Error(
      `${id}: a ${textureEdge}px texture exceeds the ${limits.maxTextureSize}px limit. ` +
        'Resize it to 2048px or less (KTX2/WebP).'
    )
  }
  if (bytes > limits.maxBytes) {
    throw new Error(
      `${id}: ${bytes} bytes exceeds the ${limits.maxBytes} byte budget. ` +
        'Reduce texture resolution, simplify geometry, or tighten the meshopt level.'
    )
  }
}

/**
 * Read, validate and optimise one GLB. `source` is `assets/out/<ID>.glb`;
 * `target` is `apps/web/public/models/<ID>.glb`. Returns the result or throws
 * a descriptive error for an over-budget model.
 */
export async function optimizeGlb(
  id: string,
  source: string,
  target: string,
  limits: ModelLimits = DEFAULT_LIMITS
): Promise<{ id: string; triangles: number; bytes: number }> {
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder })
  const doc = await io.read(source)

  const triangles = countTriangles(doc)
  const textureEdge = maxTextureEdge(doc)
  assertWithinBudget(id, triangles, 0, textureEdge, limits)

  await MeshoptEncoder.ready
  await doc.transform(
    dedup(),
    prune(),
    weld(),
    // Meshopt decodes in the browser via the bundled three-stdlib decoder,
    // so no decoder CDN is needed at runtime. KTX2 texture encoding is added
    // alongside the real assets in plan 13 (no textures ship in this plan).
    meshopt({ encoder: MeshoptEncoder, level: 'high' })
  )

  const bytes = await io.writeBinary(doc)
  assertWithinBudget(id, triangles, bytes.byteLength, textureEdge, limits)

  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, bytes)

  return { id, triangles, bytes: bytes.byteLength }
}

/** Read a GLB file into a document (used by tests to inspect fixtures). */
export async function readGlb(source: string): Promise<Document> {
  await MeshoptDecoder.ready
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.decoder': MeshoptDecoder })
  return io.read(source)
}
