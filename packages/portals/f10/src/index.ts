import { loadCopy } from './copy'
import { Portal } from './Portal'

const copy = loadCopy('F10')

export const id = 'F10'

export const meta = {
  id,
  title: copy.title,
  year: copy.year
}

export { Portal }
export type { PortalProps } from './Portal'

const portal = { id, meta, Portal }
export default portal
