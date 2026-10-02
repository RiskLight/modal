import type { App, Component, FunctionalComponent, MaybeRefOrGetter, Slot } from 'vue'
import type { RouteLocationNormalizedLoaded, RouteLocationRaw } from 'vue-router'
import type { CreateModalOptions, ModalHandle, ModalManager, ModalOptions } from '../core/types.js'

export type ComponentProps<T> = T extends new (...args: any) => { $props: infer P }
  ? P
  : T extends FunctionalComponent<infer P, any>
    ? P
    : Record<string, unknown>

export type ModalProps<T> = MaybeRefOrGetter<ComponentProps<T>>

export interface VueModalOptions extends ModalOptions<Component> {
  slots?: Record<string, Slot>
}

export type VueModalHandle<R = unknown> = ModalHandle<Component, R>

export interface VueModalManager extends Omit<ModalManager<Component>, 'open' | 'push' | 'prompt'> {
  open<T extends Component, R = unknown>(component: T, props?: ModalProps<T>, options?: VueModalOptions): Promise<VueModalHandle<R>>
  open<R = unknown>(name: string, props?: MaybeRefOrGetter<Record<string, unknown>>, options?: VueModalOptions): Promise<VueModalHandle<R>>
  push<T extends Component, R = unknown>(component: T, props?: ModalProps<T>, options?: VueModalOptions): Promise<VueModalHandle<R>>
  push<R = unknown>(name: string, props?: MaybeRefOrGetter<Record<string, unknown>>, options?: VueModalOptions): Promise<VueModalHandle<R>>
  prompt<R = unknown, T extends Component = Component>(component: T, props?: ModalProps<T>, options?: VueModalOptions): Promise<R | null>
  prompt<R = unknown>(name: string, props?: MaybeRefOrGetter<Record<string, unknown>>, options?: VueModalOptions): Promise<R | null>
  readonly core: ModalManager<Component>
  install(app: App): void
}

export type VueModalCreateOptions = CreateModalOptions<Component>

export interface ModalRouteOptions extends VueModalOptions {
  mode?: 'open' | 'push'
  props?: (route: RouteLocationNormalizedLoaded) => Record<string, unknown>
  fallback?: RouteLocationRaw
}

declare module 'vue' {
  interface ComponentCustomProperties {
    $modal: VueModalManager
  }
}
