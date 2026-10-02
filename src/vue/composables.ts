import {
  getCurrentScope,
  hasInjectionContext,
  inject,
  isRef,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
  type Component,
  type MaybeRefOrGetter,
  type ShallowRef,
} from 'vue'
import { ModalError } from '../core/errors.js'
import type { CloseGuard, ModalManager, NamespaceSnapshot } from '../core/types.js'
import { HANDLE_KEY, MANAGER_KEY } from './keys.js'
import type { VueModalHandle, VueModalManager } from './types.js'

type SnapshotSource = Pick<ModalManager<Component>, 'getSnapshot' | 'subscribe'>

export function useModal(): VueModalManager {
  const manager = hasInjectionContext() ? inject(MANAGER_KEY, null) : null
  if (!manager) throw new ModalError('no-manager', 'No modal manager found. Install it with app.use(createVueModal())')
  return manager
}

export function useCurrentModal<R = unknown>(): VueModalHandle<R> {
  const handle = hasInjectionContext() ? inject(HANDLE_KEY, null) : null
  if (!handle) throw new ModalError('outside-modal', 'This composable can only be used inside a component rendered as a modal')
  return handle as VueModalHandle<R>
}

export function onBeforeModalClose(guard: CloseGuard): void {
  const off = useCurrentModal().onBeforeClose(guard)
  if (getCurrentScope()) onScopeDispose(off)
}

export function useModalResolve<R = unknown>(): (value: R) => Promise<void> {
  const handle = useCurrentModal<R>()
  return value => handle.resolve(value)
}

export function useModalSnapshot(
  namespace?: MaybeRefOrGetter<string | undefined>,
  manager?: SnapshotSource,
): Readonly<ShallowRef<NamespaceSnapshot<Component>>> {
  const source = manager ?? useModal()
  const snapshot = shallowRef(source.getSnapshot(toValue(namespace)))
  const update = () => {
    snapshot.value = source.getSnapshot(toValue(namespace))
  }
  if (typeof window === 'undefined') return snapshot
  const off = source.subscribe(update)
  if (isRef(namespace) || typeof namespace === 'function') watch(() => toValue(namespace), update)
  if (getCurrentScope()) onScopeDispose(off)
  return snapshot
}
