import { mount } from '@vue/test-utils'
import { container, openModal } from '../../src/compat'
import { ModalTitle } from './fixtures'

describe('Test init library', () => {
  test('Throw error without mounting container', async () => {
    await expect(openModal(ModalTitle)).rejects.toThrow()
  })

  test('Normal working. Container was mounted', async () => {
    mount(container)
    await expect(openModal(ModalTitle)).resolves.toBeTruthy()
  })
})
