import { report } from '../core/report.js'
import type { ModalManager } from '../core/types.js'
import { insideSelector, type SelectorSource } from './selector.js'

export interface EscapeOptions {
  target?: EventTarget
  event?: 'keyup' | 'keydown'
  allowOutside?: SelectorSource
}

function isEscape(event: KeyboardEvent): boolean {
  return event.key === 'Escape' || event.code === 'Escape'
}

export type EscapeSource = Pick<ModalManager<unknown>, 'topmost' | 'closeById'>

export function bindEscape(manager: EscapeSource, options: EscapeOptions = {}): () => void {
  if (typeof document === 'undefined') return () => {}
  const target = options.target ?? document
  const type = options.event ?? 'keydown'
  let pressedOutside: boolean | undefined
  const onKeydown = (event: Event) => {
    if (isEscape(event as KeyboardEvent)) pressedOutside = insideSelector(event.target, options.allowOutside)
  }
  const listener = (event: Event) => {
    const keyboard = event as KeyboardEvent
    if (!isEscape(keyboard) || keyboard.isComposing || keyboard.defaultPrevented || keyboard.repeat) return
    const outside = type === 'keyup' && pressedOutside !== undefined ? pressedOutside : insideSelector(keyboard.target, options.allowOutside)
    pressedOutside = undefined
    if (outside) return
    const top = manager.topmost((namespaceOptions, _namespace, candidate) => namespaceOptions.escClose || candidate.escClose)
    if (!top || !top.escClose || top.status !== 'open') return
    manager.closeById(top.id, { esc: true }).catch(report)
  }
  if (type === 'keyup') target.addEventListener('keydown', onKeydown, true)
  target.addEventListener(type, listener)
  let bound = true
  return () => {
    if (!bound) return
    bound = false
    target.removeEventListener(type, listener)
    if (type === 'keyup') target.removeEventListener('keydown', onKeydown, true)
  }
}
