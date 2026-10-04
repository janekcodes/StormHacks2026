import type { Building } from '@museum/content/plan-schema'
import { tierLabel, type Exhibit, type Tier } from '@museum/content/schema'

const TIERS: readonly Tier[] = ['built', 'core', 'extended', 'open']

const TIER_NOTE: Record<Tier, string> = {
  built: 'on display, portal open',
  core: 'planned',
  extended: 'planned, later',
  open: 'reserved slot'
}

function TierSymbol({ tier }: { tier: Tier }) {
  const common = { cx: 9, cy: 9, r: 5.5 }
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      {tier === 'built' ? <circle {...common} fill="currentColor" /> : null}
      {tier === 'core' ? <circle {...common} fill="none" stroke="currentColor" strokeWidth={3} /> : null}
      {tier === 'extended' ? (
        <circle {...common} fill="none" stroke="currentColor" strokeWidth={1.5} strokeDasharray="3 2" />
      ) : null}
      {tier === 'open' ? (
        <circle {...common} fill="none" stroke="currentColor" strokeWidth={1.5} strokeDasharray="3 2" opacity={0.6} />
      ) : null}
    </svg>
  )
}

/** Static key for the floor plan. It holds no focusable elements by design. */
export function FloorMapLegend({ building, exhibits }: { building: Building; exhibits: readonly Exhibit[] }) {
  const counts = new Map<Tier, number>()
  for (const exhibit of exhibits) counts.set(exhibit.tier, (counts.get(exhibit.tier) ?? 0) + 1)
  const zones = Object.entries(building.zones).filter(([code]) => exhibits.some((e) => e.zone === code))

  return (
    <div className="floor-map-legend">
      <div>
        <h2 className="kicker">Markers</h2>
        <ul className="floor-map-legend-list">
          {TIERS.filter((tier) => counts.has(tier)).map((tier) => (
            <li key={tier}>
              <TierSymbol tier={tier} />
              <span>
                <strong>{tierLabel(tier)}</strong> {TIER_NOTE[tier]}
              </span>
              <span className="floor-map-legend-count">{counts.get(tier)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h2 className="kicker">Galleries</h2>
        <ul className="floor-map-legend-list floor-map-legend-zones">
          {zones.map(([code, zone]) => (
            <li key={code}>
              <span className="floor-map-legend-swatch" style={{ background: zone.ink }} aria-hidden="true" />
              <span>
                <strong>{code}</strong> {zone.name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
