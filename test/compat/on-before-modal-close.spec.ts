import { mount } from '@vue/test-utils'
import { closeModal, container, getQueueByNamespace, onBeforeModalClose, openModal } from '../../src/compat'
import { forceClean, wait } from './fixtures'

const modalQueue = getQueueByNamespace()

beforeEach(() => {
  forceClean()
  mount(container)
})

describe('onBeforeModalClose', () => {
  test('onBeforeModalClose run', async () => {
    let isClosed = false
    const component = {
      setup() {
        onBeforeModalClose(() => {
          isClosed = true
        })
      },
      template: '<p/>',
    }
    const modal = await openModal(component)
    await modal.close()
    expect(isClosed).toBeTruthy()
  })

  test('onBeforeModalClose next(false)', async () => {
    const component = {
      template: '<p>Test</p>',
      setup() {
        onBeforeModalClose(() => false)
      },
    }
    await openModal(component)
    await closeModal().catch(() => {})
    expect(modalQueue.length).toBe(1)
  })

  test('onBeforeModalClose next(true)', async () => {
    const component = {
      setup() {
        onBeforeModalClose(() => true)
      },
      template: '<p/>',
    }
    await openModal(component)
    await closeModal()
    expect(modalQueue.length).toBe(0)
  })

  test('onBeforeModalClose async next(false)', async () => {
    const component = {
      setup() {
        onBeforeModalClose(async () => {
          await wait(100)
          return false
        })
      },
      template: '<p/>',
    }
    await openModal(component)
    await closeModal().catch(() => {})
    expect(modalQueue.length).toBe(1)
  })

  test('onBeforeModalClose async next(true)', async () => {
    const component = {
      setup() {
        onBeforeModalClose(async () => {
          await wait(100)
          return true
        })
      },
      template: '<p/>',
    }
    await openModal(component)
    await closeModal()
    expect(modalQueue.length).toBe(0)
  })

  test('onBeforeModalClose outside a modal throws instead of guarding modal 0', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() =>
      mount({
        setup() {
          onBeforeModalClose(() => false)
        },
        template: '<p/>',
      }),
    ).toThrow()
    warn.mockRestore()
  })
})
