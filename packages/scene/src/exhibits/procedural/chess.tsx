'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { canvasTexture } from '../../building/materials'
import { proceduralMaterials } from './materials'

function lathe(points: readonly (readonly [number, number])[]): THREE.LatheGeometry {
  return new THREE.LatheGeometry(
    points.map((p) => new THREE.Vector2(p[0], p[1])),
    40
  )
}

const PAWN = [
  [0, 0],
  [0.024, 0],
  [0.024, 0.008],
  [0.017, 0.014],
  [0.009, 0.048],
  [0.015, 0.052],
  [0, 0.054]
] as const

const KING = [
  [0, 0],
  [0.03, 0],
  [0.03, 0.01],
  [0.021, 0.018],
  [0.012, 0.085],
  [0.022, 0.092],
  [0.016, 0.1],
  [0.02, 0.112],
  [0, 0.115]
] as const

const ROOK = [
  [0, 0],
  [0.027, 0],
  [0.027, 0.01],
  [0.019, 0.018],
  [0.016, 0.06],
  [0.022, 0.064],
  [0.022, 0.082],
  [0, 0.082]
] as const

type PieceKind = 'pawn' | 'king' | 'rook'
type PieceMat = 'ivory' | 'ebony'
interface Piece {
  kind: PieceKind
  mat: PieceMat
  file: number
  rank: number
  extra?: 'head' | 'cross'
}

const PIECES: readonly Piece[] = [
  { kind: 'king', mat: 'ivory', file: 6, rank: 0, extra: 'cross' },
  { kind: 'rook', mat: 'ivory', file: 5, rank: 0 },
  { kind: 'pawn', mat: 'ivory', file: 5, rank: 1, extra: 'head' },
  { kind: 'pawn', mat: 'ivory', file: 6, rank: 1, extra: 'head' },
  { kind: 'pawn', mat: 'ivory', file: 4, rank: 3, extra: 'head' },
  { kind: 'pawn', mat: 'ivory', file: 7, rank: 2, extra: 'head' },
  { kind: 'king', mat: 'ebony', file: 6, rank: 7, extra: 'cross' },
  { kind: 'rook', mat: 'ebony', file: 3, rank: 7 },
  { kind: 'pawn', mat: 'ebony', file: 5, rank: 6, extra: 'head' },
  { kind: 'pawn', mat: 'ebony', file: 6, rank: 6, extra: 'head' },
  { kind: 'pawn', mat: 'ebony', file: 4, rank: 4, extra: 'head' },
  { kind: 'pawn', mat: 'ebony', file: 2, rank: 5, extra: 'head' }
]

function square(file: number, rank: number): [number, number] {
  return [-0.2275 + file * 0.065, 0.2275 - rank * 0.065]
}

export function ChessModel() {
  const M = proceduralMaterials()

  const boardTex = useMemo(
    () =>
      canvasTexture(512, 512, (g, w) => {
        const s = w / 8
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            g.fillStyle = (r + c) % 2 ? '#3b3f44' : '#e6e1d6'
            g.fillRect(c * s, r * s, s, s)
          }
        }
      }),
    []
  )
  const boardMat = useMemo(() => new THREE.MeshStandardMaterial({ map: boardTex, roughness: 0.35 }), [boardTex])

  const geos = useMemo(
    () => ({
      pawn: lathe(PAWN),
      king: lathe(KING),
      rook: lathe(ROOK),
      head: new THREE.SphereGeometry(0.016, 24, 16)
    }),
    []
  )

  return (
    <group>
      <mesh material={M.wood} position={[0, 0.025, 0]}>
        <boxGeometry args={[0.6, 0.05, 0.6]} />
      </mesh>
      <mesh material={boardMat} position={[0, 0.051, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.52, 0.52]} />
      </mesh>
      {PIECES.map((piece, i) => {
        const [x, z] = square(piece.file, piece.rank)
        const mat = piece.mat === 'ivory' ? M.ivory : M.ebony
        return (
          <group key={i} position={[x, 0.051, z]}>
            <mesh geometry={geos[piece.kind]} material={mat} />
            {piece.extra === 'head' && <mesh geometry={geos.head} material={mat} position={[0, 0.064, 0]} />}
            {piece.extra === 'cross' && (
              <>
                <mesh material={mat} position={[0, 0.128, 0]}>
                  <boxGeometry args={[0.008, 0.032, 0.008]} />
                </mesh>
                <mesh material={mat} position={[0, 0.132, 0]}>
                  <boxGeometry args={[0.024, 0.008, 0.008]} />
                </mesh>
              </>
            )}
          </group>
        )
      })}
    </group>
  )
}
