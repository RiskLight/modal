export type Namespace = string

export type ModalId = number

export type ModalStatus = 'open' | 'closing' | 'closed'

export interface ModalCloseEvent {
  background: boolean
  esc: boolean
  route: boolean
}

export type CloseGuard = (this: unknown, event: ModalCloseEvent) => void | boolean | Promise<void | boolean>

export type ClosedListener = (event: ModalCloseEvent) => void

export type ModalEventListener = (...args: any[]) => unknown

export interface NamespaceOptions {
  escClose: boolean
  scrollLock: boolean
  singleShow: boolean
  backgroundClose: boolean
  draggable: boolean | string
  timeout: number | false
}

export interface OpenContext<C> {
  component: C
  props: unknown
  namespace: Namespace
  name: string | undefined
}

export type BeforeOpen<C> = (context: OpenContext<C>) => void | boolean | Promise<void | boolean>

export interface ModalOptions<C> {
  namespace?: Namespace
  backgroundClose?: boolean
  escClose?: boolean
  draggable?: boolean | string
  beforeOpen?: BeforeOpen<C>
  isRoute?: boolean
  timeout?: number | false
  extra?: Readonly<Record<string, unknown>>
}

export interface RegistryEntry<C> {
  component: C
  backgroundClose?: boolean
  escClose?: boolean
  draggable?: boolean | string
  timeout?: number | false
  beforeOpen?: BeforeOpen<C>
}

export interface NamespaceConfig<C> extends Partial<NamespaceOptions> {
  beforeOpen?: BeforeOpen<C>
}

export interface CreateModalOptions<C> {
  defaults?: NamespaceConfig<C>
  namespaces?: Record<Namespace, NamespaceConfig<C>>
  registry?: Record<string, C | RegistryEntry<C>>
  requireHost?: boolean | ((namespace: Namespace) => boolean)
  guardFrom?: (component: C) => CloseGuard | undefined
}

export interface ModalHandle<C = unknown, R = unknown> {
  readonly id: ModalId
  readonly namespace: Namespace
  readonly component: C
  readonly props: unknown
  readonly name: string | undefined
  readonly isRoute: boolean
  readonly extra: Readonly<Record<string, unknown>>
  readonly status: ModalStatus
  readonly closed: boolean
  readonly revision: number
  readonly result: Promise<R | null>
  readonly timeout: number | false
  backgroundClose: boolean
  escClose: boolean
  draggable: boolean | string
  instance: unknown
  close(event?: Partial<ModalCloseEvent>): Promise<void>
  resolve(value: R): Promise<void>
  onBeforeClose(guard: CloseGuard): () => void
  onClosed(listener: ClosedListener): () => void
  on(event: string, listener: ModalEventListener): () => void
  emit(event: string, ...args: unknown[]): void
  eventNames(): readonly string[]
}

export interface NamespaceSnapshot<C = unknown> {
  readonly namespace: Namespace
  readonly items: readonly ModalHandle<C>[]
  readonly top: ModalHandle<C> | undefined
  readonly options: Readonly<NamespaceOptions>
}

export interface NamespaceScope {
  namespace?: Namespace
}

export type ModalTarget<C> = C | string

export interface ModalManager<C = unknown> {
  open<R = unknown>(target: ModalTarget<C>, props?: unknown, options?: ModalOptions<C>): Promise<ModalHandle<C, R>>
  push<R = unknown>(target: ModalTarget<C>, props?: unknown, options?: ModalOptions<C>): Promise<ModalHandle<C, R>>
  prompt<R = unknown>(target: ModalTarget<C>, props?: unknown, options?: ModalOptions<C>): Promise<R | null>
  closeAll(scope?: NamespaceScope): Promise<void>
  pop(scope?: NamespaceScope): Promise<void>
  closeById(id: ModalId, event?: Partial<ModalCloseEvent>): Promise<void>
  get(id: ModalId): ModalHandle<C> | undefined
  current(namespace?: Namespace): ModalHandle<C> | undefined
  topmost(predicate?: (options: Readonly<NamespaceOptions>, namespace: Namespace, top: ModalHandle<C>) => boolean): ModalHandle<C> | undefined
  namespaces(): readonly Namespace[]
  options(namespace?: Namespace): Readonly<NamespaceOptions>
  subscribe(listener: () => void): () => void
  getSnapshot(namespace?: Namespace): NamespaceSnapshot<C>
  getVersion(): number
  configure(config: NamespaceConfig<C>): void
  configureNamespace(namespace: Namespace, config: NamespaceConfig<C>): void
  register(name: string, entry: C | RegistryEntry<C>): void
  unregister(name: string): void
  lookup(name: string): RegistryEntry<C> | undefined
  attachHost(namespace?: Namespace): () => void
  isHosted(namespace?: Namespace): boolean
  reset(): void
  dispose(): void
}
