import { computed, markRaw, type Component } from 'vue'
import { DEFAULT_NAMESPACE } from '../core/constants.js'
import { isModalError } from '../core/errors.js'
import { report } from '../core/report.js'
import type {
  ModalRouteLocation,
  ModalRouteOptions,
  ModalRouterLike,
  VueModalHandle,
  VueModalManager,
  VueModalOptions,
} from './types.js'

const ROUTE_DEFINITION = Symbol('risklight-modal-route')

interface Definition {
  component: Component
  options: ModalRouteOptions
}

interface ActiveRoute {
  definition: Definition
  handle: VueModalHandle
  leaving: boolean
}

interface Installation {
  manager: VueModalManager
  dispose: () => void
}

type Opener = (component: Component, props: unknown, options: VueModalOptions) => Promise<VueModalHandle>

const installed = new WeakMap<ModalRouterLike, Installation>()

export function createModalRoute(component: Component, options: ModalRouteOptions = {}): Component {
  return markRaw({
    name: 'ModalRoute',
    setup: () => () => null,
    [ROUTE_DEFINITION]: { component, options } satisfies Definition,
  })
}

function definitionOf(value: unknown): Definition | undefined {
  if (!value || typeof value !== 'object') return undefined
  return (value as { [ROUTE_DEFINITION]?: Definition })[ROUTE_DEFINITION]
}

function findModal(location: ModalRouteLocation): Definition | undefined {
  for (let index = location.matched.length - 1; index >= 0; index--) {
    const components = location.matched[index]?.components ?? {}
    for (const component of Object.values(components)) {
      const definition = definitionOf(component)
      if (definition) return definition
    }
  }
  return undefined
}

export function installModalRouter(router: ModalRouterLike, manager: VueModalManager): () => void {
  const existing = installed.get(router)
  if (existing) {
    if (existing.manager !== manager) throw new Error('This router is already integrated with another modal manager')
    return existing.dispose
  }
  let active: ActiveRoute | undefined
  let opening: Promise<void> = Promise.resolve()

  let cancelWait: (() => void) | undefined

  const removeResolve = router.beforeResolve(async to => {
    cancelWait?.()
    await opening
    const current = active
    if (!current || current.handle.closed || findModal(to) === current.definition) return undefined
    current.leaving = true
    let closed = false
    try {
      closed = await current.handle.close({ route: true })
    } catch (error) {
      report(error)
    }
    if (closed) return undefined
    current.leaving = false
    return false
  })

  const register = (definition: Definition, handle: VueModalHandle, firstEntry: boolean, fallback: ModalRouteOptions['fallback']) => {
    const entry: ActiveRoute = { definition, handle, leaving: false }
    active = entry
    handle.onClosed(() => {
      if (active === entry) active = undefined
      if (entry.leaving) return
      if (firstEntry) router.push(fallback ?? '/').catch(report)
      else router.back()
    })
  }

  const open = async (definition: Definition, firstEntry: boolean, target: string): Promise<void> => {
    const { mode, props: mapProps, fallback, ...options } = definition.options
    const namespace = options.namespace || DEFAULT_NAMESPACE
    const props = computed(() => (mapProps ? mapProps(router.currentRoute.value) : router.currentRoute.value.params))
    const opener = (mode === 'push' ? manager.push : manager.open) as Opener
    const attempt = () => opener(definition.component, props, { ...options, isRoute: true })
    try {
      register(definition, await attempt(), firstEntry, fallback)
    } catch (error) {
      if (!isModalError(error, 'not-hosted')) throw error
      cancelWait?.()
      const off = manager.subscribe(() => {
        if (!manager.isHosted(namespace)) return
        cancelWait?.()
        if (router.currentRoute.value.fullPath !== target) return
        opening = attempt()
          .then(handle => register(definition, handle, firstEntry, fallback))
          .catch(report)
      })
      cancelWait = () => {
        off()
        cancelWait = undefined
      }
    }
  }

  const removeAfter = router.afterEach((to, from, failure) => {
    if (typeof window === 'undefined') return
    if (failure) {
      const current = router.currentRoute.value
      const definition = findModal(current)
      if (definition && (!active || active.handle.closed)) opening = open(definition, false, current.fullPath).catch(report)
      return
    }
    const definition = findModal(to)
    if (!definition || (active && !active.handle.closed && active.definition === definition)) return
    opening = open(definition, from.matched.length === 0, to.fullPath).catch(report)
  })

  const dispose = () => {
    cancelWait?.()
    removeResolve()
    removeAfter()
    if (installed.get(router)?.dispose === dispose) installed.delete(router)
  }
  installed.set(router, { manager, dispose })
  return dispose
}
