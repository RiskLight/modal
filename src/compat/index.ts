import { computed, defineComponent, h, ref, shallowReactive, shallowRef, type Component, type ComputedRef, type Ref } from 'vue'
import { DEFAULT_NAMESPACE, PROMPT_EVENT } from '../core/constants.js'
import { ModalError as CoreModalError } from '../core/errors.js'
import type { ModalCloseEvent, CloseGuard, ModalEventListener, ModalHandle, ModalId, Namespace, RegistryEntry } from '../core/types.js'
import { onBeforeModalClose as vueOnBeforeModalClose } from '../vue/composables.js'
import { ModalContainer } from '../vue/container.js'
import { createVueModal } from '../vue/manager.js'
import { createModalRoute, installModalRouter } from '../vue/router.js'
import type { ModalRouterLike, VueModalManager } from '../vue/types.js'
import { ModalError } from './errors.js'

export { ModalError }

export interface ModalOptions {
  namespace?: Namespace
  backgroundClose?: boolean
  draggable?: boolean | string
  isRoute?: boolean
}

export interface StoreComponentConfiguration {
  component: Component
  backgroundClose?: boolean
  draggable?: boolean | string
  beforeEach?: () => unknown
}

export type StoreElement = Component | StoreComponentConfiguration

export interface ConfigInterface {
  scrollLock: boolean
  animation: string
  backgroundClose: boolean
  escClose: boolean
  skipInitCheck: boolean
  draggable: boolean | string
  appear: boolean
  beforeEach: () => unknown
  singleShow: boolean
  store: Record<string, StoreElement>
}

export interface CloseOptions {
  namespace?: Namespace
}

type Handle = ModalHandle<Component, unknown>

const settings = shallowReactive({
  animation: 'modal-list',
  appear: true,
  skipInitCheck: false,
  store: Object.create(null) as Record<string, StoreElement>,
})

export const modalManager: VueModalManager = createVueModal({
  requireHost: namespace => namespace === DEFAULT_NAMESPACE && !settings.skipInitCheck,
})

const version = shallowRef(0)
const wrappers = new WeakMap<Handle, Modal>()
const queues = new Map<Namespace, Modal[]>()

function translate(error: unknown): unknown {
  if (!(error instanceof CoreModalError) || error instanceof ModalError) return error
  const details = (error.details ?? {}) as { id?: ModalId; namespace?: Namespace; name?: string }
  switch (error.code) {
    case 'not-hosted':
      return ModalError.NotInitialized(details.namespace ?? DEFAULT_NAMESPACE)
    case 'before-open-rejected':
      return ModalError.RejectedByBeforeEach()
    case 'guard-rejected':
      return ModalError.NextReject(details.id ?? -1)
    case 'not-found':
      return ModalError.ModalNotFoundByID(details.id ?? -1)
    case 'queue-not-empty':
      return ModalError.QueueNoEmpty()
    case 'not-registered':
      return ModalError.ModalNotExistsInStore(details.name ?? '')
    case 'no-component':
      return ModalError.ModalComponentNotProvided()
    default:
      return error
  }
}

function translated<T>(pending: Promise<T>): Promise<T> {
  return pending.catch(error => {
    throw translate(error)
  })
}

function wrap(handle: Handle): Modal {
  let modal = wrappers.get(handle)
  if (!modal) {
    modal = new Modal(handle)
    wrappers.set(handle, modal)
    handle.onClosed(() => {
      version.value++
    })
  }
  return modal
}

function syncQueue(namespace: Namespace, queue: Modal[]): void {
  queue.splice(0, queue.length, ...modalManager.getSnapshot(namespace).items.map(wrap))
}

modalManager.subscribe(() => {
  version.value++
  for (const [namespace, queue] of queues) syncQueue(namespace, queue)
})

export class Modal {
  static readonly EVENT_PROMPT: string = PROMPT_EVENT

  static readonly STORE: ReadonlyMap<ModalId, Modal> = {
    get size() {
      return Modal.STORE_VALUES().length
    },
    get(id: ModalId) {
      const handle = modalManager.get(id)
      return handle ? wrap(handle) : undefined
    },
    has(id: ModalId) {
      return modalManager.get(id) !== undefined
    },
    forEach(callback: (value: Modal, key: ModalId, map: ReadonlyMap<ModalId, Modal>) => void) {
      for (const modal of Modal.STORE_VALUES()) callback(modal, modal.id, Modal.STORE)
    },
    *entries() {
      for (const modal of Modal.STORE_VALUES()) yield [modal.id, modal] as [ModalId, Modal]
    },
    *keys() {
      for (const modal of Modal.STORE_VALUES()) yield modal.id
    },
    *values() {
      yield* Modal.STORE_VALUES()
    },
    [Symbol.iterator]() {
      return this.entries()
    },
  } as ReadonlyMap<ModalId, Modal>

  private static STORE_VALUES(): Modal[] {
    return modalManager.namespaces().flatMap(namespace => modalManager.getSnapshot(namespace).items.map(wrap))
  }

  readonly closed: ComputedRef<boolean>
  readonly props: Ref<unknown>
  readonly #handle: Handle

  constructor(handle: Handle) {
    this.#handle = handle
    this.props = handle.props as Ref<unknown>
    this.closed = computed(() => {
      void version.value
      return handle.closed
    })
  }

  get id(): ModalId {
    return this.#handle.id
  }

  get namespace(): Namespace {
    return this.#handle.namespace
  }

  get component(): Component {
    return this.#handle.component
  }

  get isRoute(): boolean {
    return this.#handle.isRoute
  }

  get instance(): any {
    return this.#handle.instance
  }

  get backgroundClose(): boolean {
    return this.#handle.backgroundClose
  }

  set backgroundClose(value: boolean) {
    this.#handle.backgroundClose = value
  }

  get draggable(): boolean | string {
    return this.#handle.draggable
  }

  set draggable(value: boolean | string) {
    this.#handle.draggable = value
  }

  close(): Promise<void> {
    return translated(this.#handle.close())
  }

  set onclose(guard: CloseGuard) {
    if (typeof guard !== 'function') throw ModalError.GuardDeclarationType(guard)
    this.#handle.onBeforeClose(guard)
  }

  set ondestroy(listener: (event: ModalCloseEvent) => void) {
    if (typeof listener !== 'function') throw ModalError.GuardDeclarationType(listener)
    this.#handle.onClosed(listener)
  }

  on(event: string, listener: ModalEventListener): () => void {
    return this.#handle.on(event, listener)
  }
}

export const container = defineComponent({
  name: 'WidgetModalContainer',
  props: { namespace: { type: String, default: DEFAULT_NAMESPACE } },
  setup(props) {
    return () =>
      h(ModalContainer, {
        namespace: props.namespace,
        manager: modalManager,
        transition: settings.animation,
        appear: settings.appear,
        backdropTrigger: 'pointerdown',
        escapeEvent: 'keyup',
      })
  },
})

function isStoreConfiguration(element: StoreElement): element is StoreComponentConfiguration {
  return typeof element === 'object' && element !== null && Object.hasOwn(element, 'component')
}

function toRegistryEntry(element: StoreElement): RegistryEntry<Component> {
  if (!isStoreConfiguration(element)) return { component: element }
  const { beforeEach, ...rest } = element
  return beforeEach ? { ...rest, beforeOpen: async () => (await beforeEach()) !== false } : rest
}

function replaceStore(store: Record<string, StoreElement>): void {
  for (const name of Object.keys(settings.store)) modalManager.unregister(name)
  const next = Object.assign(Object.create(null) as Record<string, StoreElement>, store)
  for (const [name, element] of Object.entries(next)) modalManager.register(name, toRegistryEntry(element))
  settings.store = next
}

export function config(options: Partial<ConfigInterface>): void {
  if (typeof options !== 'object' || options === null) throw ModalError.ConfigurationType(options)
  const { animation, appear, skipInitCheck, store, beforeEach, scrollLock, backgroundClose, escClose, draggable, singleShow } = options
  if (animation !== undefined) settings.animation = animation
  if (appear !== undefined) settings.appear = appear
  if (skipInitCheck !== undefined) settings.skipInitCheck = skipInitCheck
  if (store !== undefined) replaceStore(store)
  modalManager.configure({
    scrollLock,
    backgroundClose,
    escClose,
    draggable,
    singleShow,
    ...(beforeEach !== undefined && { beforeOpen: async () => (await beforeEach()) !== false }),
  })
}

function toVueOptions(options: ModalOptions = {}) {
  return { namespace: options.namespace, backgroundClose: options.backgroundClose, draggable: options.draggable, isRoute: options.isRoute }
}

type Opener = (target: Component | string, props: unknown, options: object) => Promise<Handle>

function openHandle(opener: Opener, component: Component | string, props: unknown, options?: ModalOptions): Promise<Handle> {
  return translated(opener(component, ref(props), toVueOptions(options)))
}

export function openModal(component: Component | string, props: unknown = {}, options?: ModalOptions): Promise<Modal> {
  return openHandle(modalManager.open as Opener, component, props, options).then(wrap)
}

export function pushModal(component: Component | string, props: unknown = {}, options?: ModalOptions): Promise<Modal> {
  return openHandle(modalManager.push as Opener, component, props, options).then(wrap)
}

export function promptModal<R = unknown>(component: Component | string, props: unknown = {}, options?: ModalOptions): Promise<R | null> {
  return openHandle(modalManager.push as Opener, component, props, options).then(handle => {
    wrap(handle)
    return handle.result as Promise<R | null>
  })
}

export function popModal(options: CloseOptions = {}): Promise<void> {
  return translated(modalManager.pop({ namespace: options.namespace }))
}

export function closeModal(options: CloseOptions = {}): Promise<void> {
  return translated(modalManager.closeAll({ namespace: options.namespace }))
}

export function closeById(id: ModalId, options: Partial<ModalCloseEvent> = {}): Promise<void> {
  return translated(modalManager.closeById(id, options))
}

export function getQueueByNamespace(namespace: Namespace = DEFAULT_NAMESPACE): Modal[] {
  const key = namespace || DEFAULT_NAMESPACE
  let queue = queues.get(key)
  if (!queue) {
    queue = shallowReactive<Modal[]>([])
    syncQueue(key, queue)
    queues.set(key, queue)
  }
  return queue
}

export const modalQueue: Modal[] = getQueueByNamespace()

export function getCurrentModal(namespace?: Namespace): Modal | undefined {
  const handle = modalManager.current(namespace)
  return handle ? wrap(handle) : undefined
}

export function getComponentFromStore(name: string): StoreElement | undefined {
  return settings.store[name]
}

export function onBeforeModalClose(guard: CloseGuard): void {
  vueOnBeforeModalClose(guard)
}

export interface UseModalRouter {
  (component: Component): Component
  init(router: ModalRouterLike): void
}

export const useModalRouter: UseModalRouter = Object.assign((component: Component): Component => createModalRoute(component), {
  init(router: ModalRouterLike): void {
    installModalRouter(router, modalManager)
  },
})
