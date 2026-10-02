import type { ModalManager } from '../core/types.js'

export interface EscapeOptions {
  target?: EventTarget
  event?: 'keyup' | 'keydown'
  allowOutside?: string
}

function isEscape(event: KeyboardEvent): boolean {
  return event.key === 'Escape' || event.code === 'Escape'
}

export type EscapeSource = Pick<ModalManager<any>, 'topmost' | 'closeById'>

export function bindEscape(manager: EscapeSource, options: EscapeOptions = {}): () => void {
  if (typeof document === 'undefined') return () => {}
  const target = options.target ?? document
  const type = options.event ?? 'keydown'
  const listener = (event: Event) => {
    const keyboard = event as KeyboardEvent
    if (!isEscape(keyboard) || keyboard.isComposing || keyboard.defaultPrevented || keyboard.repeat) return
    if (options.allowOutside && keyboard.target instanceof Element && keyboard.target.closest(options.allowOutside)) return
    const top = manager.topmost((namespaceOptions, _namespace, candidate) => namespaceOptions.escClose || candidate.escClose)
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
