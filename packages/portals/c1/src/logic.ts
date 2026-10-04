export type ProgramId = 'A' | 'B'
export type Unit = 'ACC1' | 'ACC2' | 'ACC3' | 'ACC4' | 'MULT' | 'PRINT'

export interface Route {
  from: Unit
  to: Unit
}

export interface Program {
  id: ProgramId
  name: string
  aria: string
  description: string
  listing: string
  routes: readonly Route[]
}

export const PROGRAMS: Record<ProgramId, Program> = {
  A: {
    id: 'A',
    name: 'Program A wired',
    aria: 'Cables route ACC 1 and ACC 2 into ACC 3, then ACC 3 to PRINT',
    description:
      'Program A: ACC 1 and ACC 2 feed ACC 3, which sums them and sends the result to the printer. The data path is the cable path.',
    listing: 'LOAD  ACC1\nADD   ACC2\nSTORE ACC3\nPRINT ACC3',
    routes: [
      { from: 'ACC1', to: 'ACC3' },
      { from: 'ACC2', to: 'ACC3' },
      { from: 'ACC3', to: 'PRINT' }
    ]
  },
  B: {
    id: 'B',
    name: 'Program B wired',
    aria: 'Cables route ACC 1 and ACC 2 into MULT, MULT to ACC 4, then ACC 4 to PRINT',
    description:
      'Program B: both operands are routed to the multiplier, the product lands in ACC 4, then prints. Same machine, different wiring.',
    listing: 'LOAD  ACC1\nMUL   ACC2\nSTORE ACC4\nPRINT ACC4',
    routes: [
      { from: 'ACC1', to: 'MULT' },
      { from: 'ACC2', to: 'MULT' },
      { from: 'MULT', to: 'ACC4' },
      { from: 'ACC4', to: 'PRINT' }
    ]
  }
}

export function program(id: ProgramId): Program {
  return PROGRAMS[id]
}
