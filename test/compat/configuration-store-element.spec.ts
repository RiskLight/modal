import { mount } from '@vue/test-utils'
import { config, container, getQueueByNamespace, pushModal } from '../../src/compat'
import { forceClean, ModalTitle } from './fixtures'

beforeEach(() => {
  forceClean()
})

afterEach(() => {
  config({ store: {} })
})

describe('Configuration using Extend Store Element', () => {
  test('Default opening modal', async () => {
    mount(container)
    config({ store: { Foo: { component: ModalTitle } } })
    await pushModal('Foo')
    await pushModal('Foo')
    expect(getQueueByNamespace().length).toBe(2)
  })

  test('Opening modal by name should add options from configuration', async () => {
    mount(container)
    config({ store: { Foo: { component: ModalTitle, backgroundClose: false, draggable: true } } })
    const modal = await pushModal('Foo')
    const modal_2 = await pushModal(ModalTitle)
    expect(modal.backgroundClose).toBe(false)
    expect(modal.draggable).toBe(true)
    expect(modal_2.backgroundClose).toBe(true)
    expect(modal_2.draggable).toBe(false)
  })

  test('Configuration with beforeEach', async () => {
    mount(container)
    let count = 3
    config({
      store: {
        Foo: {
          component: ModalTitle,
          beforeEach() {
            if (count-- > 0) return false
          },
        },
      },
    })
    for (let i = 0; i < 3; i++) await pushModal('Foo').catch(() => {})
    await pushModal('Foo')
    await pushModal('Foo')
    expect(getQueueByNamespace().length).toBe(2)
  })

  test('Replacing the store forgets old names', async () => {
    mount(container)
    config({ store: { Foo: ModalTitle } })
    config({ store: { Bar: ModalTitle } })
    await expect(pushModal('Foo')).rejects.toThrow()
    await expect(pushModal('Bar')).resolves.toBeTruthy()
  })
})
