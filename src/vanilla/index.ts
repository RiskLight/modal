import type { VanillaModalCreateOptions, VanillaModalManager } from './types.js'

export type * from './types.js'

export function createVanillaModal(_options?: VanillaModalCreateOptions): VanillaModalManager {
  throw new Error('not implemented')
}
