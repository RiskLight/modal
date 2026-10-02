import { defineComponent, type Component, type InjectionKey, type MaybeRefOrGetter, type ShallowRef } from 'vue'
import type { Router } from 'vue-router'
import type { CloseGuard, ModalHandle, ModalManager, NamespaceSnapshot } from '../core/types.js'
import type { ModalRouteOptions, VueModalCreateOptions, VueModalHandle, VueModalManager } from './types.js'

export type * from './types.js'

function stub(): never {
  throw new Error('not implemented')
}

export const MANAGER_KEY: InjectionKey<VueModalManager> = Symbol('risklight-modal-manager')
export const HANDLE_KEY: InjectionKey<ModalHandle<Component, unknown>> = Symbol('risklight-modal-handle')

export function createVueModal(_options?: VueModalCreateOptions): VueModalManager {
  return stub()
}

export function useModal(): VueModalManager {
  return stub()
}

export function useCurrentModal<R = unknown>(): VueModalHandle<R> {
  return stub()
}

export function onBeforeModalClose(_guard: CloseGuard): void {
  stub()
}

export function useModalResolve<R = unknown>(): (value: R) => Promise<void> {
  return stub()
}

export function useModalSnapshot(_namespace?: MaybeRefOrGetter<string | undefined>, _manager?: VueModalManager | ModalManager<Component>): Readonly<ShallowRef<NamespaceSnapshot<Component>>> {
  return stub()
}

export const ModalContainer = defineComponent({
  name: 'ModalContainer',
  setup() {
    return stub()
  },
})

export function createModalRoute(_component: Component, _options?: ModalRouteOptions): Component {
  return stub()
}

export function installModalRouter(_router: Router, _manager: VueModalManager): () => void {
  return stub()
}
