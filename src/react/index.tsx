import type { ReactNode } from 'react'
import type { CloseGuard, NamespaceSnapshot } from '../core/types.js'
import type { ModalContainerProps, ReactModalComponent, ReactModalCreateOptions, ReactModalHandle, ReactModalManager } from './types.js'

export type * from './types.js'

function stub(): never {
  throw new Error('not implemented')
}

export function createReactModal(_options?: ReactModalCreateOptions): ReactModalManager {
  return stub()
}

export function ModalProvider(_props: { manager: ReactModalManager; children?: ReactNode }): ReactNode {
  return stub()
}

export function ModalContainer(_props: ModalContainerProps): ReactNode {
  return stub()
}

export function useModal(): ReactModalManager {
  return stub()
}

export function useCurrentModal<R = unknown>(): ReactModalHandle<R> {
  return stub()
}

export function useBeforeModalClose(_guard: CloseGuard): void {
  stub()
}

export function useModalResolve<R = unknown>(): (value: R) => Promise<void> {
  return stub()
}

export function useModalSnapshot(_namespace?: string, _manager?: ReactModalManager): NamespaceSnapshot<ReactModalComponent> {
  return stub()
}
