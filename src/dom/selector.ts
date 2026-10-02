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

export function insideSelector(target: EventTarget | null | undefined, source: SelectorSource): boolean {
  const selector = readSelector(source)
  if (!target || (target as Node).nodeType !== 1 || !isValidSelector(selector)) return false
  return (target as Element).closest(selector) !== null
}

export function joinSelectors(...selectors: Array<string | undefined>): string {
  return selectors.filter(isValidSelector).join(', ')
}
