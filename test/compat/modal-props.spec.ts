import { mount } from '@vue/test-utils'
import { computed, reactive, ref } from 'vue'
import { container, openModal, pushModal } from '../../src/compat'
import { forceClean, ModalTitle, wait } from './fixtures'

beforeEach(async () => {
  forceClean()
  mount(container)
  await wait()
})

describe('Props of Modal', () => {
  test('Simple props', async () => {
    const modal = await openModal(ModalTitle, { title: 'Text' })
    expect(modal.instance.title).toBe('Text')
  })

  test('Simple props with push', async () => {
    const modal = await pushModal(ModalTitle, { title: 'Text' })
    expect(modal.instance.title).toBe('Text')
  })

  test('Object props', async () => {
    const modal = await openModal(ModalTitle, { title: 'Hello' })
    expect(modal.instance.title).toBe('Hello')
  })

  test('Ref props', async () => {
    const modal = await openModal(ModalTitle, ref({ title: 'Hello' }))
    expect(modal.instance.title).toBe('Hello')
  })

  test('Reactive props', async () => {
    const modal = await openModal(ModalTitle, reactive({ title: 'base' }))
    expect(modal.instance.title).toBe('base')
  })

  test('Computed props', async () => {
    const refState = ref({ title: 'ref' })
    const modal = await openModal(ModalTitle, computed(() => refState.value))
    expect(modal.instance.title).toBe('ref')
  })

  test('Computed prop in object', async () => {
    const modal = await openModal(ModalTitle, { title: 'Hello', age: 1 })
    expect(modal.instance.title).toBe('Hello')
  })

  test('Changing ref in props', async () => {
    const state = ref({ title: 'Hello', age: 1 })
    const modal = await openModal(ModalTitle, state)
    state.value.title = 'New value'
    await wait()
    expect(modal.instance.title).toBe('New value')
  })

  test('Changing reactive in props', async () => {
    const state = reactive({ title: 'base', age: 4 })
    const modal = await openModal(ModalTitle, state)
    state.title = 'New value'
    await wait()
    expect(modal.instance.title).toBe('New value')
  })

  test('Changing computed in props', async () => {
    const refState = ref({ title: 'ref' })
    const modal = await openModal(ModalTitle, computed(() => refState.value))
    refState.value.title = 'New value'
    await wait()
    expect(modal.instance.title).toBe('New value')
  })
})
