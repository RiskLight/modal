import { isRecord } from '../core/guards.js'
import { report } from '../core/report.js'
import type { ModalHandle, ModalManager } from '../core/types.js'
import type {
  VanillaComponent,
  VanillaModalOptions,
  VanillaNavigateOptions,
  VanillaRouteDefinition,
  VanillaRouteMatch,
  VanillaRouterOptions,
  VanillaRouteTarget,
} from './types.js'

type Handle = ModalHandle<VanillaComponent, unknown>

type Opener = (target: VanillaComponent | string, props: unknown, options: VanillaModalOptions) => Promise<Handle>

interface Route {
  pattern: string
  segments: readonly string[]
  definition: VanillaRouteDefinition
}

interface Active {
  route: Route
  handle: Handle
  index: number
  url: string
  leaving: boolean
}

interface Matched {
  route: Route
  match: VanillaRouteMatch
}

const STATE_KEY = '__modalRouter'

function isDefinition(target: VanillaRouteTarget): target is VanillaRouteDefinition {
  return typeof target === 'object' && target !== null && 'modal' in target
}

function toDefinition(target: VanillaRouteTarget): VanillaRouteDefinition {
  return isDefinition(target) ? target : { modal: target }
}

function split(path: string): string[] {
  return path.split('/').filter(segment => segment !== '')
}

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment)
  } catch {
    return segment
  }
}

function matchRoute(route: Route, path: string, query: Record<string, string>): VanillaRouteMatch | undefined {
  const parts = split(path)
  if (parts.length !== route.segments.length) return undefined
  const params: Record<string, string> = {}
  for (let index = 0; index < parts.length; index++) {
    const expected = route.segments[index] ?? ''
    const actual = parts[index] ?? ''
    if (expected.startsWith(':')) params[expected.slice(1)] = decode(actual)
    else if (expected !== actual) return undefined
  }
  return { path, params, query }
}

function shallowEqual(previous: unknown, next: Record<string, unknown>): boolean {
  if (!isRecord(previous)) return false
  const keys = Object.keys(next)
  return keys.length === Object.keys(previous).length && keys.every(key => Object.is(previous[key], next[key]))
}

function historyState(): unknown {
  const state: unknown = Reflect.get(window.history, 'state')
  return state
}

function currentIndex(): number {
  const state = historyState()
  if (!isRecord(state)) return 0
  const value = state[STATE_KEY]
  return typeof value === 'number' ? value : 0
}

export interface VanillaRouter {
  start(definitions: Readonly<Record<string, VanillaRouteTarget>>, options: VanillaRouterOptions): () => void
  navigate(to: string, options?: VanillaNavigateOptions): Promise<boolean>
}

export function createVanillaRouter(
  manager: Pick<ModalManager<VanillaComponent>, 'open' | 'push'>,
  prepare: (target: VanillaComponent | string, namespace: string | undefined) => void,
): VanillaRouter {
  let routes: Route[] = []
  let options: VanillaRouterOptions = {}
  let active: Active | undefined
  let running: (() => void) | undefined
  let restoring = false
  let handledHref: string | undefined
  let syncing: Promise<void> = Promise.resolve()

  const hashMode = () => options.mode === 'hash'

  const location = (): { path: string; query: Record<string, string>; url: string } => {
    const raw = hashMode() ? window.location.hash.slice(1) || '/' : window.location.pathname + window.location.search
    const [path = '/', search = ''] = raw.split('?')
    const query: Record<string, string> = {}
    for (const [key, value] of new URLSearchParams(search)) query[key] = value
    return { path, query, url: hashMode() ? window.location.hash : raw }
  }

  const find = (): Matched | undefined => {
    const { path, query } = location()
    for (const route of routes) {
      const match = matchRoute(route, path, query)
      if (match) return { route, match }
    }
    return undefined
  }

  const toUrl = (to: string): string => (hashMode() ? `#${to}` : to)

  const propsFor = (matched: Matched): Record<string, unknown> =>
    matched.route.definition.props ? matched.route.definition.props(matched.match) : { ...matched.match.params }

  const leaveModal = async (current: Active): Promise<boolean> => {
    current.leaving = true
    let closed = false
    try {
      closed = await current.handle.close({ route: true })
    } catch (error) {
      report(error)
    }
    if (!closed) current.leaving = false
    return closed
  }

  const open = async (matched: Matched): Promise<void> => {
    const { modal, props: _props, mode, fallback, ...modalOptions } = matched.route.definition
    prepare(modal, modalOptions.namespace)
    const opener: Opener = (target, props, opts) => (mode === 'push' ? manager.push(target, props, opts) : manager.open(target, props, opts))
    const handle = await opener(modal, propsFor(matched), { ...modalOptions, isRoute: true })
    const entry: Active = { route: matched.route, handle, index: currentIndex(), url: location().url, leaving: false }
    active = entry
    handle.onClosed(() => {
      if (active === entry) active = undefined
      if (entry.leaving || !running) return
      if (currentIndex() > 0) history.back()
      else void navigate(fallback ?? options.fallback ?? '/', { replace: true })
    })
  }

  const sync = (): Promise<void> => {
    syncing = syncing.then(async () => {
      const matched = find()
      const current = active && !active.handle.closed ? active : undefined
      if (current && matched && matched.route === current.route) {
        const next = propsFor(matched)
        if (!shallowEqual(current.handle.props, next)) current.handle.setProps(next)
        current.index = currentIndex()
        current.url = location().url
        return
      }
      if (current) {
        const index = currentIndex()
        if (!(await leaveModal(current))) {
          const delta = current.index - index
          if (delta !== 0) {
            restoring = true
            history.go(delta)
          }
          return
        }
      }
      if (matched) await open(matched).catch(report)
    })
    return syncing
  }

  const onPop = () => {
    if (window.location.href === handledHref) return
    handledHref = window.location.href
    if (restoring) {
      restoring = false
      return
    }
    void sync()
  }

  const onClick = (event: MouseEvent) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const target = event.target instanceof Element ? event.target.closest('a[data-modal-link]') : null
    if (!(target instanceof HTMLAnchorElement)) return
    const url = new URL(target.href, window.location.href)
    if (url.origin !== window.location.origin) return
    event.preventDefault()
    void navigate(hashMode() && url.hash ? url.hash.slice(1) : url.pathname + url.search)
  }

  async function navigate(to: string, navigateOptions: VanillaNavigateOptions = {}): Promise<boolean> {
    if (typeof window === 'undefined') return false
    await syncing
    const current = active && !active.handle.closed ? active : undefined
    if (current && running) {
      const [path = '/', search = ''] = to.split('?')
      const query: Record<string, string> = {}
      for (const [key, value] of new URLSearchParams(search)) query[key] = value
      const staying = matchRoute(current.route, path, query) !== undefined
      if (!staying && !(await leaveModal(current))) return false
    }
    const index = currentIndex()
    if (navigateOptions.replace) history.replaceState({ [STATE_KEY]: index }, '', toUrl(to))
    else history.pushState({ [STATE_KEY]: index + 1 }, '', toUrl(to))
    handledHref = window.location.href
    if (running) await sync()
    return true
  }

  return {
    start(definitions, routerOptions) {
      running?.()
      routes = Object.entries(definitions).map(([pattern, target]) => ({ pattern, segments: split(pattern), definition: toDefinition(target) }))
      options = routerOptions
      if (typeof window === 'undefined') return () => {}
      window.addEventListener('popstate', onPop)
      if (hashMode()) window.addEventListener('hashchange', onPop)
      if (options.links !== false) document.addEventListener('click', onClick)
      const stop = () => {
        if (running !== stop) return
        running = undefined
        window.removeEventListener('popstate', onPop)
        window.removeEventListener('hashchange', onPop)
        document.removeEventListener('click', onClick)
      }
      running = stop
      handledHref = window.location.href
      void sync()
      return stop
    },
    navigate,
  }
}
