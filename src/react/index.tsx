import type { ReactNode } from 'react'
import { ManagerContext } from './context.js'
import type { ReactModalManager } from './types.js'

export { createReactModal } from './manager.js'
export { ModalContainer } from './container.js'
export { useModal, useCurrentModal, useBeforeModalClose, useModalResolve, useModalSnapshot } from './hooks.js'
export type * from './types.js'

export function ModalProvider({ manager, children }: { manager: ReactModalManager; children?: ReactNode }) {
  return <ManagerContext.Provider value={manager}>{children}</ManagerContext.Provider>
}
