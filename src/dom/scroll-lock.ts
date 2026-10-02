import type { ModalManager } from '../core/types.js'

export interface ScrollLockOptions {
  target?: HTMLElement
}

interface LockState {
  count: number
  overflow: string
  paddingRight: string
}

const locks = new WeakMap<HTMLElement, LockState>()

function scrollbarWidth(target: HTMLElement): number {
  if (target === document.body || target === document.documentElement) {
    return Math.max(0, window.innerWidth - document.documentElement.clientWidth)
  }
  return Math.max(0, target.offsetWidth - target.clientWidth)
}

function lock(target: HTMLElement): void {
  const existing = locks.get(target)
  if (existing) {
    existing.count++
    return
  }
  const state: LockState = { count: 1, overflow: target.style.overflow, paddingRight: target.style.paddingRight }
  const width = scrollbarWidth(target)
  if (width > 0) {
    const padding = Number.parseFloat(getComputedStyle(target).paddingRight) || 0
    target.style.paddingRight = `${padding + width}px`
  }
  target.style.overflow = 'hidden'
  locks.set(target, state)
}

function unlock(target: HTMLElement): void {
  const state = locks.get(target)
  if (!state) return
  state.count--
  if (state.count > 0) return
  locks.delete(target)
  target.style.overflow = state.overflow
  target.style.paddingRight = state.paddingRight
}

export type ScrollLockSource = Pick<ModalManager<unknown>, 'namespaces' | 'getSnapshot' | 'subscribe'>

function wantsLock(manager: ScrollLockSource): boolean {
  return manager.namespaces().some(namespace => {
    const snapshot = manager.getSnapshot(namespace)
    return snapshot.options.scrollLock && snapshot.items.length > 0
  })
}

export function bindScrollLock(manager: ScrollLockSource, options: ScrollLockOptions = {}): () => void {
  if (typeof document === 'undefined') return () => {}
  const target = options.target ?? document.body
  let locked = false
  const update = () => {
    const next = wantsLock(manager)
    if (next === locked) return
    locked = next
    if (next) lock(target)
    else unlock(target)
  }
  const unsubscribe = manager.subscribe(update)
  update()
  let bound = true
  return () => {
    if (!bound) return
    bound = false
    unsubscribe()
    if (locked) unlock(target)
    locked = false
  }
}
