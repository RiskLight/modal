import { createModal } from '../../src'
import { bindEscape, inertOutside, trapFocus } from '../../src/dom'
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
