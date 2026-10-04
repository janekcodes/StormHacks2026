'use client'

import type { Building } from '@museum/content/plan-schema'
import type { Exhibit, ExhibitId, Tier } from '@museum/content/schema'
import type { MouseEvent as ReactMouseEvent } from 'react'
import { PLAN_HEIGHT_PX, PLAN_WIDTH_PX, fromSvg, toSvg } from './projection'
import { sortExhibitsForMap } from './sortExhibits'

export interface FloorMapPlayer {
  x: number
  z: number
  yaw: number
}

export interface FloorMapProps {
  building: Building
  exhibits: readonly Exhibit[]
  highlight?: readonly ExhibitId[]
  player?: FloorMapPlayer
  onSelect?: (id: ExhibitId) => void
  /** World-metre click on the floor (minimap travel). */
  onFloorClick?: (x: number, z: number) => void
  compact?: boolean
}

const GREY = '#9aa4ad'
const INK = '#1c2733'
const WALL = '#2b2b2b'
const GLASS = '#3b82c4'
const DASH = '#9aa4ad'

function tierLabel(tier: Tier): string {
  switch (tier) {
    case 'built':
      return 'Built'
    case 'core':
      return 'Core'
    case 'extended':
      return 'Extended'
    case 'open':
      return 'Open'
  }
}

function MarkerShape({
  tier,
  ink,
  x,
  y,
  highlighted
}: {
  tier: Tier
  ink: string
  x: number
  y: number
  highlighted: boolean
}) {
  const r = highlighted ? 6.5 : 5
  if (tier === 'built') {
    return <circle cx={x} cy={y} r={r} fill={ink} />
  }
  if (tier === 'core') {
    return <circle cx={x} cy={y} r={r} fill="none" stroke={ink} strokeWidth={3} />
  }
  if (tier === 'extended') {
    return (
      <circle
        cx={x}
        cy={y}
        r={r}
        fill="none"
        stroke={ink}
        strokeWidth={1.5}
        strokeDasharray="3 2"
      />
    )
  }
  return (
    <circle
      cx={x}
      cy={y}
      r={r}
      fill="none"
      stroke={GREY}
      strokeWidth={1.5}
      strokeDasharray="3 2"
    />
  )
}

export function FloorMap({
  building,
  exhibits,
  highlight,
  player,
  onSelect,
  onFloorClick,
  compact = false
}: FloorMapProps) {
  const ordered = sortExhibitsForMap(exhibits)
  const highlightSet = new Set(highlight ?? [])
  const playerPoint = player ? toSvg(player.x, player.z) : null

  const rooms = [...building.rooms].sort((a, b) => {
    const rank = (key: string) => (key === 'Conc' || key === 'Atr' ? 1 : 0)
    return rank(a.key) - rank(b.key)
  })

  const handleFloorPointer = (event: ReactMouseEvent<SVGSVGElement>) => {
    // Exhibit markers stop propagation; only bare floor clicks reach here.
    if (!onFloorClick) return
    const svg = event.currentTarget
    const pt = svg.createSVGPoint()
    pt.x = event.clientX
    pt.y = event.clientY
    const ctm = svg.getScreenCTM()
    if (!ctm) return
    const local = pt.matrixTransform(ctm.inverse())
    const world = fromSvg(local.x, local.y)
    onFloorClick(world.x, world.z)
  }

  return (
    <div className="floor-map" data-compact={compact ? 'true' : 'false'}>
      <style>{`
        .floor-map { width: 100%; max-width: 1000px; }
        .floor-map svg { display: block; width: 100%; height: auto; }
        .floor-map-marker {
          outline: none;
        }
        .floor-map-marker:focus-visible {
          outline: 2px solid ${INK};
          outline-offset: 3px;
        }
      `}</style>
      <svg
        role="group"
        aria-label="Museum floor plan"
        viewBox={`0 0 ${PLAN_WIDTH_PX} ${PLAN_HEIGHT_PX}`}
        xmlns="http://www.w3.org/2000/svg"
        onClick={onFloorClick ? handleFloorPointer : undefined}
        style={onFloorClick ? { cursor: 'crosshair' } : undefined}
      >
        <rect width={PLAN_WIDTH_PX} height={PLAN_HEIGHT_PX} fill="#ffffff" />

        <g style={{ pointerEvents: 'none' }}>
          {rooms.map((room) => {
            const points = room.poly
              .map(([x, z]) => {
                const p = toSvg(x, z)
                return `${p.x},${p.y}`
              })
              .join(' ')
            return (
              <polygon
                key={room.key}
                points={points}
                fill={room.tint}
                stroke={room.ink}
                strokeWidth={1.5}
                fillOpacity={0.85}
              />
            )
          })}

          {building.walls.map((wall, index) => {
            const [x1, z1, x2, z2] = wall
            if (Math.abs(x1 - x2) < 1e-9 && Math.abs(z1 - z2) < 1e-9) return null
            const a = toSvg(x1, z1)
            const b = toSvg(x2, z2)
            return (
              <line
                key={`w-${index}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={WALL}
                strokeWidth={2}
              />
            )
          })}

          {building.glass.map((seg, index) => {
            const a = toSvg(seg[0], seg[1])
            const b = toSvg(seg[2], seg[3])
            return (
              <line
                key={`g-${index}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={GLASS}
                strokeWidth={2.5}
              />
            )
          })}

          {building.dashes.map((seg, index) => {
            const a = toSvg(seg[0], seg[1])
            const b = toSvg(seg[2], seg[3])
            return (
              <line
                key={`d-${index}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={DASH}
                strokeWidth={1.5}
              />
            )
          })}

          {!compact &&
            building.marks.map((mark, index) => {
              const p = toSvg(mark.p[0], mark.p[1])
              return (
                <text
                  key={`m-${index}`}
                  x={p.x}
                  y={p.y}
                  fontSize={10}
                  fill="#5b6570"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {mark.t}
                </text>
              )
            })}

          {!compact &&
            building.signs.map((sign, index) => {
              const p = toSvg(sign.p[0], sign.p[1])
              return (
                <text
                  key={`s-${index}`}
                  x={p.x}
                  y={p.y}
                  fontSize={12}
                  fontWeight={700}
                  fill={INK}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {sign.k}
                </text>
              )
            })}
        </g>

        {ordered.map((exhibit) => {
          const p = toSvg(exhibit.position.x, exhibit.position.z)
          const ink = building.zones[exhibit.zone]?.ink ?? INK
          const highlighted = highlightSet.has(exhibit.id)
          const label = `${exhibit.id}, ${exhibit.year}, ${exhibit.title}, ${tierLabel(exhibit.tier)}`

          return (
            <a
              key={exhibit.id}
              href={`/exhibit/${exhibit.id}`}
              aria-label={label}
              className="floor-map-marker"
              data-exhibit-id={exhibit.id}
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation()
                if (onSelect) {
                  event.preventDefault()
                  onSelect(exhibit.id)
                }
              }}
            >
              {highlighted ? (
                <circle cx={p.x} cy={p.y} r={11} fill="none" stroke={ink} strokeWidth={2} />
              ) : null}
              <MarkerShape
                tier={exhibit.tier}
                ink={ink}
                x={p.x}
                y={p.y}
                highlighted={highlighted}
              />
              {/* Invisible hit target so nearby labels cannot steal clicks. */}
              <circle cx={p.x} cy={p.y} r={10} fill="transparent" />
              {!compact ? (
                <text
                  x={p.x}
                  y={p.y - 11}
                  fontSize={9}
                  fill={INK}
                  textAnchor="middle"
                  style={{ pointerEvents: 'none' }}
                >
                  {exhibit.id}
                </text>
              ) : null}
            </a>
          )
        })}

        {player && playerPoint ? (
          <g
            transform={`translate(${playerPoint.x} ${playerPoint.y}) rotate(${(player.yaw * 180) / Math.PI})`}
            aria-hidden="true"
          >
            <polygon points="0,-8 5,6 -5,6" fill={INK} />
          </g>
        ) : null}
      </svg>
    </div>
  )
}
