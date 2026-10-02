import type { NamespaceOptions } from './types.js'

export const DEFAULT_NAMESPACE = 'default'

export const PROMPT_EVENT = 'modal:prompt'

export const BASE_OPTIONS: Readonly<NamespaceOptions> = Object.freeze({
  escClose: true,
  scrollLock: true,
  singleShow: false,
  backgroundClose: true,
  draggable: false,
  timeout: false,
})

