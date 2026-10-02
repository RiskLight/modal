import { mount } from '@vue/test-utils'
import { computed } from 'vue'
import { container, openModal } from '../../src/compat'
import { forceClean, ModalTitle, wait } from './fixtures'

beforeEach(() => {
  forceClean()
  mount(container)
})

describe('ModalObject test', () => {
  test('target test, when modal opened', async () => {
    const modal = await openModal(ModalTitle, { title: 'Test', age: 15 })
    expect(modal.instance.title + modal.instance.age).toBe('Test15')
  })

  test('target test, when modal closed', async () => {
    const modal = await openModal(ModalTitle, { title: 'Test', age: 15 })
    await modal.close()
    expect(modal.instance.title).toBe('Test')
  })

  test('ModalObject.closed, when modal open', async () => {
    const modal = await openModal(ModalTitle, { title: 'Test', age: 15 })
    expect(modal.closed.value).toBe(false)
  })

  test('ModalObject.closed, when modal closed', async () => {
    const modal = await openModal(ModalTitle)
    await modal.close()
    await wait()
    expect(modal.closed.value).toBe(true)
  })

  test('ModalObject.closed is reactive', async () => {
    const modal = await openModal(ModalTitle)
    const label = computed(() => (modal.closed.value ? 'closed' : 'open'))
    expect(label.value).toBe('open')
    await modal.close()
    expect(label.value).toBe('closed')
  })

  test('ModalObject.props is a ref of the passed props', async () => {
    const modal = await openModal(ModalTitle, { title: 'A' })
    expect(modal.props.value).toEqual({ title: 'A' })
    ;(modal.props.value as { title: string }).title = 'B'
    await wait()
    expect(modal.instance.title).toBe('B')
  })

  test('exposes id, namespace and component', async () => {
    const modal = await openModal(ModalTitle)
    expect(typeof modal.id).toBe('number')
    expect(modal.namespace).toBe('default')
    expect(modal.component).toBe(ModalTitle)
  })
})
