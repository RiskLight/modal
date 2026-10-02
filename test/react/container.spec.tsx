import { act, fireEvent, render } from '@testing-library/react'
import { StrictMode } from 'react'
import { createReactModal, ModalContainer, ModalProvider } from '../../src/react'
import { Alert, Counter, Draggable, Emitter, escape, flushReact, Focusable, Headed, renderContainer, Title, Toggling } from './fixtures'

afterEach(() => {
  document.head.innerHTML = ''
  document.body.removeAttribute('style')
})

describe('rendering', () => {
  it('renders open modals in order and removes closed ones', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    const a = await act(() => modal.push(Title, { title: 'a' }))
    await act(() => modal.push(Title, { title: 'b' }))
    expect([...view.container.querySelectorAll('.title')].map(el => el.textContent)).toEqual(['a', 'b'])
    await act(() => a.close())
    expect([...view.container.querySelectorAll('.title')].map(el => el.textContent)).toEqual(['b'])
  })

  it('renders only its own namespace', async () => {
    const modal = createReactModal()
    const view = render(
      <ModalProvider manager={modal}>
        <div id="main"><ModalContainer /></div>
        <div id="side"><ModalContainer namespace="side" /></div>
      </ModalProvider>,
    )
    await act(() => modal.push(Title, { title: 'main' }))
    await act(() => modal.push(Title, { title: 'side' }, { namespace: 'side' }))
    expect(view.container.querySelector('#main')!.textContent).toBe('main')
    expect(view.container.querySelector('#side')!.textContent).toBe('side')
  })

  it('passes html attributes to the host element and marks it as a host', () => {
    const modal = createReactModal()
    const view = renderContainer(modal, { id: 'host', className: 'custom', 'aria-live': 'polite' } as never)
    const host = view.container.querySelector('#host')!
    expect(host.classList.contains('custom')).toBe(true)
    expect(host.getAttribute('aria-live')).toBe('polite')
    expect(host.hasAttribute('data-modal-host')).toBe(true)
  })

  it('keeps upstream class names', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    await act(() => modal.push(Title))
    expect(view.container.querySelector('.modal-container.widget__modal-container__item')).not.toBeNull()
    expect(view.container.querySelector('.title')!.classList.contains('modal-item')).toBe(true)
  })

  it('passes props to the component', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    await act(() => modal.push(Title, { title: 'hello', extra: 2 }))
    expect(view.container.querySelector('.title')!.textContent).toBe('hello 2')
  })

  it('keeps component state across unrelated updates', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    const handle = await act(() => modal.push(Counter))
    fireEvent.click(view.container.querySelector('.counter')!)
    act(() => {
      handle.backgroundClose = false
    })
    expect(view.container.querySelector('.counter')!.textContent).toBe('1')
  })

  it('works under StrictMode', async () => {
    const modal = createReactModal()
    const view = render(
      <StrictMode>
        <ModalProvider manager={modal}>
          <ModalContainer />
        </ModalProvider>
      </StrictMode>,
    )
    const handle = await act(() => modal.push(Focusable))
    expect(view.container.querySelector('.focusable')).not.toBeNull()
    expect(document.activeElement?.id).toBe('first')
    await act(() => handle.close())
    expect(modal.isHosted()).toBe(true)
  })
})

describe('accessibility', () => {
  it('returns focus to the opener under StrictMode', async () => {
    const modal = createReactModal()
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    render(
      <StrictMode>
        <ModalProvider manager={modal}>
          <ModalContainer />
        </ModalProvider>
      </StrictMode>,
    )
    const handle = await act(() => modal.push(Focusable))
    expect(document.activeElement?.id).toBe('first')
    await act(() => handle.close())
    await flushReact()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it('keeps the surface class when the component changes its className', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    await act(() => modal.push(Toggling))
    fireEvent.click(view.container.querySelector('.toggle')!)
    await flushReact()
    const surface = view.container.querySelector('.toggling')!
    expect(surface.classList.contains('b')).toBe(true)
    expect(surface.classList.contains('modal-item')).toBe(true)
  })

  it('marks the surface as a modal dialog and leaves the backdrop without a role', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    await act(() => modal.push(Title))
    const surface = view.container.querySelector('.title')!
    expect(surface.getAttribute('role')).toBe('dialog')
    expect(surface.getAttribute('aria-modal')).toBe('true')
    expect(view.container.querySelector('.modal-container')!.hasAttribute('role')).toBe(false)
  })

  it('labels the dialog by its heading and keeps the component role and label', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    await act(() => modal.push(Headed))
    await act(() => modal.push(Alert))
    const headed = view.container.querySelector('.headed')!
    expect(headed.getAttribute('aria-labelledby')).toBe(headed.querySelector('h2')!.id)
    const alert = view.container.querySelector('.alert')!
    expect(alert.getAttribute('role')).toBe('alertdialog')
    expect(alert.getAttribute('aria-label')).toBe('Mine')
    expect(alert.hasAttribute('aria-labelledby')).toBe(false)
  })

  it('applies labels from options extra', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    await act(() => modal.push(Title, {}, { extra: { ariaLabel: 'Settings' } }))
    expect(view.container.querySelector('.title')!.getAttribute('aria-label')).toBe('Settings')
  })

  it('moves focus in and returns it to the opener on close', async () => {
    const modal = createReactModal()
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    renderContainer(modal)
    const handle = await act(() => modal.push(Focusable))
    expect(document.activeElement?.id).toBe('first')
    await act(() => handle.close())
    await flushReact()
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })

  it('makes the rest of the page inert while a modal is open', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal, {}, <main id="page">page</main>)
    const page = view.container.querySelector('#page') as HTMLElement
    const handle = await act(() => modal.push(Title))
    expect(page.inert).toBe(true)
    await act(() => handle.close())
    expect(page.inert).toBe(false)
  })

  it('skips focus trapping and inert when trapFocus is false', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal, { trapFocus: false }, <main id="page">page</main>)
    await act(() => modal.push(Focusable))
    expect((view.container.querySelector('#page') as HTMLElement).inert).toBe(false)
    expect(document.activeElement?.id).not.toBe('first')
  })

  it('returns focus to the lower modal under singleShow', async () => {
    const modal = createReactModal({ defaults: { singleShow: true } })
    renderContainer(modal)
    await act(() => modal.push(Focusable))
    ;(document.getElementById('last') as HTMLElement).focus()
    const top = await act(() => modal.push(Title))
    await act(() => top.close())
    await flushReact()
    expect(document.activeElement?.id).toBe('last')
  })
})

describe('closing', () => {
  it('closes on a backdrop click with background: true', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    const handle = await act(() => modal.push(Title))
    const guard = vi.fn()
    handle.onBeforeClose(guard)
    const backdrop = view.container.querySelector('.modal-container')!
    fireEvent.pointerDown(backdrop)
    fireEvent.click(backdrop)
    await flushReact()
    expect(handle.closed).toBe(true)
    expect(guard).toHaveBeenCalledWith({ background: true, esc: false, route: false })
  })

  it('does not close when the press started inside the content', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    const handle = await act(() => modal.push(Title))
    fireEvent.pointerDown(view.container.querySelector('.title')!)
    fireEvent.click(view.container.querySelector('.modal-container')!)
    await flushReact()
    expect(handle.closed).toBe(false)
  })

  it('closes on pointerdown with backdropTrigger pointerdown', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal, { backdropTrigger: 'pointerdown' })
    const handle = await act(() => modal.push(Title))
    fireEvent.pointerDown(view.container.querySelector('.modal-container')!)
    await flushReact()
    expect(handle.closed).toBe(true)
  })

  it('respects backgroundClose false', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    const handle = await act(() => modal.push(Title, {}, { backgroundClose: false }))
    const backdrop = view.container.querySelector('.modal-container')!
    fireEvent.pointerDown(backdrop)
    fireEvent.click(backdrop)
    await flushReact()
    expect(handle.closed).toBe(false)
  })

  it('closes on Escape keydown, or keyup when configured', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    const handle = await act(() => modal.push(Title))
    escape()
    await flushReact()
    expect(handle.closed).toBe(true)
    view.unmount()
    const other = createReactModal()
    renderContainer(other, { escapeEvent: 'keyup' })
    const second = await act(() => other.push(Title))
    escape('keydown')
    await flushReact()
    expect(second.closed).toBe(false)
    escape('keyup')
    await flushReact()
    expect(second.closed).toBe(true)
  })

  it('locks body scroll while open and releases everything on unmount', async () => {
    const modal = createReactModal({ requireHost: false })
    const view = renderContainer(modal)
    const handle = await act(() => modal.push(Title))
    expect(document.body.style.overflow).toBe('hidden')
    view.unmount()
    expect(document.body.style.overflow).toBe('')
    escape()
    await flushReact()
    expect(handle.closed).toBe(false)
    expect(modal.isHosted()).toBe(false)
  })

  it('skips Escape and scroll lock when behaviors is false', async () => {
    const modal = createReactModal()
    renderContainer(modal, { behaviors: false })
    const handle = await act(() => modal.push(Title))
    expect(document.body.style.overflow).toBe('')
    escape()
    await flushReact()
    expect(handle.closed).toBe(false)
  })
})

describe('events, singleShow, styles and dragging', () => {
  it('forwards handle listeners as on* props and keeps props callbacks', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    const fromProps = vi.fn()
    const handle = await act(() => modal.push(Emitter, { value: 3, onSave: fromProps }))
    const fromHandle = vi.fn()
    act(() => {
      handle.on('save', fromHandle)
    })
    fireEvent.click(view.container.querySelector('.save')!)
    expect(fromProps).toHaveBeenCalledWith(3)
    expect(fromHandle).toHaveBeenCalledWith(3)
  })

  it('shows only the top modal with singleShow', async () => {
    const modal = createReactModal({ defaults: { singleShow: true } })
    const view = renderContainer(modal)
    await act(() => modal.push(Title))
    await act(() => modal.push(Title))
    const shown = [...view.container.querySelectorAll<HTMLElement>('.modal-container')].map(el => el.style.display !== 'none')
    expect(shown).toEqual([false, true])
  })

  it('injects styles once with a nonce and skips them when unstyled', () => {
    renderContainer(createReactModal(), { nonce: 'xyz' })
    renderContainer(createReactModal(), { namespace: 'other' })
    const styles = document.head.querySelectorAll('#risklight-modal-styles')
    expect(styles).toHaveLength(1)
    expect((styles[0] as HTMLStyleElement).nonce).toBe('xyz')
    document.head.innerHTML = ''
    renderContainer(createReactModal(), { unstyled: true, namespace: 'third' })
    expect(document.getElementById('risklight-modal-styles')).toBeNull()
  })

  it('drags by a handle selector', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    await act(() => modal.push(Draggable, {}, { draggable: '.handle' }))
    const surface = view.container.querySelector('.draggable') as HTMLElement
    const grip = view.container.querySelector('.handle') as HTMLElement
    grip.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, clientY: 0, bubbles: true, button: 0, pointerType: 'mouse' }))
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 5, clientY: 6, bubbles: true }))
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    expect(surface.style.transform).toBe('translate(5px, 6px)')
  })
})
