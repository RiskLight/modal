import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter, RouterView, type Router } from 'vue-router'
import { createModalRoute, createVueModal, installModalRouter, ModalContainer, onBeforeModalClose, type VueModalManager } from '../../src/vue'
import { flush } from '../helpers'

const Home = defineComponent({ name: 'Home', render: () => h('p', 'home') })
const Page = defineComponent({ name: 'Page', render: () => h('p', 'page') })
const RouteModal = defineComponent({ name: 'RouteModal', render: () => h('p', { class: 'route-modal' }, 'route modal') })
const UserModal = defineComponent({
  name: 'UserModal',
  props: { id: { type: String, required: true } },
  render() {
    return h('p', { class: 'user' }, `user-${this.id}`)
  },
})
const GuardModal = defineComponent({
  name: 'GuardModal',
  setup() {
    onBeforeModalClose(() => false)
    return () => h('p', 'guarded')
  },
})
const Users = defineComponent({ name: 'Users', render: () => h('div', [h('p', 'users'), h(RouterView, { name: 'modal' })]) })

function setup(options: { mode?: 'open' | 'push'; fallback?: string } = {}) {
  const modal = createVueModal()
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: Home },
      { path: '/page', component: Page },
      { path: '/modal', component: createModalRoute(RouteModal, { mode: options.mode, fallback: options.fallback }) },
      { path: '/guard', component: createModalRoute(GuardModal) },
      { path: '/mapped/:id', component: createModalRoute(UserModal, { props: route => ({ id: `m${String(route.params.id)}` }) }) },
      { path: '/users', component: Users, children: [{ path: ':id', components: { modal: createModalRoute(UserModal) } }] },
      { path: '/redirect', redirect: '/page' },
      { path: '/parent', children: [{ path: 'child', component: Page }] },
    ],
  })
  const App = defineComponent({ render: () => h('div', [h(RouterView), h(ModalContainer)]) })
  const wrapper = mount(App, { global: { plugins: [router, modal] }, attachTo: document.body })
  const dispose = installModalRouter(router, modal)
  return { modal, router, wrapper, dispose }
}

async function go(router: Router, path: string) {
  await router.push(path).catch(() => {})
  await flush()
  await nextTick()
}

describe('router integration', () => {
  let ctx: ReturnType<typeof setup>
  afterEach(() => {
    ctx?.dispose()
    ctx?.wrapper.unmount()
    document.body.innerHTML = ''
  })

  it('renders plain routes normally', async () => {
    ctx = setup()
    await go(ctx.router, '/')
    expect(ctx.wrapper.text()).toBe('home')
  })

  it('opens the modal when entering a modal route', async () => {
    ctx = setup()
    await go(ctx.router, '/')
    await go(ctx.router, '/modal')
    expect(ctx.wrapper.find('.route-modal').exists()).toBe(true)
    expect(ctx.modal.current()?.isRoute).toBe(true)
  })

  it('opens the modal on initial navigation', async () => {
    ctx = setup()
    await go(ctx.router, '/modal')
    expect(ctx.wrapper.find('.route-modal').exists()).toBe(true)
  })

  it('closes the modal with route: true when leaving the route', async () => {
    ctx = setup()
    await go(ctx.router, '/')
    await go(ctx.router, '/modal')
    const handle = ctx.modal.current()!
    const guard = vi.fn()
    handle.onBeforeClose(guard)
    await go(ctx.router, '/page')
    expect(handle.closed).toBe(true)
    expect(guard).toHaveBeenCalledWith({ background: false, esc: false, route: true })
    expect(ctx.router.currentRoute.value.path).toBe('/page')
  })

  it('passes route params as props to named views', async () => {
    ctx = setup()
    await go(ctx.router, '/users/3')
    expect(ctx.wrapper.find('.user').text()).toBe('user-3')
    expect(ctx.wrapper.text()).toContain('users')
  })

  it('maps props with the props option', async () => {
    ctx = setup()
    await go(ctx.router, '/mapped/7')
    expect(ctx.wrapper.find('.user').text()).toBe('user-m7')
  })

  it('reopens with new params when moving between child modal routes', async () => {
    ctx = setup()
    await go(ctx.router, '/users/0')
    for (let i = 1; i < 5; i++) {
      await go(ctx.router, `/users/${i}`)
      expect(ctx.wrapper.findAll('.user').map(w => w.text())).toEqual([`user-${i}`])
    }
  })

  it('keeps the same modal across param changes of the same route', async () => {
    ctx = setup()
    await go(ctx.router, '/users/1')
    const handle = ctx.modal.current()!
    const guard = vi.fn()
    handle.onBeforeClose(guard)
    await go(ctx.router, '/users/2')
    expect(ctx.modal.current()).toBe(handle)
    expect(handle.closed).toBe(false)
    expect(guard).not.toHaveBeenCalled()
    expect(ctx.wrapper.find('.user').text()).toBe('user-2')
  })

  it('keeps the same modal across query changes', async () => {
    ctx = setup()
    await go(ctx.router, '/modal')
    const handle = ctx.modal.current()!
    await go(ctx.router, '/modal?tab=2')
    expect(ctx.modal.current()).toBe(handle)
  })

  it('opens a fresh modal when switching to another modal route', async () => {
    ctx = setup()
    await go(ctx.router, '/users/1')
    const handle = ctx.modal.current()!
    await go(ctx.router, '/mapped/1')
    expect(handle.closed).toBe(true)
    expect(ctx.wrapper.find('.user').text()).toBe('user-m1')
  })

  it('reports and ignores a modal route that cannot open', async () => {
    const reported = vi.fn()
    const original = globalThis.reportError
    globalThis.reportError = reported
    try {
      ctx = setup()
      ctx.modal.configure({ beforeOpen: () => false })
      await go(ctx.router, '/modal')
      expect(ctx.router.currentRoute.value.path).toBe('/modal')
      expect(reported).toHaveBeenCalledWith(expect.objectContaining({ code: 'before-open-rejected' }))
      ctx.modal.configure({ beforeOpen: undefined })
      await go(ctx.router, '/page')
      expect(ctx.router.currentRoute.value.path).toBe('/page')
    } finally {
      globalThis.reportError = original
    }
  })

  it('blocks navigation when the modal guard vetoes', async () => {
    ctx = setup()
    await go(ctx.router, '/')
    await go(ctx.router, '/guard')
    await go(ctx.router, '/page')
    expect(ctx.router.currentRoute.value.path).toBe('/guard')
    expect(ctx.modal.current()?.closed).toBe(false)
  })

  it('navigates back when the modal is closed directly', async () => {
    ctx = setup()
    await go(ctx.router, '/page')
    await go(ctx.router, '/modal')
    await ctx.modal.current()!.close()
    await flush()
    await flush()
    expect(ctx.router.currentRoute.value.path).toBe('/page')
  })

  it('goes to the fallback when the modal route was the first entry', async () => {
    ctx = setup({ fallback: '/page' })
    await go(ctx.router, '/modal')
    await ctx.modal.current()!.close()
    await flush()
    await flush()
    expect(ctx.router.currentRoute.value.path).toBe('/page')
  })

  it('goes to / when the first entry has no fallback', async () => {
    ctx = setup()
    await go(ctx.router, '/modal')
    await ctx.modal.current()!.close()
    await flush()
    await flush()
    expect(ctx.router.currentRoute.value.path).toBe('/')
  })

  it('closes the modal when the user navigates back', async () => {
    ctx = setup()
    await go(ctx.router, '/')
    await go(ctx.router, '/users/3')
    ctx.router.back()
    await flush()
    await flush()
    await nextTick()
    expect(ctx.router.currentRoute.value.path).toBe('/')
    expect(ctx.wrapper.text()).toBe('home')
  })

  it('does not go back twice when leaving by navigation', async () => {
    ctx = setup()
    await go(ctx.router, '/page')
    await go(ctx.router, '/')
    await go(ctx.router, '/modal')
    await go(ctx.router, '/page')
    await flush()
    expect(ctx.router.currentRoute.value.path).toBe('/page')
  })

  it('handles quick successive navigations', async () => {
    ctx = setup()
    await go(ctx.router, '/')
    void ctx.router.push('/page')
    void ctx.router.push('/modal')
    await ctx.router.push('/users/3')
    await flush()
    await nextTick()
    expect(ctx.wrapper.findAll('.user').map(w => w.text())).toEqual(['user-3'])
    expect(ctx.wrapper.find('.route-modal').exists()).toBe(false)
    await go(ctx.router, '/')
    expect(ctx.wrapper.text()).toBe('home')
  })

  it('does not crash on redirect records or records without components', async () => {
    ctx = setup()
    await go(ctx.router, '/redirect')
    expect(ctx.router.currentRoute.value.path).toBe('/page')
    await go(ctx.router, '/parent/child')
    expect(ctx.wrapper.text()).toBe('page')
  })

  it('closes other modals in the namespace in open mode', async () => {
    ctx = setup()
    await go(ctx.router, '/')
    const other = await ctx.modal.push(Page)
    await go(ctx.router, '/modal')
    expect(other.closed).toBe(true)
  })

  it('stacks on top of other modals in push mode', async () => {
    ctx = setup({ mode: 'push' })
    await go(ctx.router, '/')
    const other = await ctx.modal.push(Page)
    await go(ctx.router, '/modal')
    expect(other.closed).toBe(false)
    expect(ctx.modal.getSnapshot().items).toHaveLength(2)
    await go(ctx.router, '/')
    expect(other.closed).toBe(false)
    expect(ctx.modal.getSnapshot().items).toHaveLength(1)
  })

  it('is idempotent per router', () => {
    ctx = setup()
    const before = vi.spyOn(ctx.router, 'beforeEach')
    const again = installModalRouter(ctx.router, ctx.modal)
    expect(before).not.toHaveBeenCalled()
    expect(again).toBe(ctx.dispose)
  })

  it('stops reacting after dispose', async () => {
    ctx = setup()
    ctx.dispose()
    await go(ctx.router, '/modal')
    expect(ctx.modal.getSnapshot().items).toHaveLength(0)
  })

  it('renders nothing for the route wrapper itself', async () => {
    ctx = setup()
    await go(ctx.router, '/modal')
    expect(ctx.wrapper.find('.route-modal').element.closest('.modal-container')).not.toBeNull()
  })
})

describe('router review fixes', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('keeps the modal open when a later guard aborts the navigation away', async () => {
    const ctx = setup()
    await go(ctx.router, '/')
    await go(ctx.router, '/modal')
    const handle = ctx.modal.current()!
    const remove = ctx.router.beforeEach(to => (to.path === '/page' ? false : undefined))
    await go(ctx.router, '/page')
    expect(ctx.router.currentRoute.value.path).toBe('/modal')
    expect(handle.closed).toBe(false)
    remove()
    ctx.dispose()
  })

  it('reopens the modal when a later beforeResolve guard aborts the navigation', async () => {
    const ctx = setup()
    await go(ctx.router, '/')
    await go(ctx.router, '/modal')
    const remove = ctx.router.beforeResolve(to => (to.path === '/page' ? false : undefined))
    await go(ctx.router, '/page')
    await flush()
    await nextTick()
    expect(ctx.router.currentRoute.value.path).toBe('/modal')
    expect(ctx.modal.current()?.closed).toBe(false)
    expect(ctx.wrapper.find('.route-modal').exists()).toBe(true)
    remove()
    await go(ctx.router, '/page')
    expect(ctx.modal.getSnapshot().items).toHaveLength(0)
    ctx.dispose()
  })

  it('opens the modal of the initial route when the container mounts after the router is ready', async () => {
    const modal = createVueModal()
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: Home }, { path: '/m', component: createModalRoute(RouteModal) }] })
    const dispose = installModalRouter(router, modal)
    await router.push('/m')
    await router.isReady()
    await flush()
    const App = defineComponent({ render: () => h('div', [h(RouterView), h(ModalContainer)]) })
    const wrapper = mount(App, { global: { plugins: [router, modal] }, attachTo: document.body })
    await flush()
    await nextTick()
    expect(wrapper.find('.route-modal').exists()).toBe(true)
    dispose()
  })

  it('does not open a waiting route modal after the user navigated elsewhere', async () => {
    const modal = createVueModal()
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: Home }, { path: '/m', component: createModalRoute(RouteModal) }] })
    const dispose = installModalRouter(router, modal)
    await router.push('/m')
    await flush()
    await router.push('/')
    await flush()
    const App = defineComponent({ render: () => h('div', [h(RouterView), h(ModalContainer)]) })
    const wrapper = mount(App, { global: { plugins: [router, modal] }, attachTo: document.body })
    await flush()
    expect(wrapper.find('.route-modal').exists()).toBe(false)
    expect(modal.getSnapshot().items).toHaveLength(0)
    dispose()
  })

  it('does not open when the route changed while a host was attaching elsewhere', async () => {
    const modal = createVueModal()
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: Home }, { path: '/m', component: createModalRoute(RouteModal) }] })
    const dispose = installModalRouter(router, modal)
    await router.push('/m')
    await flush()
    const replace = vi.spyOn(router.currentRoute, 'value', 'get').mockReturnValue({ ...router.currentRoute.value, fullPath: '/elsewhere' })
    const detach = modal.attachHost()
    replace.mockRestore()
    await flush()
    expect(modal.getSnapshot().items).toHaveLength(0)
    detach()
    dispose()
  })

  it('reports unexpected open failures without blocking navigation', async () => {
    const reported = vi.fn()
    const original = globalThis.reportError
    globalThis.reportError = reported
    try {
      const modal = createVueModal({ requireHost: false })
      const Boom = createModalRoute(RouteModal, { beforeOpen: () => { throw new Error('boom') } })
      const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: Home }, { path: '/b', component: Boom }] })
      const dispose = installModalRouter(router, modal)
      await router.push('/b')
      await flush()
      expect(reported).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' }))
      await router.push('/')
      expect(router.currentRoute.value.path).toBe('/')
      dispose()
    } finally {
      globalThis.reportError = original
    }
  })

  it('throws when installed on the same router with another manager', () => {
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: Home }] })
    const dispose = installModalRouter(router, createVueModal())
    expect(() => installModalRouter(router, createVueModal())).toThrow(/another modal manager/)
    dispose()
  })
})

describe('router integration with separate managers', () => {
  it('uses the manager it was installed with', async () => {
    const one = createVueModal({ requireHost: false })
    const two: VueModalManager = createVueModal({ requireHost: false })
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: Home }, { path: '/m', component: createModalRoute(RouteModal) }] })
    const dispose = installModalRouter(router, two)
    await router.push('/m')
    await flush()
    expect(one.getSnapshot().items).toHaveLength(0)
    expect(two.getSnapshot().items).toHaveLength(1)
    dispose()
  })
})
