import type { Building } from '@museum/content'

const S = 10 // px per metre

function xy(x: number, z: number): [string, string] {
  return [((x + 50) * S).toFixed(2), ((z + 32) * S).toFixed(2)]
}

function polyPoints(poly: [number, number][]): string {
  return poly.map(([x, z]) => xy(x, z).join(' ')).join(' ')
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function lineEl(x1: number, z1: number, x2: number, z2: number, stroke: string, width: number): string {
  const [ax, az] = xy(x1, z1)
  const [bx, bz] = xy(x2, z2)
  return `<line x1="${ax}" y1="${az}" x2="${bx}" y2="${bz}" stroke="${stroke}" stroke-width="${width}"/>`
}

export function renderSvg(building: Building): string {
  const parts: string[] = []
  const w = 100 * S
  const h = 70.5 * S
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`)
  parts.push(`<rect width="${w}" height="${h}" fill="#ffffff"/>`)

  // rooms (Concourse and Atrium last, so they sit on top)
  const order = [...building.rooms].sort((a, b) => {
    const rank = (k: string) => (k === 'Conc' || k === 'Atr' ? 1 : 0)
    return rank(a.key) - rank(b.key)
  })
  for (const room of order) {
    parts.push(
      `<polygon points="${polyPoints(room.poly)}" fill="${room.tint}" stroke="${room.ink}" stroke-width="1.5" fill-opacity="0.85"/>`
    )
  }

  // walls
  for (const w of building.walls) {
    const [x1, z1, x2, z2] = w
    if (Math.abs(x1 - x2) < 1e-9 && Math.abs(z1 - z2) < 1e-9) continue
    parts.push(lineEl(x1, z1, x2, z2, '#2b2b2b', 2))
  }

  // atrium glass
  for (const g of building.glass) {
    parts.push(lineEl(g[0], g[1], g[2], g[3], '#3b82c4', 2.5))
  }

  // era dashes
  for (const d of building.dashes) {
    parts.push(lineEl(d[0], d[1], d[2], d[3], '#9aa4ad', 1.5))
  }

  // year marks
  for (const m of building.marks) {
    const [x, z] = m.p
    const [mx, mz] = xy(x, z)
    parts.push(
      `<text x="${mx}" y="${mz}" font-size="10" fill="#5b6570" text-anchor="middle" dominant-baseline="middle">${esc(m.t)}</text>`
    )
  }

  // wing signs
  for (const s of building.signs) {
    const [x, z] = s.p
    const [sx, sz] = xy(x, z)
    parts.push(
      `<text x="${sx}" y="${sz}" font-size="12" font-weight="700" fill="#1c2733" text-anchor="middle" dominant-baseline="middle">${esc(s.k)}</text>`
    )
  }

  parts.push('</svg>')
  return parts.join('\n')
}
