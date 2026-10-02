import { mount } from '@vue/test-utils'
import { config, container, openModal } from '../../src/compat'
import { escape, forceClean, ModalTitle, wait } from './fixtures'

beforeEach(() => {
  forceClean()
})

afterEach(() => {
  config({ escClose: true })
})

describe('Test Esc closing', () => {
  test('Modal should close after pressed Esc', async () => {
    mount(container)
    const modal = await openModal(ModalTitle)
    escape()
    await wait(5)
    expect(modal.closed.value).toBe(true)
  })

  test("Modal shouldn't close, if using config.escClose = false", async () => {
    mount(container)
    const modal = await openModal(ModalTitle)
    config({ escClose: false })
    escape()
    await wait(5)
    expect(modal.closed.value).toBe(false)
  })

  test('Escape closes modals of a mounted non-default namespace', async () => {
    mount(container)
    mount(container, { props: { namespace: 'notification' } })
    const modal = await openModal(ModalTitle, {}, { namespace: 'notification' })
    escape()
    await wait(5)
    expect(modal.closed.value).toBe(true)
  })
})
