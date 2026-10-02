import { bindEscape, type EscapeOptions, type EscapeSource } from './escape.js'
import { bindScrollLock, type ScrollLockOptions, type ScrollLockSource } from './scroll-lock.js'
import { joinSelectors, readSelector } from './selector.js'

export type BehaviorSource = EscapeSource & ScrollLockSource

export interface BehaviorOptions {
  escape?: boolean | EscapeOptions
  scrollLock?: boolean | ScrollLockOptions
}

interface Acquired {
  count: number
  release: () => void
  selectors: Map<string, number>
}

const acquired = new WeakMap<BehaviorSource, Acquired>()

function pick<T extends object>(value: boolean | T | undefined): T | undefined {
  if (value === false) return undefined
  return value === true || value === undefined ? ({} as T) : value
}

export function acquireBehaviors(manager: BehaviorSource, options: BehaviorOptions = {}): () => void {
  const own = typeof options.escape === 'object' ? readSelector(options.escape.allowOutside) : undefined
  let entry = acquired.get(manager)
  if (entry) {
    entry.count++
  } else {
    const escape = pick(options.escape)
    const scroll = pick(options.scrollLock)
    const selectors = new Map<string, number>()
    const allowOutside = () => joinSelectors(...selectors.keys()) || undefined
    const disposers = [escape && bindEscape(manager, { ...escape, allowOutside }), scroll && bindScrollLock(manager, scroll)]
    entry = {
      count: 1,
      selectors,
      release: () => {
        for (const dispose of disposers) dispose?.()
      },
    }
    acquired.set(manager, entry)
  }
  if (own) entry.selectors.set(own, (entry.selectors.get(own) ?? 0) + 1)
  const current = entry
  let held = true
  return () => {
    if (!held) return
    held = false
    if (own) {
      const left = (current.selectors.get(own) ?? 1) - 1
      if (left > 0) current.selectors.set(own, left)
      else current.selectors.delete(own)
    }
    current.count--
    if (current.count > 0) return
    current.release()
    if (acquired.get(manager) === current) acquired.delete(manager)
  }
}
