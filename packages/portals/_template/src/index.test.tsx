import { describe, expect, it } from 'vitest'
import portal, { Portal, id, meta } from './index'

describe('portal template contract', () => {
  it('exports id, meta and Portal', () => {
    expect(portal.id).toBe(id)
    expect(portal.meta).toBe(meta)
    expect(typeof portal.Portal).toBe('function')
    expect(typeof Portal).toBe('function')
    expect(meta.title).toBe('Portal template')
  })
})
