import { defineComponent, h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { DEFAULT_NAMESPACE } from '../../src'
import { createVueModal, ModalContainer, useModal } from '../../src/vue'
import { mountContainer, OptionsGuard, Title } from './fixtures'

describe('createVueModal', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('requires a mounted container for the default namespace only', async () => {
    const modal = createVueModal()
    await expect(modal.push(Title)).rejects.toMatchObject({ code: 'not-hosted' })
    await expect(modal.push(Title, {}, { namespace: 'side' })).resolves.toBeTruthy()
  })

  it('accepts modals once a container is mounted', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    await expect(modal.push(Title)).resolves.toBeTruthy()
    wrapper.unmount()
    await expect(modal.push(Title)).rejects.toMatchObject({ code: 'not-hosted' })
  })

  it('lets options override requireHost', async () => {
    const modal = createVueModal({ requireHost: false })
    await expect(modal.push(Title)).resolves.toBeTruthy()
  })

  it('reads beforeModalClose from options API components', async () => {
    const modal = createVueModal({ requireHost: false })
    const h = await modal.push(OptionsGuard)
    await expect(h.close()).resolves.toBe(false)
  })

  it('exposes the underlying core manager', async () => {
    const modal = createVueModal({ requireHost: false })
    const h = await modal.push(Title)
    expect(modal.core.get(h.id)).toBe(h)
    expect(modal.getSnapshot(DEFAULT_NAMESPACE).items).toEqual([h])
  })

  it('resolves open and push after the modal has rendered', async () => {
    const modal = createVueModal()
    mountContainer(modal)
    const h = await modal.open(Title, { title: 'x' })
    expect((h.instance as { title: string }).title).toBe('x')
  })

  it('moves slots into handle extra', async () => {
    const modal = createVueModal({ requireHost: false })
    const slot = () => [h('b', 'x')]
    const handle = await modal.push(Title, {}, { slots: { default: slot }, extra: { other: 1 } })
    expect(handle.extra).toEqual({ other: 1, slots: { default: slot } })
  })
})

describe('plugin', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('provides the manager to useModal and $modal', () => {
    const modal = createVueModal()
    let injected: unknown
    const Probe = defineComponent({
      setup() {
        injected = useModal()
        return () => h('div')
      },
    })
    const wrapper = mount(Probe, { global: { plugins: [modal] } })
    expect(injected).toBe(modal)
    expect((wrapper.vm as unknown as { $modal: unknown }).$modal).toBe(modal)
  })

  it('throws no-manager when the plugin is missing', () => {
    const Probe = defineComponent({
      setup() {
        useModal()
        return () => h('div')
      },
    })
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(() => mount(Probe)).toThrow(expect.objectContaining({ code: 'no-manager' }))
    warn.mockRestore()
  })

  it('throws no-manager when useModal runs outside setup', () => {
    expect(() => useModal()).toThrow(expect.objectContaining({ code: 'no-manager' }))
  })

  it('lets a container use an explicit manager prop without the plugin', async () => {
    const modal = createVueModal()
    const wrapper = mount(ModalContainer, { props: { manager: modal }, attachTo: document.body })
    await modal.push(Title, { title: 'explicit' })
    await nextTick()
    expect(wrapper.text()).toBe('explicit')
  })
})
