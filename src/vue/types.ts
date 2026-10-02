import type { App, Component, FunctionalComponent, MaybeRefOrGetter, Slot } from 'vue'
import type { CreateModalOptions, ModalHandle, ModalManager, ModalOptions } from '../core/types.js'

export type ComponentProps<T> = T extends new (...args: never) => { $props: infer P }
  ? P
  : T extends FunctionalComponent<infer P, infer _Emits>
    ? P
    : Record<string, unknown>

export type ModalProps<T> = MaybeRefOrGetter<ComponentProps<T>>

export type { BackdropTrigger } from '../dom/dialog.js'

export interface VueModalOptions extends ModalOptions<Component> {
  slots?: Record<string, Slot> | undefined
}

export type ModalArgs<T> = {} extends ComponentProps<T>
  ? [props?: ModalProps<T>, options?: VueModalOptions]
  : [props: ModalProps<T>, options?: VueModalOptions]

export type NamedModalArgs = [props?: MaybeRefOrGetter<Record<string, unknown>>, options?: VueModalOptions]

export type VueModalHandle<R = unknown> = ModalHandle<Component, R>

export interface VueModalManager extends Omit<ModalManager<Component>, 'open' | 'push' | 'prompt'> {
  open<R = unknown, T extends Component = Component>(component: T, ...args: ModalArgs<T>): Promise<VueModalHandle<R>>
  open<R = unknown>(name: string, ...args: NamedModalArgs): Promise<VueModalHandle<R>>
  push<R = unknown, T extends Component = Component>(component: T, ...args: ModalArgs<T>): Promise<VueModalHandle<R>>
  push<R = unknown>(name: string, ...args: NamedModalArgs): Promise<VueModalHandle<R>>
  prompt<R = unknown, T extends Component = Component>(component: T, ...args: ModalArgs<T>): Promise<R | null>
  prompt<R = unknown>(name: string, ...args: NamedModalArgs): Promise<R | null>
  readonly core: ModalManager<Component>
  install(app: App<Element>): void
}

export type VueModalCreateOptions = CreateModalOptions<Component>

export interface ModalRouteRecord {
  readonly components?: Readonly<Record<string, unknown>> | null | undefined
}

export interface ModalRouteLocation {
  readonly path: string
  readonly fullPath: string
  readonly params: Readonly<Record<string, unknown>>
  readonly query: Readonly<Record<string, unknown>>
  readonly matched: readonly ModalRouteRecord[]
}

export interface ModalRouterLike {
  readonly currentRoute: { readonly value: ModalRouteLocation }
  beforeResolve(guard: (to: ModalRouteLocation, from: ModalRouteLocation) => unknown): () => void
  afterEach(hook: (to: ModalRouteLocation, from: ModalRouteLocation, failure?: unknown) => unknown): () => void
  push(to: string): Promise<unknown>
  back(): void
}

export interface ModalRouteOptions extends VueModalOptions {
  mode?: 'open' | 'push' | undefined
  props?: ((route: ModalRouteLocation) => Record<string, unknown>) | undefined
  fallback?: string | undefined
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $modal: VueModalManager
  }
}
