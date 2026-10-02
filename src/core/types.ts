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

export type ModalEventListener = (...args: never[]) => unknown

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
  namespace?: Namespace | undefined
  backgroundClose?: boolean | undefined
  escClose?: boolean | undefined
  draggable?: boolean | string | undefined
  beforeOpen?: BeforeOpen<C> | undefined
  isRoute?: boolean | undefined
  timeout?: number | false | undefined
  extra?: Readonly<Record<string, unknown>> | undefined
}

export interface RegistryEntry<C> {
  component: C
  backgroundClose?: boolean | undefined
  escClose?: boolean | undefined
  draggable?: boolean | string | undefined
  timeout?: number | false | undefined
  beforeOpen?: BeforeOpen<C> | undefined
}

export type NamespaceOptionsInput = { [K in keyof NamespaceOptions]?: NamespaceOptions[K] | undefined }

export interface NamespaceConfig<C> extends NamespaceOptionsInput {
  beforeOpen?: BeforeOpen<C> | undefined
}

export interface CreateModalOptions<C> {
  defaults?: NamespaceConfig<C> | undefined
  namespaces?: Record<Namespace, NamespaceConfig<C>> | undefined
  registry?: Record<string, C | RegistryEntry<C>> | undefined
  requireHost?: (boolean | ((namespace: Namespace) => boolean)) | undefined
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
  close(event?: Partial<ModalCloseEvent>): Promise<boolean>
  resolve(value: R): Promise<boolean>
  setProps(props: unknown): void
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
  namespace?: Namespace | undefined
}

export type ModalTarget<C> = C | string

export interface ModalManager<C = unknown> {
  open<R = unknown>(target: ModalTarget<C>, props?: unknown, options?: ModalOptions<C>): Promise<ModalHandle<C, R>>
  push<R = unknown>(target: ModalTarget<C>, props?: unknown, options?: ModalOptions<C>): Promise<ModalHandle<C, R>>
  prompt<R = unknown>(target: ModalTarget<C>, props?: unknown, options?: ModalOptions<C>): Promise<R | null>
  closeAll(scope?: NamespaceScope): Promise<boolean>
  pop(scope?: NamespaceScope): Promise<boolean>
  closeById(id: ModalId, event?: Partial<ModalCloseEvent>): Promise<boolean>
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
