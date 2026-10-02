import type { CreateModalOptions, ModalHandle, ModalManager, ModalOptions } from '../core/types.js'
import type { BackdropTrigger } from '../dom/dialog.js'

export interface VanillaRendered {
  element: Node
  destroy?: (() => void) | undefined
  update?: ((props: unknown) => void) | undefined
}

export type VanillaComponent<P = any> = (props: P, handle: VanillaModalHandle) => Node | string | VanillaRendered

export type VanillaModalHandle<R = unknown> = ModalHandle<VanillaComponent, R>

export type VanillaComponentProps<T> = T extends (props: infer P, handle: never) => unknown ? P : Record<string, unknown>

export type VanillaModalOptions = ModalOptions<VanillaComponent>

export type VanillaModalArgs<T> = {} extends VanillaComponentProps<T>
  ? [props?: VanillaComponentProps<T>, options?: VanillaModalOptions]
  : [props: VanillaComponentProps<T>, options?: VanillaModalOptions]

export type VanillaNamedModalArgs = [props?: Record<string, unknown>, options?: VanillaModalOptions]

export interface MountOptions {
  namespace?: string | undefined
  trapFocus?: boolean | undefined
  behaviors?: boolean | undefined
  unstyled?: boolean | undefined
  nonce?: string | undefined
  backdropTrigger?: BackdropTrigger | undefined
  escapeEvent?: 'keydown' | 'keyup' | undefined
  allowOutside?: string | undefined
  className?: string | undefined
}

export interface VanillaModalManager extends Omit<ModalManager<VanillaComponent>, 'open' | 'push' | 'prompt'> {
  open<R = unknown, T extends VanillaComponent = VanillaComponent>(component: T, ...args: VanillaModalArgs<T>): Promise<VanillaModalHandle<R>>
  open<R = unknown>(name: string, ...args: VanillaNamedModalArgs): Promise<VanillaModalHandle<R>>
  push<R = unknown, T extends VanillaComponent = VanillaComponent>(component: T, ...args: VanillaModalArgs<T>): Promise<VanillaModalHandle<R>>
  push<R = unknown>(name: string, ...args: VanillaNamedModalArgs): Promise<VanillaModalHandle<R>>
  prompt<R = unknown, T extends VanillaComponent = VanillaComponent>(component: T, ...args: VanillaModalArgs<T>): Promise<R | null>
  prompt<R = unknown>(name: string, ...args: VanillaNamedModalArgs): Promise<R | null>
  mount(target?: Element | string, options?: MountOptions): () => void
  readonly core: ModalManager<VanillaComponent>
}

export interface VanillaModalCreateOptions extends CreateModalOptions<VanillaComponent> {
  autoMount?: boolean | Element | string | undefined
}
