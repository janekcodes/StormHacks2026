import { loadCopy } from './copy'
import { Portal } from './Portal'

const copy = loadCopy('C1')

export const id = 'C1'

export const meta = {
  id,
  title: copy.title,
  year: copy.year
}

export { Portal }
export type { PortalProps } from './Portal'

const portal = { id, meta, Portal }
export default portal
