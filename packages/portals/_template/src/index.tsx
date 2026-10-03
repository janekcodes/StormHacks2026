import type { ReactElement } from 'react'

export interface PortalProps {
  onClose(): void
}

export interface PortalMeta {
  id: string
  title: string
  year: string
}

// Placeholder identifier. Real portals use an exhibit ID from BLUEPRINT section 6.
export const id = '__template__'

export const meta: PortalMeta = {
  id,
  title: 'Portal template',
  year: ''
}

export function Portal({ onClose }: PortalProps): ReactElement {
  return (
    <button type="button" onClick={onClose}>
      Close template portal
    </button>
  )
}

export default { id, meta, Portal }
