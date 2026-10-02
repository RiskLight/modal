import { isRecord } from '../core/guards.js'
import { report } from '../core/report.js'
import type { VanillaComponent, VanillaModalHandle, VanillaRendered } from './types.js'

export type TemplateSetup<P> = (root: Element, props: P, handle: VanillaModalHandle) => void | (() => void)

type Fields = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

function isField(element: Element): element is Fields {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement
}

function each(root: Element, selector: string, apply: (element: Element) => void): void {
  if (root.matches(selector)) apply(root)
  for (const element of Array.from(root.querySelectorAll(selector))) apply(element)
}

function parseValue(raw: string): unknown {
  if (raw === '') return raw
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

function bind(root: Element, props: unknown, handle: VanillaModalHandle): void {
  const values = isRecord(props) ? props : {}
  each(root, '[data-prop]', element => {
    const value = values[element.getAttribute('data-prop') ?? '']
    const text = value === undefined || value === null ? '' : String(value)
    if (isField(element)) element.value = text
    else element.textContent = text
  })
  each(root, '[data-close]', element => {
    element.addEventListener('click', () => {
      handle.close().catch(report)
    })
  })
  each(root, '[data-emit]', element => {
    element.addEventListener('click', () => handle.emit(element.getAttribute('data-emit') ?? ''))
  })
  each(root, '[data-resolve]', element => {
    if (element instanceof HTMLFormElement) {
      element.addEventListener('submit', event => {
        event.preventDefault()
        handle.resolve(Object.fromEntries(new FormData(element))).catch(report)
      })
      return
    }
    element.addEventListener('click', () => {
      handle.resolve(parseValue(element.getAttribute('data-resolve') ?? '')).catch(report)
    })
  })
}

function materialize(template: HTMLTemplateElement): Element {
  const content = document.importNode(template.content, true)
  const [first, ...rest] = Array.from(content.children)
  const text = Array.from(content.childNodes).some(node => node.nodeType === 3 && node.textContent?.trim())
  if (first && rest.length === 0 && !text) return first
  const surface = document.createElement('div')
  surface.append(content)
  return surface
}

function component<P>(resolveTemplate: () => HTMLTemplateElement, setup?: TemplateSetup<P>): VanillaComponent<P> {
  return (props, handle): VanillaRendered => {
    const root = materialize(resolveTemplate())
    bind(root, props, handle)
    const cleanup = setup?.(root, props, handle)
    return { element: root, destroy: typeof cleanup === 'function' ? cleanup : undefined }
  }
}

export function findPageTemplate(name: string): HTMLTemplateElement | undefined {
  return Array.from(document.querySelectorAll<HTMLTemplateElement>('template[data-modal]')).find(
    template => template.getAttribute('data-modal') === name,
  )
}

export function fromTemplate<P = Record<string, unknown>>(source: HTMLTemplateElement | string, setup?: TemplateSetup<P>): VanillaComponent<P> {
  return component(() => {
    const template = typeof source === 'string' ? document.querySelector(source) : source
    if (!(template instanceof HTMLTemplateElement)) throw new Error(`Modal template "${String(source)}" was not found`)
    return template
  }, setup)
}

export function fromHTML<P = Record<string, unknown>>(html: string, setup?: TemplateSetup<P>): VanillaComponent<P> {
  return component(() => {
    const template = document.createElement('template')
    template.innerHTML = html
    return template
  }, setup)
}
