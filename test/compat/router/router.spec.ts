import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { container, getCurrentModal, useModalRouter } from '../../../src/compat'
import { forceClean, wait } from '../fixtures'
import { App, createTestRouter } from './router'

const router = createTestRouter()
useModalRouter.init(router)

function mountApp() {
  return mount(App, { global: { plugins: [router], components: { container } } })
}

beforeEach(async () => {
  forceClean()
  await router.push('/')
  await router.isReady()
  await wait()
})

describe('Integration with VueRouter', () => {
  it('Default', async () => {
    const wrapper = mountApp()
    await nextTick()
    expect(wrapper.text()).toBe('Test')
  })

  it('Opening a window on a simple match', async () => {
    const wrapper = mountApp()
    await router.push('/simple-modal')
    await wait(50)
    expect(wrapper.text()).toBe('Modal router')
  })

  it('Opening and the closing', async () => {
    const wrapper = mountApp()
    await router.push('/simple-modal')
    await wait(50)
    expect(wrapper.text()).toBe('Modal router')
    await router.push('/')
    await wait(50)
    expect(wrapper.text()).toBe('Test')
  })

  it('Open child routeModal with params', async () => {
    const wrapper = mountApp()
    await router.push('/users/3')
    await wait(50)
    expect(wrapper.text()).toBe('user-3')
  })

  it('Open a list of child routeModal', async () => {
    const wrapper = mountApp()
    await router.push('/users/3')
    for (let i = 0; i < 5; i++) {
      await router.push('/users/' + i)
      await nextTick()
      await wait()
      expect(wrapper.text()).toBe(`user-${i}`)
    }
  })

  it('Closing modal with guard', async () => {
    mountApp()
    await router.push('/guard')
    await wait()
    expect(router.currentRoute.value.path).toBe('/guard')
    await router.push('/').catch(() => {})
    expect(router.currentRoute.value.path).toBe('/guard')
    getCurrentModal()!.onclose = () => true
    forceClean()
  })

  it('Push', async () => {
    const wrapper = mountApp()
    await router.push('/a')
    await nextTick()
    await router.push('/b')
    await nextTick()
    await nextTick()
    await router.push('/users/3')
    await nextTick()
    await wait()
    expect(wrapper.text()).toBe('user-3')
    await router.push('/')
    await wait()
    expect(wrapper.text()).toBe('Test')
  })

  it('Back', async () => {
    const wrapper = mountApp()
    await router.push('/users/3')
    await wait()
    expect(wrapper.text()).toBe('user-3')
    router.back()
    await wait(100)
    expect(wrapper.text()).toBe('Test')
  })

  it('Modal.isRoute should be true, when modal was opened by RouterIntegration', async () => {
    mountApp()
    await nextTick()
    await wait()
    await router.push('/router-simple-modal')
    await wait()
    expect(getCurrentModal()!.isRoute).toBe(true)
  })

  it('init can be called again without effect', () => {
    expect(() => useModalRouter.init(router)).not.toThrow()
  })
})
