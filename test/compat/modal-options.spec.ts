import { mount } from '@vue/test-utils'
import { config, container, openModal } from '../../src/compat'
import { forceClean, ModalTitle, triggerClickClose, wait } from './fixtures'

let wrapper: ReturnType<typeof mount>

beforeEach(async () => {
  forceClean()
  config({ backgroundClose: true })
  wrapper = mount(container)
  await wait()
})

describe('Testing modal options', () => {
  test('options {backgroundClose: false}', async () => {
    const modal = await openModal(ModalTitle, {}, { backgroundClose: false })
    await triggerClickClose(wrapper)
    await wait()
    expect(modal.closed.value).toBe(false)
  })

  test('modal.backgroundClose = false', async () => {
    const modal = await openModal(ModalTitle, {})
    modal.backgroundClose = false
    await triggerClickClose(wrapper)
    await wait()
    expect(modal.closed.value).toBe(false)
  })

  test('modal.backgroundClose = true, configuration = false', async () => {
    config({ backgroundClose: false })
    const modal = await openModal(ModalTitle, {}, { backgroundClose: true })
    await triggerClickClose(wrapper)
    await wait()
    expect(modal.closed.value).toBe(true)
  })

  test('Modal.isRoute should be false by default', async () => {
    const modal = await openModal(ModalTitle)
    expect(modal.isRoute).toBe(false)
  })
})
