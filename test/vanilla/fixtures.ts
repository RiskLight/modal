import type { VanillaComponent } from '../../src/vanilla'

export const Title: VanillaComponent<{ title?: string }> = props => {
  const el = document.createElement('div')
  el.className = 'title'
  el.textContent = props?.title ?? ''
  return el
}

export const Required: VanillaComponent<{ title: string }> = props => {
  const el = document.createElement('div')
  el.className = 'required'
  el.textContent = props.title
  return el
}

export const Confirm: VanillaComponent<{ question?: string }> = (props, handle) => {
  const el = document.createElement('div')
  el.className = 'confirm'
  el.innerHTML = '<h2></h2><button class="yes">Yes</button><button class="no">No</button>'
  el.querySelector('h2')!.textContent = props?.question ?? 'Sure?'
  el.querySelector<HTMLButtonElement>('.yes')!.onclick = () => void handle.resolve(true).catch(() => {})
  el.querySelector<HTMLButtonElement>('.no')!.onclick = () => void handle.resolve(false).catch(() => {})
  return el
}

export const Focusable: VanillaComponent = () => {
  const el = document.createElement('div')
  el.className = 'focusable'
  el.innerHTML = '<button id="first">1</button><button id="last">2</button>'
  return el
}

export function flush(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

export function escape(type: 'keydown' | 'keyup' = 'keydown') {
  document.dispatchEvent(new KeyboardEvent(type, { key: 'Escape', bubbles: true, cancelable: true }))
}

export function backdropClick(root: Element) {
  root.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
  root.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}
