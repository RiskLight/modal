import { computed, markRaw, type Component } from 'vue'
import type { RouteLocationNormalized, Router } from 'vue-router'
import { report } from '../core/report.js'
import type { ModalRouteOptions, VueModalHandle, VueModalManager, VueModalOptions } from './types.js'

const ROUTE_DEFINITION = Symbol('risklight-modal-route')

interface Definition {
  component: Component
  options: ModalRouteOptions
}

interface ActiveRoute {
  handle: VueModalHandle
  leaving: boolean
}

type Opener = (component: Component, props: unknown, options: VueModalOptions) => Promise<VueModalHandle>

const installed = new WeakMap<Router, () => void>()

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

function findModal(location: RouteLocationNormalized): Definition | undefined {
  for (let index = location.matched.length - 1; index >= 0; index--) {
    const components = location.matched[index]?.components ?? {}
    for (const component of Object.values(components)) {
      const definition = definitionOf(component)
      if (definition) return definition
    }
  }
  return undefined
}

export function installModalRouter(router: Router, manager: VueModalManager): () => void {
  const existing = installed.get(router)
  if (existing) return existing
  let active: ActiveRoute | undefined
  let opening: Promise<void> = Promise.resolve()

  const removeBefore = router.beforeEach(async () => {
    await opening
    const current = active
    if (!current || current.handle.closed) return
    current.leaving = true
    try {
      await current.handle.close({ route: true })
    } catch {
      current.leaving = false
      return false
    }
    return undefined
  })

  const removeAfter = router.afterEach((to, from, failure) => {
    if (failure) return
    const definition = findModal(to)
    if (!definition) return
    const { mode, props: mapProps, fallback, ...options } = definition.options
    const firstEntry = from.matched.length === 0
    const props = computed(() => (mapProps ? mapProps(router.currentRoute.value) : router.currentRoute.value.params))
    const opener = (mode === 'push' ? manager.push : manager.open) as Opener
    opening = opener(definition.component, props, { ...options, isRoute: true }).then(handle => {
      const entry: ActiveRoute = { handle, leaving: false }
      active = entry
      handle.onClosed(() => {
        if (active === entry) active = undefined
        if (entry.leaving) return
        if (firstEntry) router.push(fallback ?? '/').catch(report)
        else router.back()
      })
    }, report)
  })

  const dispose = () => {
    removeBefore()
    removeAfter()
    if (installed.get(router) === dispose) installed.delete(router)
  }
  installed.set(router, dispose)
  return dispose
}
