import { insideSelector, type SelectorSource } from './selector.js'

export interface FocusTrapOptions {
  initialFocus?: HTMLElement | string
  fallbackFocus?: HTMLElement
  returnFocus?: boolean
  returnFocusTo?: HTMLElement | null
  allowOutside?: SelectorSource
}

export interface FocusTrapRelease {
  returnFocus?: boolean
}

export type ReleaseFocusTrap = (options?: FocusTrapRelease) => void

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'audio[controls]',
  'video[controls]',
  'summary',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(',')

interface Trap {
  root: HTMLElement
  focusFirst(): void
  allows(target: Node): boolean
}

const traps: Trap[] = []

export function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    element =>
      element.getAttribute('tabindex') !== '-1' &&
      !element.closest('[hidden], [inert]') &&
      (typeof element.checkVisibility !== 'function' || element.checkVisibility()),
  )
}

function resolveInitial(root: HTMLElement, initial: FocusTrapOptions['initialFocus']): HTMLElement | null {
  const explicit = typeof initial === 'string' ? root.querySelector<HTMLElement>(initial) : initial
  return explicit ?? root.querySelector<HTMLElement>('[autofocus]') ?? focusableElements(root)[0] ?? null
}

let removalObserver: MutationObserver | undefined

function stopWatchingRemoval(): void {
  removalObserver?.disconnect()
  removalObserver = undefined
}

function recoverLostFocus(): void {
  const top = traps.at(-1)
  if (!top) return stopWatchingRemoval()
  const active = document.activeElement
  if (active && active !== document.body) {
    if (top.root.contains(active)) stopWatchingRemoval()
    return
  }
  stopWatchingRemoval()
  top.focusFirst()
}

function watchRemoval(): void {
  if (removalObserver || typeof MutationObserver === 'undefined') return
  removalObserver = new MutationObserver(recoverLostFocus)
  removalObserver.observe(document.body, { childList: true, subtree: true })
}

function onFocusIn(event: FocusEvent): void {
  const top = traps.at(-1)
  if (!top) return
  const target = event.target instanceof Node ? event.target : null
  if (target && top.root.contains(target)) return
  if (target && top.allows(target)) {
    watchRemoval()
    return
  }
  top.focusFirst()
}

function onFocusOut(event: FocusEvent): void {
  if (event.relatedTarget === null && traps.length > 0) queueMicrotask(recoverLostFocus)
}

export function trapFocus(root: HTMLElement, options: FocusTrapOptions = {}): ReleaseFocusTrap {
  if (typeof document === 'undefined') return () => {}
  const previous = options.returnFocusTo !== undefined ? options.returnFocusTo : document.activeElement instanceof HTMLElement ? document.activeElement : null
  const surface = options.fallbackFocus ?? root
  const hadTabindex = surface.hasAttribute('tabindex')

  const focusRoot = () => {
    if (!surface.hasAttribute('tabindex')) surface.setAttribute('tabindex', '-1')
    surface.focus()
  }
  const focusFirst = () => {
    const first = focusableElements(root)[0]
    if (first) first.focus()
    else focusRoot()
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return
    const list = focusableElements(root)
    const first = list[0]
    const last = list.at(-1)
    if (!first || !last) {
      event.preventDefault()
      focusRoot()
      return
    }
    const active = document.activeElement
    if (event.shiftKey && (active === first || active === root || active === surface)) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const allows = (target: Node) => insideSelector(target, options.allowOutside)

  const trap: Trap = { root, focusFirst, allows }
  if (traps.length === 0) {
    document.addEventListener('focusin', onFocusIn)
    document.addEventListener('focusout', onFocusOut)
  }
  traps.push(trap)
  root.addEventListener('keydown', onKeyDown)

  const initial = resolveInitial(root, options.initialFocus)
  if (initial) initial.focus()
  else focusRoot()

  let active = true
  return (release: FocusTrapRelease = {}) => {
    if (!active) return
    active = false
    root.removeEventListener('keydown', onKeyDown)
    const index = traps.indexOf(trap)
    if (index !== -1) traps.splice(index, 1)
    if (traps.length === 0) {
      document.removeEventListener('focusin', onFocusIn)
      document.removeEventListener('focusout', onFocusOut)
      stopWatchingRemoval()
    }
    if (!hadTabindex) surface.removeAttribute('tabindex')
    const wanted = release.returnFocus ?? options.returnFocus ?? true
    if (!wanted || !previous) return
    const focusIsOurs = () => {
      const current = document.activeElement
      return !current || current === document.body || root.contains(current)
    }
    const restore = () => {
      if (focusIsOurs() && previous.isConnected && !previous.closest('[inert]')) previous.focus()
    }
    if (previous.closest('[inert]')) {
      if (focusIsOurs()) queueMicrotask(restore)
      return
    }
    restore()
  }
}
