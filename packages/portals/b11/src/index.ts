import { loadCopy } from './copy'
import { Portal } from './Portal'

const copy = loadCopy('B11')

export const id = 'B11'

export const meta = {
  id,
  title: copy.title,
  year: copy.year
}

export { Portal }
export type { PortalProps } from './Portal'

const portal = { id, meta, Portal }
export default portal
