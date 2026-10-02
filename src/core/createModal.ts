import { BASE_OPTIONS, DEFAULT_NAMESPACE, OPTION_KEYS } from './constants.js'
import { ModalError } from './errors.js'
import { closeEvent, Handle, type HandleHost } from './handle.js'
import { report } from './report.js'
import type {
  BeforeOpen,
  ModalCloseEvent,
  CreateModalOptions,
  ModalHandle,
  ModalId,
  ModalManager,
  ModalOptions,
  ModalTarget,
  Namespace,
  NamespaceOptions,
  NamespaceScope,
  NamespaceSnapshot,
  RegistryEntry,
} from './types.js'

export { DEFAULT_NAMESPACE, PROMPT_EVENT } from './constants.js'

interface Override<C> {
  options: Partial<NamespaceOptions>
  beforeOpen: BeforeOpen<C> | undefined
}

function normalize(namespace: Namespace | undefined): Namespace {
  return namespace || DEFAULT_NAMESPACE
}

function pickOptions(config: Partial<NamespaceOptions> | undefined): Partial<NamespaceOptions> {
  const picked: Partial<Record<keyof NamespaceOptions, unknown>> = {}
  if (!config) return picked as Partial<NamespaceOptions>
  for (const key of OPTION_KEYS) {
    if (config[key] !== undefined) picked[key] = config[key]
  }
  return picked as Partial<NamespaceOptions>
}

function normalizeTimeout(value: number | false | undefined): number | false {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : false
}

function isEntry<C>(value: C | RegistryEntry<C>): value is RegistryEntry<C> {
  return typeof value === 'object' && value !== null && Object.hasOwn(value, 'component')
}

function toEntry<C>(value: C | RegistryEntry<C>): RegistryEntry<C> {
  return isEntry(value) ? { ...value } : { component: value }
}

export function createModal<C = unknown>(options: CreateModalOptions<C> = {}): ModalManager<C> {
  const defaults: NamespaceOptions = { ...BASE_OPTIONS, ...pickOptions(options.defaults) }
  let globalBeforeOpen: BeforeOpen<C> | undefined = options.defaults?.beforeOpen
  const overrides = new Map<Namespace, Override<C>>()
  const stacks = new Map<Namespace, Handle<C, unknown>[]>()
  const snapshots = new Map<Namespace, NamespaceSnapshot<C>>()
  const handles = new Map<ModalId, Handle<C, unknown>>()
  const registry = new Map<string, RegistryEntry<C>>()
  const hosts = new Map<Namespace, number>()
  const listeners = new Set<() => void>()
  let version = 0
  let disposed = false

  for (const [namespace, config] of Object.entries(options.namespaces ?? {})) {
    overrides.set(normalize(namespace), { options: pickOptions(config), beforeOpen: config.beforeOpen })
  }
  for (const [name, entry] of Object.entries(options.registry ?? {})) registry.set(name, toEntry(entry))

  function notify(): void {
    for (const listener of Array.from(listeners)) {
      try {
        listener()
      } catch (error) {
        report(error)
      }
    }
  }

  function invalidate(namespace?: Namespace): void {
    if (namespace === undefined) snapshots.clear()
    else snapshots.delete(namespace)
    version++
    notify()
  }

  function stack(namespace: Namespace): Handle<C, unknown>[] {
    return stacks.get(namespace) ?? []
  }

  function resolveOptions(namespace: Namespace): Readonly<NamespaceOptions> {
    return Object.freeze({ ...defaults, ...overrides.get(namespace)?.options })
  }

  function getSnapshot(namespace?: Namespace): NamespaceSnapshot<C> {
    const key = normalize(namespace)
    const cached = snapshots.get(key)
    if (cached) return cached
    const items = Object.freeze([...stack(key)]) as readonly ModalHandle<C>[]
    const snapshot = Object.freeze({ namespace: key, items, top: items.at(-1), options: resolveOptions(key) })
    snapshots.set(key, snapshot)
    return snapshot
  }

  function needsHost(namespace: Namespace): boolean {
    const { requireHost } = options
    return typeof requireHost === 'function' ? requireHost(namespace) : requireHost === true
  }

  function isHosted(namespace?: Namespace): boolean {
    return (hosts.get(normalize(namespace)) ?? 0) > 0
  }

  const host: HandleHost = {
    finalize(handle, event) {
      if (handles.get(handle.id) === handle) {
        handles.delete(handle.id)
        const rest = stack(handle.namespace).filter(item => item !== handle)
        if (rest.length > 0) stacks.set(handle.namespace, rest)
        else stacks.delete(handle.namespace)
        invalidate(handle.namespace)
      }
      handle.complete(event, true)
    },
    touch(handle) {
      if (handles.get(handle.id) === handle) invalidate(handle.namespace)
    },
    escClose(namespace) {
      return resolveOptions(namespace).escClose
    },
  }

  function disposedError(): ModalError {
    return new ModalError('disposed', 'The modal manager has been disposed')
  }

  async function push<R = unknown>(target: ModalTarget<C>, props?: unknown, open: ModalOptions<C> = {}): Promise<ModalHandle<C, R>> {
    if (disposed) throw disposedError()
    const namespace = normalize(open.namespace)
    if (needsHost(namespace) && !isHosted(namespace)) {
      throw new ModalError('not-hosted', `No modal container is mounted for namespace "${namespace}"`, { namespace })
    }
    let entry: RegistryEntry<C> | undefined
    let name: string | undefined
    let component: C
    if (typeof target === 'string') {
      name = target
      entry = registry.get(target)
      if (!entry) throw new ModalError('not-registered', `No modal is registered under the name "${target}"`, { name })
      component = entry.component
    } else {
      component = target
    }
    if (component === undefined || component === null) {
      throw new ModalError('no-component', 'A modal component was not provided', { name })
    }
    const context = { component, props, namespace, name }
    const hooks = [globalBeforeOpen, overrides.get(namespace)?.beforeOpen, entry?.beforeOpen, open.beforeOpen]
    for (const hook of hooks) {
      if (hook && (await hook(context)) === false) {
        throw new ModalError('before-open-rejected', 'Opening the modal was rejected by a beforeOpen hook', { namespace, name })
      }
    }
    if (disposed) throw disposedError()
    const resolved = resolveOptions(namespace)
    const handle = new Handle<C, R>(host, {
      namespace,
      component,
      props,
      name,
      isRoute: open.isRoute === true,
      extra: open.extra ?? {},
      backgroundClose: open.backgroundClose ?? entry?.backgroundClose ?? resolved.backgroundClose,
      escClose: open.escClose ?? entry?.escClose,
      draggable: open.draggable ?? entry?.draggable ?? resolved.draggable,
      timeout: normalizeTimeout(open.timeout ?? entry?.timeout ?? resolved.timeout),
    })
    const guard = options.guardFrom?.(component)
    if (typeof guard === 'function') handle.onBeforeClose(guard)
    handles.set(handle.id, handle as Handle<C, unknown>)
    stacks.set(namespace, [...stack(namespace), handle as Handle<C, unknown>])
    invalidate(namespace)
    handle.startTimer()
    return handle
  }

  async function closeAll(scope: NamespaceScope = {}): Promise<void> {
    const items = [...stack(normalize(scope.namespace))].reverse()
    for (const handle of items) {
      if (!handle.closed) await handle.close()
    }
  }

  const openChains = new Map<Namespace, Promise<unknown>>()

  function open<R = unknown>(target: ModalTarget<C>, props?: unknown, opts: ModalOptions<C> = {}): Promise<ModalHandle<C, R>> {
    const namespace = normalize(opts.namespace)
    const previous = openChains.get(namespace) ?? Promise.resolve()
    const next = previous.then(async () => {
      await closeAll({ namespace })
      if (stack(namespace).length > 0) {
        throw new ModalError('queue-not-empty', `Namespace "${namespace}" still has open modals`, { namespace })
      }
      return push<R>(target, props, opts)
    })
    const settled = next.then(
      () => undefined,
      () => undefined,
    )
    openChains.set(namespace, settled)
    void settled.then(() => {
      if (openChains.get(namespace) === settled) openChains.delete(namespace)
    })
    return next
  }

  function current(namespace?: Namespace): ModalHandle<C> | undefined {
    return stack(normalize(namespace)).at(-1)
  }

  function reset(): void {
    const all = [...handles.values()]
    handles.clear()
    stacks.clear()
    snapshots.clear()
    version++
    notify()
    const event: ModalCloseEvent = closeEvent()
    for (const handle of all) handle.complete(event, false)
  }

  return {
    open,
    push,
    async prompt<R = unknown>(target: ModalTarget<C>, props?: unknown, opts?: ModalOptions<C>): Promise<R | null> {
      const handle = await push<R>(target, props, opts)
      return handle.result
    },
    closeAll,
    pop(scope: NamespaceScope = {}) {
      return current(scope.namespace)?.close() ?? Promise.resolve()
    },
    closeById(id, event) {
      const handle = handles.get(id)
      if (!handle) return Promise.reject(new ModalError('not-found', `Modal ${id} was not found`, { id }))
      return handle.close(event)
    },
    get(id) {
      return handles.get(id)
    },
    current,
    topmost(predicate) {
      let best: Handle<C, unknown> | undefined
      for (const [namespace, items] of stacks) {
        const top = items.at(-1)
        if (!top || (best && best.id > top.id)) continue
        if (predicate && !predicate(resolveOptions(namespace), namespace, top)) continue
        best = top
      }
      return best
    },
    namespaces() {
      return [...new Set([...overrides.keys(), ...stacks.keys()])]
    },
    options(namespace) {
      return getSnapshot(namespace).options
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot,
    getVersion() {
      return version
    },
    configure(config) {
      Object.assign(defaults, pickOptions(config))
      if (Object.hasOwn(config, 'beforeOpen')) globalBeforeOpen = config.beforeOpen
      invalidate()
    },
    configureNamespace(namespace, config) {
      const key = normalize(namespace)
      const previous = overrides.get(key)
      overrides.set(key, {
        options: { ...previous?.options, ...pickOptions(config) },
        beforeOpen: Object.hasOwn(config, 'beforeOpen') ? config.beforeOpen : previous?.beforeOpen,
      })
      invalidate(key)
    },
    register(name, entry) {
      registry.set(name, toEntry(entry))
    },
    unregister(name) {
      registry.delete(name)
    },
    lookup(name) {
      const entry = registry.get(name)
      return entry ? { ...entry } : undefined
    },
    attachHost(namespace) {
      const key = normalize(namespace)
      hosts.set(key, (hosts.get(key) ?? 0) + 1)
      invalidate(key)
      let attached = true
      return () => {
        if (!attached) return
        attached = false
        const count = (hosts.get(key) ?? 1) - 1
        if (count > 0) hosts.set(key, count)
        else hosts.delete(key)
        invalidate(key)
      }
    },
    isHosted,
    reset,
    dispose() {
      disposed = true
      reset()
      listeners.clear()
    },
  }
}
