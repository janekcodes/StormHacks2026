'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { canvasTexture } from '../../building/materials'
import { proceduralMaterials } from './materials'

const HTML_LINES: readonly (readonly [string, string])[] = [
  ['#7fd1ff', '<TITLE>'],
  ['#e4eaf0', '  The World Wide Web project'],
  ['#7fd1ff', '</TITLE>'],
  ['#7fd1ff', '<H1>'],
  ['#e4eaf0', '  World Wide Web'],
  ['#7fd1ff', '</H1>'],
  ['#e4eaf0', 'The WorldWideWeb (W3) is a'],
  ['#e4eaf0', 'wide-area <A HREF="WhatIs.html">'],
  ['#e4eaf0', 'hypermedia</A> information'],
  ['#e4eaf0', 'retrieval initiative...'],
  ['#7fd1ff', '<UL>'],
  ['#e4eaf0', '  <LI><A HREF="...">Help</A>'],
  ['#7fd1ff', '</UL>']
]

export function HtmlModel() {
  const M = proceduralMaterials()

  const htmlTex = useMemo(
    () =>
      canvasTexture(1000, 1380, (g) => {
        g.fillStyle = '#0c0e10'
        g.fillRect(0, 0, 1000, 1380)
        g.fillStyle = '#E4EAF0'
        g.font = '700 84px "Chakra Petch", sans-serif'
        g.fillText('HTML 1.0', 70, 140)
        g.fillStyle = '#9aa3ac'
        g.font = '40px "IBM Plex Mono", monospace'
        g.fillText('CERN · 1991 · ~18 elements', 70, 210)
        g.font = '44px "IBM Plex Mono", monospace'
        let y = 330
        for (const [color, text] of HTML_LINES) {
          g.fillStyle = color
          g.fillText(text, 70, y)
          y += 70
        }
        g.fillStyle = '#ffb347'
        g.font = '40px "IBM Plex Mono", monospace'
        g.fillText('GET /hypertext/WWW/TheProject.html', 70, 1300)
      }),
    []
  )
  const faceMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: htmlTex,
        emissiveMap: htmlTex,
        emissive: 0xffffff,
        emissiveIntensity: 0.9,
        roughness: 0.3
      }),
    [htmlTex]
  )

  return (
    <group>
      <mesh material={M.blackMatte} position={[0, 0.025, 0]}>
        <boxGeometry args={[0.5, 0.05, 0.36]} />
      </mesh>
      <mesh material={M.brushed} position={[0, 0.2, 0]}>
        <boxGeometry args={[0.06, 0.3, 0.06]} />
      </mesh>
      <mesh material={M.brushed} position={[0, 1.25, 0]}>
        <boxGeometry args={[1.3, 1.8, 0.07]} />
      </mesh>
      <mesh material={faceMat} position={[0, 1.25, 0.037]}>
        <planeGeometry args={[1.2, 1.7]} />
      </mesh>
    </group>
  )
}
