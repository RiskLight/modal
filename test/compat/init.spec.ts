import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { closeModal, container, getQueueByNamespace, ModalError, openModal, popModal, pushModal } from '../../src/compat'
import { escape, forceClean, ModalTitle, triggerClickClose, wait } from './fixtures'

const modalQueue = getQueueByNamespace()

beforeEach(async () => {
  forceClean()
  await wait()
})

describe('Init', () => {
  it('Run without container, must throw the error', async () => {
    await expect(() => pushModal(ModalTitle)).rejects.toThrowError(ModalError.NotInitialized('default'))
  })

  it('Initialized', async () => {
    mount(container)
    expect(() => openModal(ModalTitle)).not.toThrow()
  })

  it('openModal', async () => {
    const wrap = mount(container)
    await openModal(ModalTitle, { title: 'Modal-1' })
    expect(modalQueue.length).toBe(1)
    const modalObject2 = await openModal(ModalTitle, { title: 'Modal-2' })
    expect(modalQueue.length).toBe(1)
    expect(wrap.text()).toEqual('Modal-2')
    await modalObject2.close()
    expect(modalQueue.length).toBe(0)
  })

  it('closeModal', async () => {
    mount(container)
    await openModal(ModalTitle)
    await closeModal()
    expect(modalQueue.length).toBe(0)
    await pushModal(ModalTitle)
    await pushModal(ModalTitle)
    await pushModal(ModalTitle)
    await closeModal()
    expect(modalQueue.length).toBe(0)
  })

  it('pushModal', async () => {
    const wrapper = mount(container)
    for (let i = 0; i < 4; i++) await pushModal(ModalTitle)
    expect(modalQueue.length).toBe(4)
    await pushModal(ModalTitle)
    await pushModal(ModalTitle)
    await nextTick()
    expect(modalQueue.length).toBe(6)
    expect(wrapper.findAll('.widget__modal-container__item').length).toBe(6)
  })

  it('popModal', async () => {
    const wrapper = mount(container)
    await openModal(ModalTitle)
    await popModal()
    await nextTick()
    expect(modalQueue.length).toBe(0)
    expect(wrapper.findAll('.widget__modal-container__item').length).toBe(0)
    for (let i = 0; i < 4; i++) await pushModal(ModalTitle)
    await popModal()
    await nextTick()
    expect(modalQueue.length).toBe(3)
    expect(wrapper.findAll('.widget__modal-container__item').length).toBe(3)
    await popModal()
    await popModal()
    await nextTick()
    expect(modalQueue.length).toBe(1)
    expect(wrapper.findAll('.widget__modal-container__item').length).toBe(1)
  })

  it('click on modal', async () => {
    const wrapper = mount(container)
    await openModal(ModalTitle, { title: 'test' })
    await wrapper.find('.modal-item').trigger('pointerdown')
    await wait()
    expect(wrapper.findAll('.modal-container').length).toBe(1)
  })

  it("click on modal's back", async () => {
    const wrapper = mount(container)
    await openModal(ModalTitle, { title: 'test' })
    await triggerClickClose(wrapper)
    await wait()
    expect(wrapper.findAll('.modal-container').length).toBe(0)
  })

  it('provide props', async () => {
    const wrapper = mount(container)
    await openModal(ModalTitle, { title: 'Jenesius', age: 22 })
    expect(wrapper.text()).toBe('Jenesius 22')
  })

  it('press escape', async () => {
    mount(container)
    await openModal(ModalTitle)
    await nextTick()
    expect(modalQueue.length).toBe(1)
    escape()
    await wait()
    expect(modalQueue.length).toBe(0)
  })

  it('close destroyed modal', async () => {
    mount(container)
    const modal = await openModal(ModalTitle)
    await pushModal(ModalTitle)
    await closeModal()
    await expect(modal.close()).rejects.toBeInstanceOf(ModalError)
    expect(modalQueue.length).toBe(0)
  })

  it('close by id', async () => {
    mount(container)
    const modal1 = await pushModal(ModalTitle)
    const modal2 = await pushModal(ModalTitle)
    const modal3 = await pushModal(ModalTitle)
    await modal2.close()
    expect(modalQueue.map(item => item.id)).toEqual([modal1.id, modal3.id])
  })
})
