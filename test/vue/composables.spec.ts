import { defineComponent, effectScope, h, nextTick, ref } from 'vue'
import { createVueModal, onBeforeModalClose, useCurrentModal, useModalSnapshot } from '../../src/vue'
import { flush } from '../helpers'
import { guarded, mountContainer, Resolver, Title } from './fixtures'
import { mount } from '@vue/test-utils'

describe('useCurrentModal and onBeforeModalClose', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('gives the component its own handle', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    const a = await modal.push(guarded(() => true))
    const b = await modal.push(guarded(() => true))
    expect(wrapper.findAll('.guarded').map(w => w.text())).toEqual([String(a.id), String(b.id)])
  })

  it('attaches the guard to the right modal when two are open', async () => {
    const modal = createVueModal()
    mountContainer(modal)
    const seenA: unknown[] = []
    const a = await modal.push(guarded(() => false, seenA))
    const b = await modal.push(guarded(() => true))
    await b.close()
    expect(seenA).toHaveLength(0)
    await expect(a.close()).rejects.toMatchObject({ code: 'guard-rejected' })
    expect(seenA).toHaveLength(1)
  })

  it('passes the close event and binds this to the component instance', async () => {
    const modal = createVueModal()
    mountContainer(modal)
    const seen: { event: unknown; self: unknown }[] = []
    const handle = await modal.push(guarded(() => true, seen))
    await handle.close({ esc: true })
    expect(seen[0]!.event).toEqual({ background: false, esc: true, route: false })
    expect(seen[0]!.self).toBeTruthy()
  })

  it('supports async guards', async () => {
    const modal = createVueModal()
    mountContainer(modal)
    let allow = false
    const Async = defineComponent({
      setup() {
        onBeforeModalClose(async () => {
          await flush()
          return allow
        })
        return () => h('div')
      },
    })
    const handle = await modal.push(Async)
    await expect(handle.close()).rejects.toMatchObject({ code: 'guard-rejected' })
    allow = true
    await handle.close()
    expect(handle.closed).toBe(true)
  })

  it('throws outside-modal outside a modal', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const Outside = defineComponent({
      setup() {
        onBeforeModalClose(() => false)
        return () => h('div')
      },
    })
    expect(() => mount(Outside)).toThrow(expect.objectContaining({ code: 'outside-modal' }))
    expect(() => useCurrentModal()).toThrow(expect.objectContaining({ code: 'outside-modal' }))
    warn.mockRestore()
  })

  it('removes the guard when the component unmounts before closing', async () => {
    const modal = createVueModal({ defaults: { singleShow: true } })
    mountContainer(modal)
    const show = ref(true)
    const Inner = defineComponent({
      setup() {
        onBeforeModalClose(() => false)
        return () => h('i')
      },
    })
    const Outer = defineComponent({
      setup() {
        return () => h('div', show.value ? [h(Inner)] : [])
      },
    })
    const handle = await modal.push(Outer)
    show.value = false
    await nextTick()
    await handle.close()
    expect(handle.closed).toBe(true)
  })
})

describe('useModalResolve', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('resolves the prompt of its own modal', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    const result = modal.prompt<string>(Resolver, { value: 'done' })
    await flush()
    await wrapper.find('.resolve').trigger('click')
    expect(await result).toBe('done')
  })
})

describe('useModalSnapshot', () => {
  it('tracks a namespace reactively', async () => {
    const modal = createVueModal({ requireHost: false })
    const scope = effectScope()
    const snapshot = scope.run(() => useModalSnapshot(undefined, modal))!
    expect(snapshot.value.items).toHaveLength(0)
    const handle = await modal.push(Title)
    expect(snapshot.value.items).toEqual([handle])
    scope.stop()
  })

  it('switches when the namespace source changes', async () => {
    const modal = createVueModal({ requireHost: false })
    const ns = ref('a')
    const scope = effectScope()
    const snapshot = scope.run(() => useModalSnapshot(ns, modal))!
    await modal.push(Title, {}, { namespace: 'b' })
    expect(snapshot.value.namespace).toBe('a')
    ns.value = 'b'
    await nextTick()
    expect(snapshot.value.namespace).toBe('b')
    expect(snapshot.value.items).toHaveLength(1)
    scope.stop()
  })

  it('unsubscribes when the scope stops', async () => {
    const modal = createVueModal({ requireHost: false })
    const scope = effectScope()
    const snapshot = scope.run(() => useModalSnapshot(undefined, modal))!
    scope.stop()
    await modal.push(Title)
    expect(snapshot.value.items).toHaveLength(0)
  })

  it('injects the manager when none is passed', () => {
    const modal = createVueModal()
    let length = -1
    const Probe = defineComponent({
      setup() {
        const snapshot = useModalSnapshot()
        return () => {
          length = snapshot.value.items.length
          return h('div')
        }
      },
    })
    mount(Probe, { global: { plugins: [modal] } })
    expect(length).toBe(0)
  })
})
