import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { closeModal, config, container, getQueueByNamespace, ModalError, openModal, popModal, pushModal } from '../../src/compat'
import { escape, forceClean, ModalTitle, triggerClickClose, wait } from './fixtures'

const modalQueue = getQueueByNamespace()

beforeEach(() => {
  forceClean()
  config({ backgroundClose: true, escClose: true, singleShow: false, skipInitCheck: false })
})

describe('Configuration function', () => {
  test('backgroundClose (true)', async () => {
    const wrapper = mount(container)
    await openModal(ModalTitle, {})
    expect(modalQueue.length).toBe(1)
    await triggerClickClose(wrapper)
    await wait()
    expect(modalQueue.length).toBe(0)
  })

  test('backgroundClose (false)', async () => {
    const wrapper = mount(container)
    config({ backgroundClose: false })
    await openModal(ModalTitle)
    expect(modalQueue.length).toBe(1)
    await triggerClickClose(wrapper)
    await wait()
    expect(modalQueue.length).toBe(1)
  })

  test('backgroundClose (false) => closeModal', async () => {
    mount(container)
    config({ backgroundClose: false })
    await openModal(ModalTitle)
    await closeModal()
    expect(modalQueue.length).toBe(0)
  })

  test('backgroundClose (false) => popModal', async () => {
    mount(container)
    config({ backgroundClose: false })
    await openModal(ModalTitle)
    await popModal()
    expect(modalQueue.length).toBe(0)
  })

  test('Configuration must be an object', () => {
    expect(() => config(null as never)).toThrowError(ModalError.ConfigurationType(null))
    expect(() => config('x' as never)).toThrow(ModalError)
  })

  test('escClose:true', async () => {
    mount(container)
    await openModal(ModalTitle)
    escape()
    await wait(10)
    expect(modalQueue.length).toBe(0)
  })

  test('escClose: false', async () => {
    mount(container)
    config({ escClose: false })
    await openModal(ModalTitle)
    escape()
    await wait(10)
    expect(modalQueue.length).toBe(1)
  })

  test('disableInitializationCheck should provide way to addModal without container', async () => {
    await expect(openModal(ModalTitle)).rejects.toThrowError(ModalError.NotInitialized('default'))
    config({ skipInitCheck: true })
    await expect(openModal(ModalTitle)).resolves.toBeTruthy()
  })

  test('SingleShow in configuration', async () => {
    const app = mount(container)
    config({ singleShow: true })
    for (let i = 0; i < 4; i++) await pushModal(ModalTitle)
    expect(modalQueue.length).toBe(4)
    await nextTick()
    const shown = app.findAll('.modal-container').map(item => (item.element as HTMLElement).style.display !== 'none')
    shown.forEach((value, index, arr) => expect(value).toBe(index === arr.length - 1))
  })

  test('animation and appear are passed to the transition', async () => {
    config({ animation: 'fade', appear: false })
    const wrapper = mount(container, { global: { stubs: { 'transition-group': false } } })
    const group = wrapper.findComponent({ name: 'TransitionGroup' })
    expect(group.props('name')).toBe('fade')
    expect(group.props('appear')).toBe(false)
    config({ animation: 'modal-list', appear: true })
  })

  test('scrollLock false keeps body scrollable', async () => {
    document.body.removeAttribute('style')
    mount(container)
    config({ scrollLock: false })
    await openModal(ModalTitle)
    expect(document.body.style.overflow).toBe('')
    config({ scrollLock: true })
    expect(document.body.style.overflow).toBe('hidden')
    await closeModal()
  })

  test('draggable default applies to new modals', async () => {
    mount(container)
    config({ draggable: true })
    const modal = await openModal(ModalTitle)
    expect(modal.draggable).toBe(true)
    config({ draggable: false })
  })
})
