import { useCallback, useContext, useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { ModalError } from '../core/errors.js'
import type { CloseGuard, ModalCloseEvent, NamespaceSnapshot } from '../core/types.js'
import { HandleContext, ManagerContext } from './context.js'
import type { ReactModalComponent, ReactModalHandle, ReactModalManager } from './types.js'

function noManager(): ModalError {
  return new ModalError('no-manager', 'No modal manager found. Wrap the app in <ModalProvider manager={createReactModal()}>')
}

export function useModal(): ReactModalManager {
  const manager = useContext(ManagerContext)
  if (!manager) throw noManager()
  return manager
}

export function useModalSnapshot(namespace?: string, manager?: ReactModalManager): NamespaceSnapshot<ReactModalComponent> {
  const provided = useContext(ManagerContext)
  const source = manager ?? provided
  if (!source) throw noManager()
  const read = () => source.getSnapshot(namespace)
  return useSyncExternalStore(source.subscribe, read, read)
}

export function useCurrentModal<R = unknown>(): ReactModalHandle<R> {
  const handle = useContext(HandleContext)
  if (!handle) throw new ModalError('outside-modal', 'This hook can only be used inside a component rendered as a modal')
  return handle as ReactModalHandle<R>
}

export function useBeforeModalClose(guard: CloseGuard): void {
  const handle = useCurrentModal()
  const latest = useRef(guard)
  useLayoutEffect(() => {
    latest.current = guard
  })
  useLayoutEffect(
    () =>
      handle.onBeforeClose(function (this: unknown, event: ModalCloseEvent) {
        return latest.current.call(this, event)
      }),
    [handle],
  )
}

export function useModalResolve<R = unknown>(): (value: R) => Promise<void> {
  const handle = useCurrentModal<R>()
  return useCallback((value: R) => handle.resolve(value), [handle])
}
