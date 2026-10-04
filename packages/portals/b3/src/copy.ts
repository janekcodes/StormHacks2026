import file from '@museum/content/data/exhibits.json'

export interface ExhibitCopy {
  id: string
  title: string
  year: string
  caption: string
  stats: readonly { k: string; v: string }[]
}

export function loadCopy(id: string): ExhibitCopy {
  const row = file.exhibits.find((item) => item.id === id)
  if (!row || !row.caption || !row.stats || row.stats.length !== 3) {
    throw new Error(`Exhibit ${id} is missing caption or stats in exhibits.json`)
  }
  return {
    id: row.id,
    title: row.title,
    year: row.year,
    caption: row.caption,
    stats: row.stats.map((stat) => ({ k: stat.k, v: stat.v }))
  }
}
