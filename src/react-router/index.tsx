import { useContext, useEffect, useRef } from 'react'
import {
  matchRoutes,
  UNSAFE_DataRouterContext,
  useBlocker,
  useLocation,
  useMatches,
  useNavigate,
  useParams,
  type Location,
  type NavigateFunction,
  type Params,
} from 'react-router'
import { DEFAULT_NAMESPACE } from '../core/constants.js'
import { isModalError } from '../core/errors.js'
import { report } from '../core/report.js'
import { useModal } from '../react/hooks.js'
import type { ReactModalComponent, ReactModalHandle, ReactModalManager, ReactModalOptions } from '../react/types.js'

export interface ModalRouteMatch {
  params: Readonly<Params>
  search: URLSearchParams
  location: Location<unknown>
}

export interface ModalRouteProps {
  component: ReactModalComponent | string
  props?: ((match: ModalRouteMatch) => Record<string, unknown>) | undefined
  mode?: 'open' | 'push' | undefined
  fallback?: string | undefined
  options?: ReactModalOptions | undefined
  manager?: ReactModalManager | undefined
}

interface Entry {
  handle: ReactModalHandle
  owner: Owner
}

interface Owner {
  mounted: boolean
  leaving: boolean
  firstEntry: boolean
  fallback: string
  navigate: NavigateFunction
}

interface RouteState {
  entry: Entry | undefined
  opening: boolean
  owner: Owner
  pendingLeave: { cancelled: boolean } | undefined
}

type Opener = (component: ReactModalComponent | string, props: unknown, options: ReactModalOptions) => Promise<ReactModalHandle>

const adoptable = new WeakMap<ReactModalManager, Map<string, Entry>>()

function adoptionKey(location: Location<unknown>): string {
  return location.pathname + location.search
}

function computeProps(props: ModalRouteProps['props'], params: Readonly<Params>, location: Location<unknown>): Record<string, unknown> {
  const match: ModalRouteMatch = { params, search: new URLSearchParams(location.search), location }
  return props ? props(match) : { ...params }
}

function waitForHost(manager: ReactModalManager, namespace: string): Promise<void> {
  if (manager.isHosted(namespace)) return Promise.resolve()
  return new Promise(resolve => {
    const off = manager.subscribe(() => {
      if (!manager.isHosted(namespace)) return
      off()
      resolve()
    })
  })
}

function useRouteModal(definition: ModalRouteProps, block: boolean): RouteState {
  const provided = useModal()
  const manager = definition.manager ?? provided
  const params = useParams()
  const location: Location<unknown> = useLocation()
  const navigate = useNavigate()
  const nextProps = computeProps(definition.props, params, location)
  const state = useRef<RouteState>({
    entry: undefined,
    opening: false,
    owner: { mounted: true, leaving: false, firstEntry: location.key === 'default', fallback: definition.fallback ?? '/', navigate },
    pendingLeave: undefined,
  }).current
  state.owner.navigate = navigate
  state.owner.fallback = definition.fallback ?? '/'

  const latest = useRef(nextProps)
  latest.current = nextProps

  useEffect(() => {
    state.owner.mounted = true
    if (state.pendingLeave) {
      state.pendingLeave.cancelled = true
      state.pendingLeave = undefined
    }
    if (state.entry || state.opening) return
    const parked = adoptable.get(manager)?.get(adoptionKey(location))
    if (parked && !parked.handle.closed) {
      adoptable.get(manager)?.delete(adoptionKey(location))
      parked.owner = state.owner
      state.entry = parked
      return
    }
    state.opening = true
    const { mode, options = {} } = definition
    const opener: Opener = (component, props, opts) => (mode === 'push' ? manager.core.push(component, props, opts) : manager.core.open(component, props, opts))
    const open = () => opener(definition.component, latest.current, { ...options, isRoute: true })
    open()
      .catch(async (error: unknown) => {
        if (!isModalError(error, 'not-hosted')) throw error
        await waitForHost(manager, options.namespace || DEFAULT_NAMESPACE)
        return open()
      })
      .then(handle => {
        const entry: Entry = { handle, owner: state.owner }
        state.entry = entry
        handle.onClosed(() => {
          const owner = entry.owner
          if (owner.leaving || !owner.mounted) return
          if (owner.firstEntry) owner.navigate(owner.fallback, { replace: true })
          else owner.navigate(-1)
        })
        if (!state.owner.mounted) void handle.close({ route: true }).catch(report)
      })
      .catch(report)
      .finally(() => {
        state.opening = false
      })
  }, [manager])

  useEffect(() => {
    state.entry?.handle.setProps(latest.current)
  }, [location.pathname, location.search])

  useEffect(
    () => () => {
      const ticket = { cancelled: false }
      state.pendingLeave = ticket
      const modalLocation = location
      queueMicrotask(() => {
        if (ticket.cancelled) return
        state.pendingLeave = undefined
        state.owner.mounted = false
        const entry = state.entry
        state.entry = undefined
        if (!entry || entry.handle.closed || entry.owner.leaving) return
        entry.owner.leaving = true
        entry.handle
          .close({ route: true })
          .then(closed => {
            if (closed || block) return
            entry.owner.leaving = false
            let parked = adoptable.get(manager)
            if (!parked) {
              parked = new Map()
              adoptable.set(manager, parked)
            }
            parked.set(adoptionKey(modalLocation), entry)
            entry.owner.navigate(modalLocation.pathname + modalLocation.search)
          })
          .catch(report)
      })
    },
    [],
  )

  return state
}

function DataModalRoute(definition: ModalRouteProps) {
  const state = useRouteModal(definition, true)
  const context = useContext(UNSAFE_DataRouterContext)
  const matches = useMatches()
  const ownId = matches.at(-1)?.id
  const blocker = useBlocker(({ nextLocation }: { nextLocation: Location<unknown> }) => {
    const entry = state.entry
    if (!entry || entry.handle.closed || !context) return false
    const next = matchRoutes(context.router.routes, nextLocation, context.basename)
    return !next?.some(match => match.route.id === ownId)
  })

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    const entry = state.entry
    if (!entry || entry.handle.closed) {
      blocker.proceed()
      return
    }
    entry.owner.leaving = true
    entry.handle.close({ route: true }).then(
      closed => {
        if (closed) blocker.proceed()
        else {
          entry.owner.leaving = false
          blocker.reset()
        }
      },
      (error: unknown) => {
        report(error)
        entry.owner.leaving = false
        blocker.reset()
      },
    )
  }, [blocker])

  return null
}

function PlainModalRoute(definition: ModalRouteProps) {
  useRouteModal(definition, false)
  return null
}

const componentKeys = new WeakMap<object, string>()
let componentSeed = 0

function componentKey(component: ReactModalComponent | string): string {
  if (typeof component === 'string') return `name:${component}`
  let key = componentKeys.get(component)
  if (!key) {
    key = `component:${++componentSeed}`
    componentKeys.set(component, key)
  }
  return key
}

function KeyedDataModalRoute(definition: ModalRouteProps) {
  const matches = useMatches()
  return <DataModalRoute key={matches.at(-1)?.id ?? componentKey(definition.component)} {...definition} />
}

export function ModalRoute(definition: ModalRouteProps) {
  const data = useContext(UNSAFE_DataRouterContext)
  return data ? <KeyedDataModalRoute {...definition} /> : <PlainModalRoute key={componentKey(definition.component)} {...definition} />
}
