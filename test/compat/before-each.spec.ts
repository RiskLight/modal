import { mount } from '@vue/test-utils'
import { config, container, getQueueByNamespace, pushModal } from '../../src/compat'
import { forceClean, ModalTitle } from './fixtures'

beforeEach(() => {
  forceClean()
})

afterEach(() => {
  config({
    beforeEach() {
      return true
    },
  })
})

describe('beforeEach', () => {
  test('Reject all modals', async () => {
    mount(container)
    config({
      beforeEach() {
        return false
      },
    })
    for (let i = 0; i < 3; i++) await pushModal(ModalTitle).catch(() => {})
    expect(getQueueByNamespace().length).toBe(0)
  })

  test('Default return pushModal', async () => {
    let count = 0
    mount(container)
    config({
      beforeEach() {
        count++
        return count > 2
      },
    })
    for (let i = 0; i < 5; i++) await pushModal(ModalTitle).catch(() => {})
    expect(getQueueByNamespace().length).toBe(3)
  })

  test('Async beforeEach can reject', async () => {
    mount(container)
    config({
      async beforeEach() {
        return false
      },
    })
    await expect(pushModal(ModalTitle)).rejects.toThrowError('The opening of the modal was stopped in beforeEach')
  })
})
