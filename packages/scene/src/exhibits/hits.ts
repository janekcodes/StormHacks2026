import type { Mesh } from 'three'

const hits: Mesh[] = []

export function registerHit(mesh: Mesh): () => void {
  hits.push(mesh)
  return () => {
    const index = hits.indexOf(mesh)
    if (index >= 0) hits.splice(index, 1)
  }
}

export function getHits(): readonly Mesh[] {
  return hits
}
