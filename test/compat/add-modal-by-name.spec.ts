import { mount } from '@vue/test-utils'
import { config, container, ModalError, openModal, promptModal, pushModal } from '../../src/compat'
import { forceClean, ModalTitle, wait } from './fixtures'

beforeEach(() => {
  config({ store: {} })
  forceClean()
})

describe('Add modal by name', () => {
  test("Add modal by name that don't exist", async () => {
    mount(container)
    const name = 'confirm'
    await expect(() => pushModal(name)).rejects.toThrowError(ModalError.ModalNotExistsInStore(name))
  })

  test('Add modal by name that exists in store', async () => {
    const wrapper = mount(container)
    config({ store: { confirm: ModalTitle } })
    await pushModal('confirm', { title: 'Jenesius', age: 24 })
    expect(wrapper.text()).toBe('Jenesius 24')
  })

  test('Open modal by name that exists in store', async () => {
    const wrapper = mount(container)
    config({ store: { confirm: ModalTitle } })
    await openModal('confirm', { title: 'Burdin', age: 17 })
    expect(wrapper.text()).toBe('Burdin 17')
  })

  test('Prompt modal by name that exists in store', async () => {
    const wrapper = mount(container)
    config({ store: { confirm: ModalTitle } })
    void promptModal('confirm', { title: 'Mother', age: 54 })
    await wait()
    expect(wrapper.text()).toBe('Mother 54')
  })

  test('Missing component rejects with the upstream message', async () => {
    mount(container)
    await expect(pushModal(undefined as never)).rejects.toThrowError(ModalError.ModalComponentNotProvided())
  })
})
