import { mount } from '@vue/test-utils'
import { container, Modal, openModal, pushModal } from '../../src/compat'
import { forceClean, ModalTitle } from './fixtures'

beforeEach(() => {
  forceClean()
})

describe('ModalClass', () => {
  test('Default return openModal', async () => {
    mount(container)
    const modal = await openModal(ModalTitle)
    expect(modal instanceof Modal).toBeTruthy()
  })

  test('Default return pushModal', async () => {
    mount(container)
    const modal = await pushModal(ModalTitle)
    expect(modal instanceof Modal).toBeTruthy()
  })

  test('The same handle always maps to the same Modal object', async () => {
    mount(container)
    const modal = await pushModal(ModalTitle)
    expect(Modal.STORE.get(modal.id)).toBe(modal)
  })

  test('STORE forgets closed modals', async () => {
    mount(container)
    const modal = await pushModal(ModalTitle)
    await modal.close()
    expect(Modal.STORE.has(modal.id)).toBe(false)
  })
})
