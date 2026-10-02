export interface InertOptions {
  exclude?: string
}

interface InertState {
  count: number
  previous: boolean
}

const states = new WeakMap<HTMLElement, InertState>()

const SKIPPED = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'LINK', 'META', 'NOSCRIPT'])

function excluded(element: HTMLElement, selector: string): boolean {
  try {
    return element.matches(selector) || element.querySelector(selector) !== null
  } catch {
    return false
  }
}

function collect(keep: HTMLElement, exclude: string | undefined): HTMLElement[] {
  const targets: HTMLElement[] = []
  let node: HTMLElement | null = keep
  while (node && node !== document.body && node.parentElement) {
    for (const sibling of Array.from(node.parentElement.children)) {
      if (sibling === node || !(sibling instanceof HTMLElement) || SKIPPED.has(sibling.tagName)) continue
      if (exclude && excluded(sibling, exclude)) continue
      targets.push(sibling)
    }
    node = node.parentElement
  }
  return targets
}

export function inertOutside(keep: HTMLElement, options: InertOptions = {}): () => void {
  if (typeof document === 'undefined') return () => {}
  const targets = collect(keep, options.exclude)
  for (const target of targets) {
    const state = states.get(target)
    if (state) {
      state.count++
      continue
    }
    states.set(target, { count: 1, previous: target.inert })
    target.inert = true
  }
  let active = true
  return () => {
    if (!active) return
    active = false
    for (const target of targets) {
      const state = states.get(target)
      if (!state) continue
      state.count--
      if (state.count > 0) continue
      states.delete(target)
      target.inert = state.previous
    }
  }
}
