import type { ModalManager } from '../core/types.js'

export interface EscapeOptions {
  target?: EventTarget
  event?: 'keyup' | 'keydown'
}

function isEscape(event: KeyboardEvent): boolean {
  return event.key === 'Escape' || event.code === 'Escape'
}

export function bindEscape(manager: ModalManager<any>, options: EscapeOptions = {}): () => void {
  if (typeof document === 'undefined') return () => {}
  const target = options.target ?? document
  const type = options.event ?? 'keyup'
  const listener = (event: Event) => {
    const keyboard = event as KeyboardEvent
    if (!isEscape(keyboard) || keyboard.isComposing || keyboard.defaultPrevented) return
    const top = manager.topmost(namespaceOptions => namespaceOptions.escClose)
    if (!top || !top.escClose || top.status !== 'open') return
    manager.closeById(top.id, { esc: true }).catch(() => {})
  }
  target.addEventListener(type, listener)
  let bound = true
  return () => {
    if (!bound) return
    bound = false
    target.removeEventListener(type, listener)
  }
}
