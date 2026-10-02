import { mount } from '@vue/test-utils'
import { container, getQueueByNamespace, useModalRouter } from '../../../src/compat'
import { forceClean, wait } from '../fixtures'
import { createTestRouter } from './router'

const router = createTestRouter()
const modalQueue = getQueueByNamespace()
useModalRouter.init(router)

beforeEach(() => {
  forceClean()
})

describe('Router async', () => {
  test('Changing modalQueue length', async () => {
    mount(container, { global: { plugins: [router] } })
    await router.push('/')
    await router.isReady()
    await router.push('/router-simple-modal')
    await wait()
    expect(modalQueue.length).toBe(1)
  })

  test('Entering modal', async () => {
    const wrapper = mount(container, { global: { plugins: [router] } })
    await router.push('/')
    await router.isReady()
    await router.push('/router-simple-modal')
    await wait()
    expect(wrapper.text()).toBe('Modal router')
  })
})
