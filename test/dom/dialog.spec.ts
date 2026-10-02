import { createModal } from '../../src'
import { createDialogItem, dialogLabelAttrs, injectStyles, STYLE_ID } from '../../src/dom'
import { A, flush } from '../helpers'

function build(surfaceHtml = '<button id="first"></button><button id="last"></button>') {
  const root = document.createElement('div')
  root.innerHTML = `<section class="surface">${surfaceHtml}</section>`
  document.body.append(root)
  return { root, surface: root.firstElementChild as HTMLElement }
}

function event(target: EventTarget, currentTarget: EventTarget) {
  return { target, currentTarget, stopPropagation: vi.fn() }
}

describe('createDialogItem', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('applies dialog defaults to the surface on mount without overriding its own', async () => {
    const m = createModal()
    const { root, surface } = build('<h2>Title</h2>')
    const item = createDialogItem(await m.push(A))
    item.mount(root)
    expect(surface.getAttribute('role')).toBe('dialog')
    expect(surface.getAttribute('aria-modal')).toBe('true')
    expect(surface.getAttribute('aria-labelledby')).toBe(surface.querySelector('h2')!.id)
    item.unmount()
    const second = build()
    second.surface.setAttribute('role', 'alertdialog')
    createDialogItem(await m.push(A)).mount(second.root)
    expect(second.surface.getAttribute('role')).toBe('alertdialog')
  })

  it('traps focus while active and returns it after the handle closes', async () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const m = createModal()
    const handle = await m.push(A)
    const { root } = build()
    const item = createDialogItem(handle)
    item.mount(root)
    expect(document.activeElement?.id).toBe('first')
    await handle.close()
    item.unmount()
    expect(document.activeElement).toBe(opener)
  })

  it('pauses the trap while inactive and restores the saved focus on resume', async () => {
    const m = createModal()
    const { root } = build()
    const item = createDialogItem(await m.push(A))
    item.mount(root)
    ;(document.getElementById('last') as HTMLElement).focus()
    item.update({ active: false })
    document.body.focus()
    item.update({ active: true })
    expect(document.activeElement?.id).toBe('last')
    item.unmount()
  })

  it('does not trap focus when trapFocus is false', async () => {
    const m = createModal()
    const { root } = build()
    const item = createDialogItem(await m.push(A), { trapFocus: false })
    item.mount(root)
    expect(document.activeElement?.id).not.toBe('first')
    item.unmount()
  })

  it('closes from the backdrop on click after a backdrop press', async () => {
    const m = createModal()
    const handle = await m.push(A)
    const { root, surface } = build()
    const item = createDialogItem(handle)
    item.mount(root)
    item.pointerdown(event(surface, root))
    item.click(event(root, root))
    await flush()
    expect(handle.closed).toBe(false)
    const down = event(root, root)
    item.pointerdown(down)
    expect(down.stopPropagation).toHaveBeenCalled()
    item.click(event(root, root))
    await flush()
    expect(handle.closed).toBe(true)
    item.unmount()
  })

  it('closes on pointerdown with the pointerdown trigger and respects backgroundClose', async () => {
    const m = createModal()
    const handle = await m.push(A, {}, { backgroundClose: false })
    const { root } = build()
    const item = createDialogItem(handle, { backdropTrigger: 'pointerdown' })
    item.mount(root)
    item.pointerdown(event(root, root))
    await flush()
    expect(handle.closed).toBe(false)
    handle.backgroundClose = true
    item.pointerdown(event(root, root))
    await flush()
    expect(handle.closed).toBe(true)
    item.unmount()
  })

  it('binds dragging and rebinds when draggable changes', async () => {
    const m = createModal()
    const handle = await m.push(A)
    const { root, surface } = build('<header class="grip"></header>')
    const item = createDialogItem(handle, { trapFocus: false })
    item.mount(root)
    handle.draggable = '.grip'
    item.update({})
    const grip = surface.querySelector('.grip') as HTMLElement
    grip.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, clientY: 0, bubbles: true, button: 0, pointerType: 'mouse' }))
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 3, clientY: 1, bubbles: true }))
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    expect(surface.style.transform).toBe('translate(3px, 1px)')
    handle.draggable = '[[['
    expect(() => item.update({})).not.toThrow()
    item.unmount()
  })

  it('applies given labels and surface classes on mount', async () => {
    const m = createModal()
    const { root, surface } = build('<h2>Heading</h2>')
    const item = createDialogItem(await m.push(A), { labels: { 'aria-label': 'Named' }, surfaceClass: 'modal-item widget__modal-wrap' })
    item.mount(root)
    expect(surface.getAttribute('aria-label')).toBe('Named')
    expect(surface.getAttribute('aria-labelledby')).toBeNull()
    expect(surface.classList.contains('modal-item')).toBe(true)
    expect(surface.classList.contains('widget__modal-wrap')).toBe(true)
    item.unmount()
  })

  it('is safe to unmount twice and before mount', async () => {
    const m = createModal()
    const item = createDialogItem(await m.push(A))
    expect(() => {
      item.unmount()
      item.unmount()
    }).not.toThrow()
  })
})

describe('dialogLabelAttrs', () => {
  it('returns only the labels that are set', () => {
    expect(dialogLabelAttrs({})).toEqual({})
    expect(dialogLabelAttrs({ ariaLabel: 'a', ariaLabelledby: 'b', other: 1 })).toEqual({ 'aria-label': 'a', 'aria-labelledby': 'b' })
  })
})

describe('injectStyles from dom', () => {
  afterEach(() => {
    document.head.innerHTML = ''
  })

  it('injects the stylesheet once with an optional nonce', () => {
    injectStyles(document, 'n')
    injectStyles(document)
    const styles = document.head.querySelectorAll(`#${STYLE_ID}`)
    expect(styles).toHaveLength(1)
    expect((styles[0] as HTMLStyleElement).nonce).toBe('n')
  })
})
