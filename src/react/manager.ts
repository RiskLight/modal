import { createModal, DEFAULT_NAMESPACE } from '../core/createModal.js'
import type { ReactModalComponent, ReactModalCreateOptions, ReactModalManager } from './types.js'

export function createReactModal(options: ReactModalCreateOptions = {}): ReactModalManager {
  const core = createModal<ReactModalComponent>({
    ...options,
    requireHost: options.requireHost ?? (namespace => namespace === DEFAULT_NAMESPACE),
  })
  return { ...core, core } as ReactModalManager
}
