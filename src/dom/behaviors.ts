import { bindEscape, type EscapeOptions, type EscapeSource } from './escape.js'
import { bindScrollLock, type ScrollLockOptions, type ScrollLockSource } from './scroll-lock.js'

export type BehaviorSource = EscapeSource & ScrollLockSource

export interface BehaviorOptions {
  escape?: boolean | EscapeOptions
  scrollLock?: boolean | ScrollLockOptions
}

interface Acquired {
  count: number
  release: () => void
}

const acquired = new WeakMap<BehaviorSource, Acquired>()

function pick<T extends object>(value: boolean | T | undefined): T | undefined {
  if (value === false) return undefined
  return value === true || value === undefined ? ({} as T) : value
}

export function acquireBehaviors(manager: BehaviorSource, options: BehaviorOptions = {}): () => void {
  let entry = acquired.get(manager)
  if (entry) {
    entry.count++
  } else {
    const escape = pick(options.escape)
    const scroll = pick(options.scrollLock)
    const disposers = [escape && bindEscape(manager, escape), scroll && bindScrollLock(manager, scroll)]
    entry = {
      count: 1,
      release: () => {
        for (const dispose of disposers) dispose?.()
      },
    }
    acquired.set(manager, entry)
  }
  const current = entry
  let held = true
  return () => {
    if (!held) return
    held = false
    current.count--
    if (current.count > 0) return
    current.release()
    if (acquired.get(manager) === current) acquired.delete(manager)
  }
}
