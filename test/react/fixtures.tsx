import { act, render } from '@testing-library/react'
import { useState, type ReactNode } from 'react'
import { ModalContainer, ModalProvider, useBeforeModalClose, useCurrentModal, useModalResolve, type ModalContainerProps, type ReactModalManager } from '../../src/react'

export function Title({ title = '', extra = 0 }: { title?: string; extra?: number }) {
  return <div className="title">{title}{extra ? ` ${extra}` : ''}</div>
}

export function Required({ title }: { title: string }) {
  return <div className="required">{title}</div>
}

export function Emitter({ value, onSave }: { value?: unknown; onSave?: (value: unknown) => void }) {
  return <div className="emitter"><button className="save" onClick={() => onSave?.(value)}>save</button></div>
}

export function Resolver({ value }: { value?: unknown }) {
  const resolve = useModalResolve()
  return <button className="resolve" onClick={() => resolve(value).catch(() => {})}>resolve</button>
}

export function Guarded({ verdict, seen }: { verdict: () => boolean | void; seen?: unknown[] }) {
  const handle = useCurrentModal()
  useBeforeModalClose(event => {
    seen?.push(event)
    return verdict()
  })
  return <div className="guarded">{handle.id}</div>
}

export function Focusable() {
  return <div className="focusable"><button id="first">1</button><button id="last">2</button></div>
}

export function Headed() {
  return <section className="headed"><h2>Heading</h2><p>body</p></section>
}

export function Alert() {
  return <div className="alert" role="alertdialog" aria-label="Mine"><h2>Heading</h2></div>
}

export function Draggable() {
  return <div className="draggable"><header className="handle">drag</header></div>
}

export function Counter() {
  const [count, setCount] = useState(0)
  return <button className="counter" onClick={() => setCount(count + 1)}>{count}</button>
}

export function renderContainer(manager: ReactModalManager, props: Partial<ModalContainerProps> = {}, extra?: ReactNode) {
  return render(
    <ModalProvider manager={manager}>
      {extra}
      <ModalContainer {...props} />
    </ModalProvider>,
  )
}

export async function flushReact() {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0))
  })
}

export function escape(type: 'keydown' | 'keyup' = 'keydown') {
  document.dispatchEvent(new KeyboardEvent(type, { key: 'Escape', bubbles: true, cancelable: true }))
}
