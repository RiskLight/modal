import { nextTick, type App, type Component } from 'vue'
import { createModal, DEFAULT_NAMESPACE } from '../core/createModal.js'
import type { CloseGuard, ModalOptions, ModalTarget } from '../core/types.js'
import { MANAGER_KEY } from './keys.js'
import type { VueModalCreateOptions, VueModalManager, VueModalOptions } from './types.js'

function isCloseGuard(value: unknown): value is CloseGuard {
  return typeof value === 'function'
}

function componentGuard(component: Component): CloseGuard | undefined {
  if (typeof component !== 'object' && typeof component !== 'function') return undefined
  const guard: unknown = Reflect.get(component, 'beforeModalClose')
  return isCloseGuard(guard) ? guard : undefined
}

function toCoreOptions(options: VueModalOptions | undefined): ModalOptions<Component> | undefined {
  if (!options?.slots) return options
  const { slots, ...rest } = options
  return { ...rest, extra: { ...rest.extra, slots } }
}

async function rendered<T>(pending: Promise<T>): Promise<T> {
  const value = await pending
  await nextTick()
  return value
}

export function createVueModal(options: VueModalCreateOptions = {}): VueModalManager {
  const core = createModal<Component>({
    ...options,
    requireHost: options.requireHost ?? (namespace => namespace === DEFAULT_NAMESPACE),
    guardFrom: options.guardFrom ?? componentGuard,
  })
  const manager: VueModalManager = {
    ...core,
    core,
    open<R = unknown>(target: ModalTarget<Component>, props?: unknown, opts?: VueModalOptions) {
      return rendered(core.open<R>(target, props, toCoreOptions(opts)))
    },
    push<R = unknown>(target: ModalTarget<Component>, props?: unknown, opts?: VueModalOptions) {
      return rendered(core.push<R>(target, props, toCoreOptions(opts)))
    },
    prompt<R = unknown>(target: ModalTarget<Component>, props?: unknown, opts?: VueModalOptions) {
      return core.prompt<R>(target, props, toCoreOptions(opts))
    },
    install(app: App<Element>) {
      app.provide(MANAGER_KEY, manager)
      app.config.globalProperties.$modal = manager
    },
  }
  return manager
}
