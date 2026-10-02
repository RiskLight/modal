import { createModal } from '../../src'
import { acquireBehaviors, bindEscape, inertOutside, trapFocus } from '../../src/dom'
import { A, flush } from '../helpers'

const POPOVER = '[data-popover]'

function setup() {
  document.body.innerHTML = `
    <div id="app">
      <main id="page"><button id="page-button">page</button></main>
      <div id="modal"><button id="inside">inside</button></div>
    </div>
    <div id="toast" data-popover><button id="toast-close">close</button></div>
  `
  const get = (id: string) => document.getElementById(id) as HTMLElement
  return get
}

function addPopover() {
  const popover = document.createElement('div')
  popover.setAttribute('data-popover', '')
  popover.innerHTML = '<div role="listbox" tabindex="-1" id="listbox"><div role="option" tabindex="-1" id="option">one</div></div>'
  document.body.append(popover)
  return popover
}

describe('allowOutside', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('lets focus move into an allowed element outside the trap', () => {
    const get = setup()
    const release = trapFocus(get('modal'), { allowOutside: POPOVER })
    expect(document.activeElement?.id).toBe('inside')
    addPopover()
    get('listbox').focus()
    expect(document.activeElement?.id).toBe('listbox')
    get('page-button').focus()
    expect(document.activeElement?.id).toBe('inside')
    release()
  })

  it('still pulls focus back from outside when allowOutside is not set', () => {
    const get = setup()
    const release = trapFocus(get('modal'))
    addPopover()
    get('listbox').focus()
    expect(document.activeElement?.id).toBe('inside')
    release()
  })

  it('applies the allowance of the topmost trap only', () => {
    const get = setup()
    const outer = trapFocus(get('modal'), { allowOutside: POPOVER })
    const inner = document.createElement('div')
    inner.innerHTML = '<button id="inner">inner</button>'
    document.body.append(inner)
    const release = trapFocus(inner)
    addPopover()
    get('listbox').focus()
    expect(document.activeElement?.id).toBe('inner')
    release()
    outer()
  })

  it('keeps allowed elements out of inert', () => {
    const get = setup()
    const release = inertOutside(get('modal'), { exclude: POPOVER })
    expect(get('page').inert).toBe(true)
    expect(get('toast').inert).toBe(false)
    release()
  })

  it('leaves Escape pressed inside an allowed element to that element', async () => {
    const get = setup()
    const m = createModal()
    const dispose = bindEscape(m, { allowOutside: POPOVER })
    const handle = await m.push(A)
    addPopover()
    get('listbox').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    await flush()
    expect(handle.closed).toBe(false)
    get('inside').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    await flush()
    expect(handle.closed).toBe(true)
    dispose()
  })
})

describe('allowOutside edge cases', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('ignores an invalid selector instead of breaking Escape, focus and inert', async () => {
    const get = setup()
    const m = createModal()
    const dispose = bindEscape(m, { allowOutside: '[' })
    const handle = await m.push(A)
    const release = trapFocus(get('modal'), { allowOutside: '[' })
    get('page-button').focus()
    expect(document.activeElement?.id).toBe('inside')
    expect(() => inertOutside(get('modal'), { exclude: '[' })()).not.toThrow()
    get('inside').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    await flush()
    expect(handle.closed).toBe(true)
    release()
    dispose()
  })

  it('on keyup, honours where the Escape keydown happened', async () => {
    const get = setup()
    const m = createModal()
    const dispose = bindEscape(m, { event: 'keyup', allowOutside: POPOVER })
    const handle = await m.push(A)
    const popover = addPopover()
    get('listbox').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    popover.remove()
    get('inside').dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true, cancelable: true }))
    await flush()
    expect(handle.closed).toBe(false)
    get('inside').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    get('inside').dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true, cancelable: true }))
    await flush()
    expect(handle.closed).toBe(true)
    dispose()
  })

  it('returns focus to the modal when the focused allowed element is removed', async () => {
    const get = setup()
    const release = trapFocus(get('modal'), { allowOutside: POPOVER })
    const popover = addPopover()
    get('listbox').focus()
    expect(document.activeElement?.id).toBe('listbox')
    popover.remove()
    await flush()
    expect(document.activeElement?.id).toBe('inside')
    release()
  })

  it('leaves focus alone on later DOM changes once it is back in the modal or still in the popover', async () => {
    const get = setup()
    const release = trapFocus(get('modal'), { allowOutside: POPOVER })
    addPopover()
    get('listbox').focus()
    document.body.append(document.createElement('span'))
    await flush()
    expect(document.activeElement?.id).toBe('listbox')
    get('inside').focus()
    document.body.append(document.createElement('span'))
    await flush()
    expect(document.activeElement?.id).toBe('inside')
    release()
  })

  it('combines allowOutside of every holder of the shared behaviors', async () => {
    const get = setup()
    const m = createModal()
    const first = acquireBehaviors(m, { escape: {} })
    const second = acquireBehaviors(m, { escape: { allowOutside: POPOVER } })
    const handle = await m.push(A)
    addPopover()
    get('listbox').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    await flush()
    expect(handle.closed).toBe(false)
    second()
    get('listbox').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
    await flush()
    expect(handle.closed).toBe(true)
    first()
  })
})
