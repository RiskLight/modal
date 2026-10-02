import type { ComponentType, HTMLAttributes } from 'react'
import type { CreateModalOptions, ModalHandle, ModalManager, ModalOptions } from '../core/types.js'
import type { BackdropTrigger } from '../dom/dialog.js'

export type ReactModalComponent = ComponentType<any>

export type ReactModalHandle<R = unknown> = ModalHandle<ReactModalComponent, R>

export type ReactComponentProps<T> = T extends ComponentType<infer P> ? P : Record<string, unknown>

export type ReactModalOptions = ModalOptions<ReactModalComponent>

export type ReactModalArgs<T> = {} extends ReactComponentProps<T>
  ? [props?: ReactComponentProps<T>, options?: ReactModalOptions]
  : [props: ReactComponentProps<T>, options?: ReactModalOptions]

export type ReactNamedModalArgs = [props?: Record<string, unknown>, options?: ReactModalOptions]

export interface ReactModalManager extends Omit<ModalManager<ReactModalComponent>, 'open' | 'push' | 'prompt'> {
  open<R = unknown, T extends ReactModalComponent = ReactModalComponent>(component: T, ...args: ReactModalArgs<T>): Promise<ReactModalHandle<R>>
  open<R = unknown>(name: string, ...args: ReactNamedModalArgs): Promise<ReactModalHandle<R>>
  push<R = unknown, T extends ReactModalComponent = ReactModalComponent>(component: T, ...args: ReactModalArgs<T>): Promise<ReactModalHandle<R>>
  push<R = unknown>(name: string, ...args: ReactNamedModalArgs): Promise<ReactModalHandle<R>>
  prompt<R = unknown, T extends ReactModalComponent = ReactModalComponent>(component: T, ...args: ReactModalArgs<T>): Promise<R | null>
  prompt<R = unknown>(name: string, ...args: ReactNamedModalArgs): Promise<R | null>
  readonly core: ModalManager<ReactModalComponent>
}

export type ReactModalCreateOptions = CreateModalOptions<ReactModalComponent>

export interface ModalContainerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  namespace?: string | undefined
  manager?: ReactModalManager | undefined
  trapFocus?: boolean | undefined
  behaviors?: boolean | undefined
  unstyled?: boolean | undefined
  nonce?: string | undefined
  backdropTrigger?: BackdropTrigger | undefined
  escapeEvent?: 'keydown' | 'keyup' | undefined
  allowOutside?: string | undefined
  transition?: string | false | undefined
}
