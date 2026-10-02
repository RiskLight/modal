import { createVanillaModal as create, fromHTML, type VanillaModalCreateOptions, type VanillaModalManager } from '../../src/vanilla'
import { flush } from './fixtures'

const created: VanillaModalManager[] = []
const stops: (() => void)[] = []

function createVanillaModal(options?: VanillaModalCreateOptions): VanillaModalManager {
  const manager = create(options)
  created.push(manager)
  return manager
}

async function settle() {
  for (let i = 0; i < 4; i++) await flush()
}

const User = fromHTML<{ id: string }>('<div class="user"><h2 data-prop="id"></h2><button class="close" data-close>x</button></div>')
const Settings = fromHTML('<div class="settings"><h2>Settings</h2></div>')

beforeEach(() => {
  history.replaceState(null, '', '/')
})

afterEach(() => {
  for (const stop of stops.splice(0)) stop()
  for (const manager of created.splice(0)) manager.dispose()
  document.body.innerHTML = ''
  history.replaceState(null, '', '/')
})

function route(modal: VanillaModalManager, ...args: Parameters<VanillaModalManager['routes']>) {
  const stop = modal.routes(...args)
  stops.push(stop)
  return stop
}

const text = (selector: string) => document.querySelector(selector)?.textContent ?? null

describe('plain js router', () => {
  it('opens the modal of the current location on start', async () => {
    history.replaceState(null, '', '/users/7')
    const modal = createVanillaModal()
    route(modal, { '/users/:id': User })
    await settle()
    expect(text('.user h2')).toBe('7')
    expect(modal.current()?.isRoute).toBe(true)
  })

  it('opens on navigate and updates the url', async () => {
    const modal = createVanillaModal()
    route(modal, { '/users/:id': User })
    await modal.navigate('/users/3')
    await settle()
    expect(location.pathname).toBe('/users/3')
    expect(text('.user h2')).toBe('3')
  })

  it('closes with route: true when navigating away', async () => {
    const modal = createVanillaModal()
    route(modal, { '/users/:id': User })
    await modal.navigate('/users/3')
    await settle()
    const handle = modal.current()!
    const guard = vi.fn()
    handle.onBeforeClose(guard)
    await modal.navigate('/about')
    await settle()
    expect(handle.closed).toBe(true)
    expect(guard).toHaveBeenCalledWith({ background: false, esc: false, route: true })
    expect(location.pathname).toBe('/about')
  })

  it('cancels navigate when a guard vetoes', async () => {
    const modal = createVanillaModal()
    route(modal, { '/users/:id': User })
    await modal.navigate('/users/3')
    await settle()
    modal.current()!.onBeforeClose(() => false)
    await expect(modal.navigate('/about')).resolves.toBe(false)
    await settle()
    expect(location.pathname).toBe('/users/3')
    expect(modal.current()?.closed).toBe(false)
  })

  it('goes back when the modal is closed directly', async () => {
    const modal = createVanillaModal()
    route(modal, { '/users/:id': User })
    await modal.navigate('/list')
    await modal.navigate('/users/3')
    await settle()
    document.querySelector<HTMLElement>('.close')!.click()
    await settle()
    expect(location.pathname).toBe('/list')
    expect(document.querySelector('.user')).toBeNull()
  })

  it('goes to the fallback when the modal route was the first entry', async () => {
    history.replaceState(null, '', '/users/9')
    const modal = createVanillaModal()
    route(modal, { '/users/:id': { modal: User, fallback: '/users' } })
    await settle()
    await modal.current()!.close()
    await settle()
    expect(location.pathname).toBe('/users')
  })

  it('uses / as the default fallback', async () => {
    history.replaceState(null, '', '/users/9')
    const modal = createVanillaModal()
    route(modal, { '/users/:id': User })
    await settle()
    await modal.current()!.close()
    await settle()
    expect(location.pathname).toBe('/')
  })

  it('closes the modal on browser back and reopens on forward', async () => {
    const modal = createVanillaModal()
    route(modal, { '/users/:id': User })
    await modal.navigate('/list')
    await modal.navigate('/users/3')
    await settle()
    history.back()
    await settle()
    expect(location.pathname).toBe('/list')
    expect(document.querySelector('.user')).toBeNull()
    history.forward()
    await settle()
    expect(text('.user h2')).toBe('3')
  })

  it('returns to the modal url when a guard vetoes a back navigation', async () => {
    const modal = createVanillaModal()
    route(modal, { '/users/:id': User })
    await modal.navigate('/list')
    await modal.navigate('/users/3')
    await settle()
    const handle = modal.current()!
    handle.onBeforeClose(() => false)
    history.back()
    await settle()
    await settle()
    expect(location.pathname).toBe('/users/3')
    expect(handle.closed).toBe(false)
  })

  it('keeps the same modal and updates props when params change', async () => {
    const modal = createVanillaModal()
    route(modal, { '/users/:id': User })
    await modal.navigate('/users/1')
    await settle()
    const handle = modal.current()!
    const guard = vi.fn()
    handle.onBeforeClose(guard)
    await modal.navigate('/users/2')
    await settle()
    expect(modal.current()).toBe(handle)
    expect(guard).not.toHaveBeenCalled()
    expect(text('.user h2')).toBe('2')
  })

  it('maps params and query with props and decodes segments', async () => {
    const modal = createVanillaModal()
    const seen: unknown[] = []
    route(modal, {
      '/files/:name': {
        modal: (props: { name: string; tab: string | undefined }) => {
          seen.push(props)
          return 'file'
        },
        props: match => ({ name: match.params.name, tab: match.query.tab }),
      },
    })
    await modal.navigate('/files/my%20report?tab=history')
    await settle()
    expect(seen).toEqual([{ name: 'my report', tab: 'history' }])
  })

  it('ignores unmatched paths, trailing slashes and nested segments', async () => {
    const modal = createVanillaModal()
    route(modal, { '/users/:id': User, '/settings': Settings })
    await modal.navigate('/users/1/edit')
    await settle()
    expect(modal.getSnapshot().items).toHaveLength(0)
    await modal.navigate('/settings/')
    await settle()
    expect(document.querySelector('.settings')).not.toBeNull()
  })

  it('replaces other modals in open mode and stacks in push mode', async () => {
    const modal = createVanillaModal()
    route(modal, { '/settings': Settings, '/users/:id': { modal: User, mode: 'push' } })
    const other = await modal.push(() => 'other')
    await modal.navigate('/users/1')
    await settle()
    expect(other.closed).toBe(false)
    expect(modal.getSnapshot().items).toHaveLength(2)
    await modal.navigate('/settings')
    await settle()
    expect(other.closed).toBe(true)
  })

  it('opens registered and page-template modals by name', async () => {
    document.body.insertAdjacentHTML('beforeend', '<template data-modal="help"><div class="help">help</div></template>')
    const modal = createVanillaModal()
    route(modal, { '/help': 'help' })
    await modal.navigate('/help')
    await settle()
    expect(document.querySelector('.help')).not.toBeNull()
  })

  it('works in hash mode', async () => {
    const modal = createVanillaModal()
    route(modal, { '/users/:id': User }, { mode: 'hash' })
    await modal.navigate('/users/5')
    await settle()
    expect(location.hash).toBe('#/users/5')
    expect(text('.user h2')).toBe('5')
    location.hash = '#/other'
    await settle()
    expect(document.querySelector('.user')).toBeNull()
  })

  it('intercepts clicks on data-modal-link anchors', async () => {
    document.body.insertAdjacentHTML('beforeend', '<a id="link" href="/users/4" data-modal-link>user</a><a id="plain" href="/users/5">plain</a>')
    const modal = createVanillaModal()
    route(modal, { '/users/:id': User })
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
    document.getElementById('link')!.dispatchEvent(event)
    await settle()
    expect(event.defaultPrevented).toBe(true)
    expect(location.pathname).toBe('/users/4')
    const modified = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, metaKey: true })
    document.getElementById('link')!.dispatchEvent(modified)
    expect(modified.defaultPrevented).toBe(false)
    const plain = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })
    document.getElementById('plain')!.dispatchEvent(plain)
    expect(plain.defaultPrevented).toBe(false)
  })

  it('stops listening after stop and replaces a previous router', async () => {
    const modal = createVanillaModal()
    const stop = route(modal, { '/users/:id': User })
    route(modal, { '/settings': Settings })
    await modal.navigate('/users/1')
    await settle()
    expect(modal.getSnapshot().items).toHaveLength(0)
    stop()
    await modal.navigate('/settings')
    await settle()
    expect(document.querySelector('.settings')).not.toBeNull()
  })

  it('navigate works without routes as plain history navigation', async () => {
    const modal = createVanillaModal()
    await expect(modal.navigate('/x')).resolves.toBe(true)
    expect(location.pathname).toBe('/x')
  })
})
