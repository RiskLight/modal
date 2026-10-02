import { nextTick, type App, type Component } from 'vue'
import { createModal, DEFAULT_NAMESPACE } from '../core/createModal.js'
import type { CloseGuard, ModalOptions, ModalTarget } from '../core/types.js'
import { MANAGER_KEY } from './keys.js'
import type { VueModalCreateOptions, VueModalHandle, VueModalManager, VueModalOptions } from './types.js'

function componentGuard(component: Component): CloseGuard | undefined {
  const guard = (component as { beforeModalClose?: unknown }).beforeModalClose
  return typeof guard === 'function' ? (guard as CloseGuard) : undefined
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
  const manager = {
    ...core,
    core,
    open(target: ModalTarget<Component>, props?: unknown, opts?: VueModalOptions): Promise<VueModalHandle> {
      return rendered(core.open(target, props, toCoreOptions(opts)))
    },
    push(target: ModalTarget<Component>, props?: unknown, opts?: VueModalOptions): Promise<VueModalHandle> {
      return rendered(core.push(target, props, toCoreOptions(opts)))
    },
    prompt(target: ModalTarget<Component>, props?: unknown, opts?: VueModalOptions): Promise<unknown> {
      return core.prompt(target, props, toCoreOptions(opts))
    },
    install(app: App) {
      app.provide(MANAGER_KEY, manager)
      app.config.globalProperties.$modal = manager
    },
  } as VueModalManager
  return manager
}
