import type { CreateModalOptions, ModalManager } from './types.js'

export const DEFAULT_NAMESPACE = 'default'

export const PROMPT_EVENT = 'modal:prompt'

export function createModal<C = unknown>(_options: CreateModalOptions<C> = {}): ModalManager<C> {
  throw new Error('not implemented')
}
