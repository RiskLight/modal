import type { ModalManager } from '../core/types.js'

export interface EscapeOptions {
  target?: EventTarget
  event?: 'keyup' | 'keydown'
}

export interface ScrollLockOptions {
  target?: HTMLElement
}

export interface FocusTrapOptions {
  initialFocus?: HTMLElement | string
  returnFocus?: boolean
}

export interface BehaviorOptions {
  escape?: boolean | EscapeOptions
  scrollLock?: boolean | ScrollLockOptions
}

function stub(): never {
  throw new Error('not implemented')
}

export function bindEscape(_manager: ModalManager<any>, _options?: EscapeOptions): () => void {
  return stub()
}

export function bindScrollLock(_manager: ModalManager<any>, _options?: ScrollLockOptions): () => void {
  return stub()
}

export function acquireBehaviors(_manager: ModalManager<any>, _options?: BehaviorOptions): () => void {
  return stub()
}

export function trapFocus(_element: HTMLElement, _options?: FocusTrapOptions): () => void {
  return stub()
}

export function makeDraggable(_element: HTMLElement, _handle: HTMLElement): () => void {
  return stub()
}

export function focusableElements(_root: HTMLElement): HTMLElement[] {
  return stub()
}
