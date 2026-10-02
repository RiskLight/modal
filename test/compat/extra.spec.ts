import { mount } from '@vue/test-utils'
import { defineComponent, onMounted, watch } from 'vue'
import { ModalError as CoreModalError } from '../../src'
import {
  closeById,
  closeModal,
  config,
  container,
  getCurrentModal,
  getQueueByNamespace,
  Modal,
  ModalError,
  modalManager,
  modalQueue,
  openModal,
  promptModal,
  pushModal,
} from '../../src/compat'
import { forceClean, ModalTitle, wait } from './fixtures'

beforeEach(() => {
  forceClean()
  config({ beforeEach: () => true, skipInitCheck: false })
})

describe('compat errors', () => {
  it('keeps the upstream shape and is also a core ModalError', () => {
    const error = ModalError.Undefined(3)
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(CoreModalError)
    expect(error.isModalError).toBe(true)
    expect(error.message).toBe('Modal with id: 3 not founded. The modal window may have been closed earlier.')
    expect(ModalError.EmptyModalQueue().message).toBe('Modal queue is empty.')
    expect(ModalError.ConfigurationType({ a: 1 }).details).toEqual({ a: 1 })
  })

  it('translates an unknown id', async () => {
    await expect(closeById(424242)).rejects.toThrowError(ModalError.ModalNotFoundByID(424242))
  })

  it('translates queue-not-empty from openModal', async () => {
    mount(container)
    const first = await pushModal(ModalTitle)
    first.onclose = () => {
      void pushModal(ModalTitle)
    }
    await expect(openModal(ModalTitle)).rejects.toThrowError(ModalError.QueueNoEmpty())
  })

  it('passes through errors thrown by guards', async () => {
    mount(container)
    const modal = await pushModal(ModalTitle)
    const boom = new Error('boom')
    modal.onclose = () => {
      throw boom
    }
    await expect(modal.close()).rejects.toBe(boom)
  })

  it('rejects non-function guards like upstream', async () => {
    mount(container)
    const modal = await pushModal(ModalTitle)
    expect(() => {
      modal.onclose = 'x' as never
    }).toThrow(ModalError)
    expect(() => {
      modal.ondestroy = 1 as never
    }).toThrow(ModalError)
  })
})

describe('Modal.STORE view', () => {
  it('lists open modals across namespaces', async () => {
    config({ skipInitCheck: true })
    const a = await pushModal(ModalTitle)
    const b = await pushModal(ModalTitle, {}, { namespace: 'side' })
    expect(Modal.STORE.size).toBe(2)
    expect([...Modal.STORE.keys()].sort()).toEqual([a.id, b.id].sort())
    expect(new Map(Modal.STORE.entries()).get(a.id)).toBe(a)
    expect(new Map(Modal.STORE).get(b.id)).toBe(b)
    const seen: number[] = []
    Modal.STORE.forEach((modal, id) => {
      expect(modal.id).toBe(id)
      seen.push(id)
    })
    expect(seen).toHaveLength(2)
    expect(Modal.STORE.get(999999)).toBeUndefined()
  })
})

describe('queues and current modal', () => {
  it('treats the empty namespace as default', () => {
    expect(getQueueByNamespace('')).toBe(modalQueue)
  })

  it('returns undefined without open modals', () => {
    expect(getCurrentModal()).toBeUndefined()
  })

  it('keeps queues reactive arrays of Modal objects', async () => {
    config({ skipInitCheck: true })
    const modal = await pushModal(ModalTitle)
    expect(modalQueue[0]).toBe(modal)
    await closeModal()
    expect(modalQueue).toHaveLength(0)
  })
})

describe('interop with the new api', () => {
  it('shares one stack between compat calls and modalManager', async () => {
    mount(container)
    const legacy = await pushModal(ModalTitle, { title: 'legacy' })
    const modern = await modalManager.push(ModalTitle, { title: 'modern' })
    expect(modalQueue.map(m => m.id)).toEqual([legacy.id, modern.id])
    expect(getCurrentModal()!.id).toBe(modern.id)
  })

  it('resolves a prompt opened through compat via the handle', async () => {
    mount(container)
    const result = promptModal<number>(ModalTitle)
    await wait()
    await modalManager.current()!.resolve(9)
    expect(await result).toBe(9)
  })
})

describe('consumer scenario', () => {
  it('works like offers-db: beforeEach gate, openModal and pushModal with props', async () => {
    let allowed = true
    config({ beforeEach: () => allowed, draggable: false })
    const wrapper = mount(container)
    await openModal(ModalTitle, { title: 'list' })
    await pushModal(ModalTitle, { title: 'details', age: 1 })
    expect(wrapper.text()).toBe('list details 1')
    allowed = false
    await expect(pushModal(ModalTitle)).rejects.toThrowError(ModalError.RejectedByBeforeEach())
    await closeModal()
    expect(wrapper.text()).toBe('')
  })
})

describe('compat review fixes', () => {
  it('promptModal keeps a value resolved while the modal is mounting', async () => {
    mount(container)
    const AutoConfirm = defineComponent({
      emits: [Modal.EVENT_PROMPT],
      setup(_props, { emit }) {
        onMounted(() => emit(Modal.EVENT_PROMPT, 'auto'))
        return () => null
      },
    })
    expect(await promptModal(AutoConfirm)).toBe('auto')
  })

  it('updates closed for synchronous watchers after the modal is fully closed', async () => {
    mount(container)
    const modal = await pushModal(ModalTitle)
    const seen: boolean[] = []
    watch(() => modal.closed.value, value => void seen.push(value), { flush: 'sync' })
    await modal.close()
    expect(seen.at(-1)).toBe(true)
  })

  it('keeps upstream backdrop semantics: pointerdown closes', async () => {
    const wrapper = mount(container)
    const modal = await pushModal(ModalTitle)
    await wrapper.find('.modal-container').trigger('pointerdown')
    await wait()
    expect(modal.closed.value).toBe(true)
  })
})
