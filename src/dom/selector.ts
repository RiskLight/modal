export type SelectorSource = string | undefined | (() => string | undefined)

export function readSelector(source: SelectorSource): string | undefined {
  return typeof source === 'function' ? source() : source
}

export function isValidSelector(selector: string | undefined): selector is string {
  if (!selector || typeof document === 'undefined') return false
  try {
    document.createDocumentFragment().querySelector(selector)
    return true
  } catch {
    return false
  }
}

function isElement(target: EventTarget): target is Element {
  return 'nodeType' in target && target.nodeType === 1 && 'closest' in target
}

export function insideSelector(target: EventTarget | null | undefined, source: SelectorSource): boolean {
  const selector = readSelector(source)
  if (!target || !isElement(target) || !isValidSelector(selector)) return false
  return target.closest(selector) !== null
}

export function joinSelectors(...selectors: Array<string | undefined>): string {
  return selectors.filter(isValidSelector).join(', ')
}
