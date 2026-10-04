import { loadCopy } from './copy'
import { Portal } from './Portal'

const copy = loadCopy('C3')

export const id = 'C3'

export const meta = {
  id,
  title: copy.title,
  year: copy.year
}

export { Portal }
export type { PortalProps } from './Portal'

const portal = { id, meta, Portal }
export default portal
