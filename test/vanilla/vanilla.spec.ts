import { createVanillaModal as create, type VanillaComponent, type VanillaModalCreateOptions, type VanillaModalManager } from '../../src/vanilla'
import { backdropClick, Confirm, escape, flush, Focusable, Title } from './fixtures'

const created: VanillaModalManager[] = []

function createVanillaModal(options?: VanillaModalCreateOptions): VanillaModalManager {
  const manager = create(options)
  created.push(manager)
  return manager
}

afterEach(() => {
  for (const manager of created.splice(0)) manager.dispose()
  document.body.innerHTML = ''
  document.head.innerHTML = ''
  document.body.removeAttribute('style')
})

describe('auto mount', () => {
  it('mounts a host into body on the first open and renders the modal', async () => {
    const modal = createVanillaModal()
    await modal.push(Title, { title: 'hello' })
    const host = document.body.querySelector('[data-modal-host]')!
    expect(host).not.toBeNull()
    expect(host.querySelector('.modal-container .title')!.textContent).toBe('hello')
  })

  it('reuses the same host for later opens', async () => {
    const modal = createVanillaModal()
    await modal.push(Title)
    await modal.push(Title)
    expect(document.body.querySelectorAll('[data-modal-host]')).toHaveLength(1)
    expect(document.body.querySelectorAll('.modal-container')).toHaveLength(2)
  })

  it('mounts a separate host per namespace', async () => {
    const modal = createVanillaModal()
    await modal.push(Title, { title: 'main' })
    await modal.push(Title, { title: 'side' }, { namespace: 'side' })
    expect(document.body.querySelectorAll('[data-modal-host]')).toHaveLength(2)
  })

  it('auto mounts into a given target', async () => {
    const target = document.createElement('section')
    document.body.append(target)
    const modal = createVanillaModal({ autoMount: target })
    await modal.push(Title)
    expect(target.querySelector('[data-modal-host]')).not.toBeNull()
  })

  it('requires an explicit mount when autoMount is false', async () => {
    const modal = createVanillaModal({ autoMount: false })
    await expect(modal.push(Title)).rejects.toMatchObject({ code: 'not-hosted' })
    modal.mount()
    await expect(modal.push(Title)).resolves.toBeTruthy()
  })

  it('does not auto mount when a host already exists', async () => {
    const modal = createVanillaModal()
    const target = document.createElement('div')
    document.body.append(target)
    modal.mount(target)
    await modal.push(Title)
    expect(document.body.querySelectorAll('[data-modal-host]')).toHaveLength(1)
    expect(target.querySelector('.title')).not.toBeNull()
  })
})

describe('mount', () => {
  it('accepts a selector and applies className', async () => {
    document.body.innerHTML = '<div id="toasts"></div>'
    const modal = createVanillaModal()
    modal.mount('#toasts', { namespace: 'toast', className: 'toasts', trapFocus: false })
    await modal.push(Title, { title: 't' }, { namespace: 'toast' })
    const host = document.querySelector('#toasts [data-modal-host]')!
    expect(host.classList.contains('toasts')).toBe(true)
    expect(host.textContent).toBe('t')
  })

  it('throws for a selector that matches nothing', () => {
    expect(() => createVanillaModal().mount('#missing')).toThrow(/#missing/)
  })

  it('unmount removes everything and detaches the host', async () => {
    const modal = createVanillaModal({ autoMount: false })
    const unmount = modal.mount()
    const handle = await modal.push(Title)
    expect(document.body.style.overflow).toBe('hidden')
    unmount()
    unmount()
    expect(document.body.querySelector('[data-modal-host]')).toBeNull()
    expect(document.body.style.overflow).toBe('')
    expect(modal.isHosted()).toBe(false)
    escape()
    await flush()
    expect(handle.closed).toBe(false)
  })

  it('renders modals that were open before mounting', async () => {
    const modal = createVanillaModal({ autoMount: false, requireHost: false })
    await modal.push(Title, { title: 'early' })
    modal.mount()
    expect(document.body.querySelector('.title')!.textContent).toBe('early')
  })
})

describe('dispose', () => {
  it('unmounts every host the manager mounted and releases behaviours', async () => {
    const modal = create()
    await modal.push(Title)
    await modal.push(Title, {}, { namespace: 'side' })
    expect(document.body.style.overflow).toBe('hidden')
    modal.dispose()
    expect(document.querySelectorAll('[data-modal-host]')).toHaveLength(0)
    expect(document.body.style.overflow).toBe('')
    await expect(modal.push(Title)).rejects.toMatchObject({ code: 'disposed' })
  })
})

describe('rendering', () => {
  it('passes props and the handle to the component', async () => {
    const modal = createVanillaModal()
    let received: unknown
    const Probe: VanillaComponent<{ x: number }> = (props, handle) => {
      received = { props, id: handle.id }
      return document.createElement('div')
    }
    const handle = await modal.push(Probe, { x: 1 })
    expect(received).toEqual({ props: { x: 1 }, id: handle.id })
  })

  it('renders strings as text, never as html', async () => {
    const modal = createVanillaModal()
    await modal.push(() => '<b>not bold</b>')
    const container = document.body.querySelector('.modal-container')!
    expect(container.querySelector('b')).toBeNull()
    expect(container.textContent).toBe('<b>not bold</b>')
  })

  it('removes closed modals and calls destroy', async () => {
    const modal = createVanillaModal()
    const destroy = vi.fn()
    const handle = await modal.push(() => ({ element: document.createElement('section'), destroy }))
    await handle.close()
    expect(document.body.querySelector('section')).toBeNull()
    expect(destroy).toHaveBeenCalledOnce()
  })

  it('keeps stack order and removes from the middle', async () => {
    const modal = createVanillaModal()
    await modal.push(Title, { title: 'a' })
    const b = await modal.push(Title, { title: 'b' })
    await modal.push(Title, { title: 'c' })
    await b.close()
    expect([...document.querySelectorAll('.title')].map(el => el.textContent)).toEqual(['a', 'c'])
  })

  it('reports a throwing component and closes its modal', async () => {
    const reported = vi.fn()
    const original = globalThis.reportError
    globalThis.reportError = reported
    try {
      const modal = createVanillaModal()
      const handle = await modal.push(() => {
        throw new Error('render failed')
      })
      await flush()
      expect(reported).toHaveBeenCalledWith(expect.objectContaining({ message: 'render failed' }))
      expect(handle.closed).toBe(true)
    } finally {
      globalThis.reportError = original
    }
  })

  it('keeps upstream class names and dialog semantics on the surface', async () => {
    const modal = createVanillaModal()
    await modal.push(Confirm, {}, { extra: { ariaLabel: 'Confirm' } })
    const container = document.body.querySelector('.modal-container.widget__modal-container__item')!
    const surface = container.querySelector('.confirm')!
    expect(surface.classList.contains('modal-item')).toBe(true)
    expect(surface.getAttribute('role')).toBe('dialog')
    expect(surface.getAttribute('aria-modal')).toBe('true')
    expect(surface.getAttribute('aria-label')).toBe('Confirm')
    expect(container.hasAttribute('role')).toBe(false)
  })

  it('labels the dialog by its heading', async () => {
    const modal = createVanillaModal()
    await modal.push(Confirm, { question: 'Delete?' })
    const surface = document.body.querySelector('.confirm')!
    expect(surface.getAttribute('aria-labelledby')).toBe(surface.querySelector('h2')!.id)
  })

  it('injects styles once, honours nonce and unstyled', async () => {
    const modal = createVanillaModal({ autoMount: false })
    modal.mount(undefined, { nonce: 'n' })
    modal.mount(undefined, { namespace: 'other' })
    const styles = document.head.querySelectorAll('#risklight-modal-styles')
    expect(styles).toHaveLength(1)
    expect((styles[0] as HTMLStyleElement).nonce).toBe('n')
    document.head.innerHTML = ''
    createVanillaModal({ autoMount: false }).mount(undefined, { namespace: 'third', unstyled: true })
    expect(document.getElementById('risklight-modal-styles')).toBeNull()
  })
})

describe('behaviour', () => {
  it('resolves prompts from the component', async () => {
    const modal = createVanillaModal()
    const result = modal.prompt<boolean>(Confirm)
    await flush()
    document.querySelector<HTMLButtonElement>('.yes')!.click()
    expect(await result).toBe(true)
    expect(document.querySelector('.confirm')).toBeNull()
  })

  it('closes on Escape and on a backdrop click, keyup and pointerdown when configured', async () => {
    const modal = createVanillaModal()
    const a = await modal.push(Title)
    escape()
    await flush()
    expect(a.closed).toBe(true)
    const b = await modal.push(Title)
    backdropClick(document.querySelector('.modal-container')!)
    await flush()
    expect(b.closed).toBe(true)

    const other = createVanillaModal({ autoMount: false })
    other.mount(undefined, { namespace: 'legacy', escapeEvent: 'keyup', backdropTrigger: 'pointerdown' })
    const c = await other.push(Title, {}, { namespace: 'legacy' })
    escape('keyup')
    await flush()
    expect(c.closed).toBe(true)
    const d = await other.push(Title, {}, { namespace: 'legacy' })
    document.querySelector('[data-modal-host]:last-child .modal-container')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await flush()
    expect(d.closed).toBe(true)
  })

  it('traps focus, makes the page inert and returns focus on close', async () => {
    const page = document.createElement('main')
    const opener = document.createElement('button')
    page.append(opener)
    document.body.append(page)
    opener.focus()
    const modal = createVanillaModal()
    const handle = await modal.push(Focusable)
    expect(document.activeElement?.id).toBe('first')
    expect(page.inert).toBe(true)
    expect(document.body.style.overflow).toBe('hidden')
    await handle.close()
    await flush()
    expect(page.inert).toBe(false)
    expect(document.activeElement).toBe(opener)
    expect(document.body.style.overflow).toBe('')
  })

  it('skips trapping and inert with trapFocus false', async () => {
    const page = document.createElement('main')
    document.body.append(page)
    const modal = createVanillaModal({ autoMount: false })
    modal.mount(undefined, { trapFocus: false })
    await modal.push(Focusable)
    expect(page.inert).toBe(false)
    expect(document.activeElement?.id).not.toBe('first')
  })

  it('keeps allowOutside elements usable', async () => {
    const popover = document.createElement('div')
    popover.setAttribute('data-popover', '')
    document.body.append(popover)
    const modal = createVanillaModal({ autoMount: false })
    modal.mount(undefined, { allowOutside: '[data-popover]' })
    await modal.push(Focusable)
    expect(popover.inert).toBe(false)
  })

  it('shows only the top modal with singleShow and restores the lower one', async () => {
    const modal = createVanillaModal({ defaults: { singleShow: true } })
    await modal.push(Focusable)
    ;(document.getElementById('last') as HTMLElement).focus()
    const top = await modal.push(Title)
    const shown = () => [...document.querySelectorAll<HTMLElement>('.modal-container')].map(el => el.style.display !== 'none')
    expect(shown()).toEqual([false, true])
    await top.close()
    await flush()
    expect(shown()).toEqual([true])
    expect(document.activeElement?.id).toBe('last')
  })

  it('auto closes with timeout', async () => {
    vi.useFakeTimers()
    try {
      const modal = createVanillaModal({ namespaces: { toast: { timeout: 1000 } } })
      await modal.push(Title, {}, { namespace: 'toast' })
      expect(document.querySelectorAll('.title')).toHaveLength(1)
      await vi.advanceTimersByTimeAsync(1000)
      expect(document.querySelectorAll('.title')).toHaveLength(0)
    } finally {
      vi.useRealTimers()
    }
  })

  it('drags by a handle selector', async () => {
    const modal = createVanillaModal()
    await modal.push(
      () => {
        const el = document.createElement('div')
        el.className = 'draggable'
        el.innerHTML = '<header class="grip">drag</header>'
        return el
      },
      {},
      { draggable: '.grip' },
    )
    const surface = document.querySelector('.draggable') as HTMLElement
    document.querySelector('.grip')!.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, clientY: 0, bubbles: true, button: 0, pointerType: 'mouse' }))
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 7, clientY: 3, bubbles: true }))
    document.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    expect(surface.style.transform).toBe('translate(7px, 3px)')
  })

  it('opens registered components by name', async () => {
    const modal = createVanillaModal({ registry: { confirm: Confirm } })
    const result = modal.prompt<boolean>('confirm', { question: 'By name?' })
    await flush()
    expect(document.querySelector('.confirm h2')!.textContent).toBe('By name?')
    document.querySelector<HTMLButtonElement>('.no')!.click()
    expect(await result).toBe(false)
  })

  it('open replaces the stack', async () => {
    const modal = createVanillaModal()
    await modal.push(Title, { title: 'a' })
    await modal.open(Title, { title: 'b' })
    expect([...document.querySelectorAll('.title')].map(el => el.textContent)).toEqual(['b'])
  })

  it('exposes the core manager', async () => {
    const modal = createVanillaModal()
    const handle = await modal.push(Title)
    expect(modal.core.get(handle.id)).toBe(handle)
  })
})
