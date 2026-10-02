import { defineComponent, type Component, type ComputedRef, type Ref } from 'vue'
import type { Router } from 'vue-router'
import type { CloseEvent, CloseGuard, EventListener, ModalId, Namespace } from '../core/types.js'
import type { VueModalManager } from '../vue/types.js'
import { ModalError } from './errors.js'

export { ModalError }

function stub(): never {
  throw new Error('not implemented')
}

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

export class Modal {
  static readonly EVENT_PROMPT: string = ''
  static readonly STORE: ReadonlyMap<ModalId, Modal> = new Map()
  readonly id: ModalId = 0
  readonly namespace: Namespace = ''
  readonly component: Component = {}
  readonly isRoute: boolean = false
  readonly closed!: ComputedRef<boolean>
  readonly props!: Ref<unknown>
  backgroundClose = true
  draggable: boolean | string = false
  get instance(): any {
    return stub()
  }
  close(): Promise<void> {
    return stub()
  }
  set onclose(_guard: CloseGuard) {
    stub()
  }
  set ondestroy(_listener: (event: CloseEvent) => void) {
    stub()
  }
  on(_event: string, _listener: EventListener): () => void {
    return stub()
  }
}

export const modalManager: VueModalManager = {} as VueModalManager

export const container = defineComponent({ name: 'WidgetModalContainer', props: { namespace: String }, setup: () => stub() })

export function config(_options: Partial<ConfigInterface>): void {
  stub()
}

export function openModal(_component: Component | string, _props?: unknown, _options?: ModalOptions): Promise<Modal> {
  return stub()
}

export function pushModal(_component: Component | string, _props?: unknown, _options?: ModalOptions): Promise<Modal> {
  return stub()
}

export function promptModal<R = unknown>(_component: Component | string, _props?: unknown, _options?: ModalOptions): Promise<R | null> {
  return stub()
}

export function popModal(_options?: CloseOptions): Promise<void> {
  return stub()
}

export function closeModal(_options?: CloseOptions): Promise<void> {
  return stub()
}

export function closeById(_id: ModalId, _options?: Partial<CloseEvent>): Promise<void> {
  return stub()
}

export function getQueueByNamespace(_namespace?: Namespace): Modal[] {
  return stub()
}

export const modalQueue: Modal[] = []

export function getCurrentModal(_namespace?: Namespace): Modal | undefined {
  return stub()
}

export function getComponentFromStore(_name: string): StoreElement | undefined {
  return stub()
}

export function onBeforeModalClose(_guard: CloseGuard): void {
  stub()
}

export interface UseModalRouter {
  (component: Component): Component
  init(router: Router): void
}

export const useModalRouter: UseModalRouter = Object.assign((_component: Component): Component => stub(), { init: (_router: Router) => stub() })
