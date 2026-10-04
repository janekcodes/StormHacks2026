import type { ComponentType } from 'react'
import type { ExhibitId } from '@museum/content/schema'
import { CardModel } from './card'
import { ChalkModel } from './chalk'
import { ChessModel } from './chess'
import { EniacModel } from './eniac'
import { HtmlModel } from './html'
import { MouseModel } from './mouse'
import { NextModel } from './next'
import { PlugModel } from './plug'
import { RackModel } from './rack'
import { TowerModel } from './tower'
import { TransformerModel } from './transformer'
import { TransistorModel } from './transistor'
import { TuringModel } from './turing'

/**
 * Interim procedural models for the 12 built exhibits, ported from the
 * prototype. The mapping is by exhibit ID so plan 13 can replace any single
 * entry with a GLB without touching the others.
 */
export const PROCEDURAL_MODELS: Partial<Record<ExhibitId, ComponentType>> = {
  A1: TuringModel,
  B2: EniacModel,
  B3: TransistorModel,
  B11: RackModel,
  C1: PlugModel,
  C3: CardModel,
  C10: TowerModel,
  D6: NextModel,
  D7: HtmlModel,
  E3: MouseModel,
  F2: ChalkModel,
  F7: ChessModel,
  F10: TransformerModel
}
