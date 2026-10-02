import { mount } from '@vue/test-utils'
import { closeModal, container, getQueueByNamespace, openModal } from '../../src/compat'
import { forceClean, wait } from './fixtures'

const modalQueue = getQueueByNamespace()

beforeEach(() => {
  forceClean()
})

describe('beforeModalClose', () => {
  const component: Record<string, unknown> = {
    beforeModalClose: () => {},
    template: '<p>3</p>',
    data: () => ({ title: 'Test' }),
  }

  it('beforeModalClose run', async () => {
    mount(container)
    let isClosed = false
    component.beforeModalClose = function () {
      isClosed = true
    }
    const modal = await openModal(component)
    await modal.close()
    expect(isClosed).toBeTruthy()
  })

  it('beforeModalClose next(false)', async () => {
    mount(container)
    component.beforeModalClose = function () {
      return false
    }
    await openModal(component)
    await closeModal().catch(() => {})
    expect(modalQueue.length).toBe(1)
  })

  it('beforeModalClose next(true)', async () => {
    mount(container)
    await openModal({
      template: '<p>a</p>',
      beforeModalClose() {
        return true
      },
    })
    await closeModal()
    expect(modalQueue.length).toBe(0)
  })

  it('beforeModalClose return undefined', async () => {
    mount(container)
    component.beforeModalClose = function () {}
    await openModal(component)
    await closeModal()
    expect(modalQueue.length).toBe(0)
  })

  it('beforeModalClose async next(false)', async () => {
    mount(container)
    component.beforeModalClose = async function () {
      await wait()
      return false
    }
    await openModal(component)
    await closeModal().catch(() => {})
    expect(modalQueue.length).toBe(1)
  })

  it('beforeModalClose async next(true)', async () => {
    mount(container)
    await openModal({
      ...component,
      beforeModalClose: async function () {
        await wait()
        return true
      },
    })
    await closeModal()
    expect(modalQueue.length).toBe(0)
  })

  it('Access to this', async () => {
    mount(container)
    let value = null
    component.beforeModalClose = async function (this: { title: string }) {
      value = this.title
    }
    await openModal(component)
    await closeModal()
    expect(value).toBe('Test')
  })
})
