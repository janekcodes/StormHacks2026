import { loadCopy } from './copy'
import { Portal } from './Portal'

const copy = loadCopy('D7')

export const id = 'D7'

export const meta = {
  id,
  title: copy.title,
  year: copy.year
}

export { Portal }
export type { PortalProps } from './Portal'

const portal = { id, meta, Portal }
export default portal
