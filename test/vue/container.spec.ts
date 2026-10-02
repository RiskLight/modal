import { computed, h, nextTick, reactive, ref, TransitionGroup } from 'vue'
import { mount } from '@vue/test-utils'
import { createVueModal, ModalContainer } from '../../src/vue'
import { flush } from '../helpers'
import { Draggable, Emitter, Focusable, mountContainer, Title, WithSlots } from './fixtures'

function escape() {
  document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true, cancelable: true }))
}

describe('ModalContainer rendering', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.head.innerHTML = ''
    document.body.removeAttribute('style')
  })

  it('renders open modals in order and removes closed ones', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    const a = await modal.push(Title, { title: 'a' })
    await modal.push(Title, { title: 'b' })
    expect(wrapper.findAll('.title').map(w => w.text())).toEqual(['a', 'b'])
    await a.close()
    await nextTick()
    expect(wrapper.findAll('.title').map(w => w.text())).toEqual(['b'])
  })

  it('renders nothing but the host element when empty', () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    expect(wrapper.text()).toBe('')
    expect(wrapper.findAll('.modal-container')).toHaveLength(0)
  })

  it('renders only its own namespace', async () => {
    const modal = createVueModal()
    const main = mountContainer(modal)
    const side = mountContainer(modal, { namespace: 'side' })
    await modal.push(Title, { title: 'main' })
    await modal.push(Title, { title: 'side' }, { namespace: 'side' })
    expect(main.text()).toBe('main')
    expect(side.text()).toBe('side')
  })

  it('follows a namespace prop change', async () => {
    const modal = createVueModal({ requireHost: false })
    const wrapper = mountContainer(modal)
    await modal.push(Title, { title: 'side' }, { namespace: 'side' })
    expect(wrapper.text()).toBe('')
    await wrapper.setProps({ namespace: 'side' })
    expect(wrapper.text()).toBe('side')
    expect(modal.isHosted('side')).toBe(true)
    expect(modal.isHosted()).toBe(false)
  })

  it('passes attrs to the root element', () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal, {}, { id: 'host', class: 'custom', 'data-x': '1' })
    expect(wrapper.attributes('id')).toBe('host')
    expect(wrapper.classes()).toContain('custom')
    expect(wrapper.attributes('data-x')).toBe('1')
  })

  it('marks each modal as an accessible dialog', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    await modal.push(Title, { title: 'a' })
    const item = wrapper.find('.modal-container')
    expect(item.attributes('role')).toBe('dialog')
    expect(item.attributes('aria-modal')).toBe('true')
  })

  it('applies aria-label and aria-labelledby from options extra', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    await modal.push(Title, {}, { extra: { ariaLabel: 'Settings', ariaLabelledby: 'heading' } })
    const item = wrapper.find('.modal-container')
    expect(item.attributes('aria-label')).toBe('Settings')
    expect(item.attributes('aria-labelledby')).toBe('heading')
  })

  it('keeps upstream class names for styling compatibility', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    await modal.push(Title)
    expect(wrapper.find('.modal-container').classes()).toContain('widget__modal-container__item')
    expect(wrapper.find('.title').classes()).toEqual(expect.arrayContaining(['modal-item', 'widget__modal-wrap']))
  })

  it('uses a TransitionGroup with the configured name and appear', () => {
    const modal = createVueModal()
    const wrapper = mount(ModalContainer, {
      props: { transition: 'fade', appear: false },
      global: { plugins: [modal], stubs: { 'transition-group': false } },
    })
    const group = wrapper.findComponent(TransitionGroup)
    expect(group.props('name')).toBe('fade')
    expect(group.props('appear')).toBe(false)
  })

  it('defaults the transition to modal-list with appear', () => {
    const modal = createVueModal()
    const wrapper = mount(ModalContainer, { global: { plugins: [modal], stubs: { 'transition-group': false } } })
    const group = wrapper.findComponent(TransitionGroup)
    expect(group.props('name')).toBe('modal-list')
    expect(group.props('appear')).toBe(true)
  })

  it('passes slots from options to the component', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    await modal.push(WithSlots, {}, { slots: { default: () => [h('i', 'body')], footer: ({ label }: { label: string }) => [h('u', label)] } })
    expect(wrapper.find('.with-slots i').text()).toBe('body')
    expect(wrapper.find('.with-slots u').text()).toBe('f')
  })

  it('exposes the component instance on the handle and clears it on close', async () => {
    const modal = createVueModal()
    mountContainer(modal)
    const handle = await modal.push(Title, { title: 'inst' })
    expect((handle.instance as { local: string }).local).toBe('local')
    await handle.close()
    await nextTick()
    expect(handle.instance).toBeNull()
  })
})

describe('ModalContainer props handling', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('passes plain props', async () => {
    const modal = createVueModal()
    mountContainer(modal)
    const h = await modal.push(Title, { title: 'plain', extra: 2 })
    expect(h.instance).toMatchObject({ title: 'plain', extra: 2 })
  })

  it('follows a ref of props', async () => {
    const modal = createVueModal()
    mountContainer(modal)
    const state = ref({ title: 'one' })
    const h = await modal.push(Title, state)
    state.value.title = 'two'
    await nextTick()
    expect((h.instance as { title: string }).title).toBe('two')
    state.value = { title: 'three' }
    await nextTick()
    expect((h.instance as { title: string }).title).toBe('three')
  })

  it('follows a reactive object', async () => {
    const modal = createVueModal()
    mountContainer(modal)
    const state = reactive({ title: 'one' })
    const h = await modal.push(Title, state)
    state.title = 'two'
    await nextTick()
    expect((h.instance as { title: string }).title).toBe('two')
  })

  it('follows a computed', async () => {
    const modal = createVueModal()
    mountContainer(modal)
    const source = ref('one')
    const h = await modal.push(Title, computed(() => ({ title: source.value })))
    source.value = 'two'
    await nextTick()
    expect((h.instance as { title: string }).title).toBe('two')
  })

  it('follows a getter', async () => {
    const modal = createVueModal()
    mountContainer(modal)
    const source = ref('one')
    const h = await modal.push(Title, () => ({ title: source.value }))
    source.value = 'two'
    await nextTick()
    expect((h.instance as { title: string }).title).toBe('two')
  })

  it('follows refs nested in a plain object', async () => {
    const modal = createVueModal()
    mountContainer(modal)
    const title = ref('one')
    const h = await modal.push(Title, { title } as never)
    title.value = 'two'
    await nextTick()
    expect((h.instance as { title: string }).title).toBe('two')
  })

  it('handles missing props', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    await modal.push(Title)
    expect(wrapper.find('.title').text()).toBe('')
  })
})

describe('ModalContainer events', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('forwards component emits to handle listeners', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    const handle = await modal.push(Emitter, { value: 7 })
    const listener = vi.fn()
    handle.on('save', listener)
    await nextTick()
    await wrapper.find('.save').trigger('click')
    expect(listener).toHaveBeenCalledWith(7)
  })

  it('stops forwarding after the listener is removed', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    const handle = await modal.push(Emitter, { value: 7 })
    const listener = vi.fn()
    const off = handle.on('save', listener)
    await nextTick()
    off()
    await nextTick()
    await wrapper.find('.save').trigger('click')
    expect(listener).not.toHaveBeenCalled()
  })

  it('keeps on* handlers passed in props', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    const fromProps = vi.fn()
    const handle = await modal.push(Emitter, { value: 1, onSave: fromProps })
    const fromHandle = vi.fn()
    handle.on('save', fromHandle)
    await nextTick()
    await wrapper.find('.save').trigger('click')
    expect(fromProps).toHaveBeenCalledWith(1)
    expect(fromHandle).toHaveBeenCalledWith(1)
  })

  it('resolves a prompt when the component emits the prompt event', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    const result = modal.prompt<number>(Emitter, { value: 5 })
    await flush()
    await wrapper.find('.prompt').trigger('click')
    expect(await result).toBe(5)
    await nextTick()
    expect(wrapper.find('.prompt').exists()).toBe(false)
  })
})

describe('ModalContainer closing', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.body.removeAttribute('style')
  })

  it('closes on background pointerdown with background: true', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    const handle = await modal.push(Title)
    const guard = vi.fn()
    handle.onBeforeClose(guard)
    await wrapper.find('.modal-container').trigger('pointerdown')
    await flush()
    expect(handle.closed).toBe(true)
    expect(guard).toHaveBeenCalledWith({ background: true, esc: false, route: false })
  })

  it('ignores pointerdown inside the modal content', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    const handle = await modal.push(Title)
    await wrapper.find('.title').trigger('pointerdown')
    await flush()
    expect(handle.closed).toBe(false)
  })

  it('respects backgroundClose false and its runtime changes', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    const handle = await modal.push(Title, {}, { backgroundClose: false })
    await wrapper.find('.modal-container').trigger('pointerdown')
    await flush()
    expect(handle.closed).toBe(false)
    handle.backgroundClose = true
    await wrapper.find('.modal-container').trigger('pointerdown')
    await flush()
    expect(handle.closed).toBe(true)
  })

  it('swallows a vetoed background close', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    const handle = await modal.push(Title)
    handle.onBeforeClose(() => false)
    await wrapper.find('.modal-container').trigger('pointerdown')
    await flush()
    expect(handle.closed).toBe(false)
  })

  it('closes on Escape for any mounted namespace', async () => {
    const modal = createVueModal()
    mountContainer(modal)
    mountContainer(modal, { namespace: 'side' })
    const side = await modal.push(Title, {}, { namespace: 'side' })
    escape()
    await flush()
    expect(side.closed).toBe(true)
  })

  it('binds a single Escape listener for several containers', async () => {
    const add = vi.spyOn(document, 'addEventListener')
    const modal = createVueModal()
    mountContainer(modal)
    mountContainer(modal, { namespace: 'side' })
    expect(add.mock.calls.filter(([type]) => type === 'keyup')).toHaveLength(1)
    add.mockRestore()
  })

  it('releases Escape and scroll lock on unmount', async () => {
    const modal = createVueModal({ requireHost: false })
    const wrapper = mountContainer(modal)
    wrapper.unmount()
    const handle = await modal.push(Title)
    escape()
    await flush()
    expect(handle.closed).toBe(false)
    expect(document.body.style.overflow).toBe('')
  })

  it('locks body scroll while modals are open', async () => {
    const modal = createVueModal()
    mountContainer(modal)
    const handle = await modal.push(Title)
    expect(document.body.style.overflow).toBe('hidden')
    await handle.close()
    expect(document.body.style.overflow).toBe('')
  })

  it('skips Escape and scroll lock when behaviors is false', async () => {
    const modal = createVueModal()
    mountContainer(modal, { behaviors: false })
    const handle = await modal.push(Title)
    expect(document.body.style.overflow).toBe('')
    escape()
    await flush()
    expect(handle.closed).toBe(false)
  })
})

describe('ModalContainer singleShow', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function visible(wrapper: ReturnType<typeof mountContainer>) {
    return wrapper.findAll('.modal-container').map(item => (item.element as HTMLElement).style.display !== 'none')
  }

  it('shows every modal by default', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    await modal.push(Title)
    await modal.push(Title)
    expect(visible(wrapper)).toEqual([true, true])
  })

  it('shows only the top modal when singleShow is on', async () => {
    const modal = createVueModal({ defaults: { singleShow: true } })
    const wrapper = mountContainer(modal)
    await modal.push(Title)
    await modal.push(Title)
    const top = await modal.push(Title)
    expect(visible(wrapper)).toEqual([false, false, true])
    await top.close()
    await nextTick()
    expect(visible(wrapper)).toEqual([false, true])
  })

  it('applies singleShow per namespace', async () => {
    const modal = createVueModal({ namespaces: { side: { singleShow: true } } })
    const main = mountContainer(modal)
    const side = mountContainer(modal, { namespace: 'side' })
    await modal.push(Title)
    await modal.push(Title)
    await modal.push(Title, {}, { namespace: 'side' })
    await modal.push(Title, {}, { namespace: 'side' })
    expect(visible(main)).toEqual([true, true])
    expect(visible(side)).toEqual([false, true])
  })

  it('reacts to configure at runtime', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    await modal.push(Title)
    await modal.push(Title)
    modal.configure({ singleShow: true })
    await nextTick()
    expect(visible(wrapper)).toEqual([false, true])
  })
})

describe('ModalContainer focus', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('moves focus into the modal and returns it on close', async () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const modal = createVueModal()
    mountContainer(modal)
    const handle = await modal.push(Focusable)
    await nextTick()
    expect(document.activeElement?.id).toBe('first')
    await handle.close()
    await flush()
    expect(document.activeElement).toBe(opener)
  })

  it('does not trap focus when trapFocus is false', async () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const modal = createVueModal()
    mountContainer(modal, { trapFocus: false })
    await modal.push(Focusable)
    await nextTick()
    expect(document.activeElement).toBe(opener)
  })

  it('moves the trap to the newly visible modal under singleShow', async () => {
    const modal = createVueModal({ defaults: { singleShow: true } })
    mountContainer(modal)
    const first = await modal.push(Focusable)
    await nextTick()
    const second = await modal.push(Title)
    await nextTick()
    expect(document.activeElement?.closest('.modal-container')).not.toBe((first.instance as { $el: Element }).$el.parentElement)
    await second.close()
    await flush()
    expect(document.activeElement?.id).toBe('first')
  })
})

describe('ModalContainer draggable', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  function drag(target: Element, dx: number, dy: number) {
    target.dispatchEvent(new PointerEvent('pointerdown', { clientX: 0, clientY: 0, bubbles: true, button: 0, pointerType: 'mouse' }))
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: dx, clientY: dy, bubbles: true, pointerType: 'mouse' }))
    document.dispatchEvent(new PointerEvent('pointerup', { clientX: dx, clientY: dy, bubbles: true, pointerType: 'mouse' }))
  }

  it('drags the whole modal when draggable is true', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    await modal.push(Draggable, {}, { draggable: true })
    await nextTick()
    const el = wrapper.find('.draggable').element as HTMLElement
    drag(el, 10, 20)
    expect(el.style.transform).toBe('translate(10px, 20px)')
  })

  it('drags by a handle selector', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    await modal.push(Draggable, {}, { draggable: '.handle' })
    await nextTick()
    const el = wrapper.find('.draggable').element as HTMLElement
    drag(el, 10, 20)
    expect(el.style.transform).toBe('')
    drag(wrapper.find('.handle').element, 5, 5)
    expect(el.style.transform).toBe('translate(5px, 5px)')
  })

  it('does nothing when the selector matches nothing', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    await modal.push(Draggable, {}, { draggable: '.missing' })
    await nextTick()
    const el = wrapper.find('.draggable').element as HTMLElement
    drag(el, 10, 20)
    expect(el.style.transform).toBe('')
  })

  it('is not draggable by default', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    await modal.push(Draggable)
    await nextTick()
    const el = wrapper.find('.draggable').element as HTMLElement
    drag(el, 10, 20)
    expect(el.style.transform).toBe('')
  })
})

describe('ModalContainer styles', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.head.innerHTML = ''
  })

  it('injects default styles once into the head', () => {
    const modal = createVueModal()
    mountContainer(modal)
    mountContainer(modal, { namespace: 'side' })
    const styles = document.head.querySelectorAll('style#risklight-modal-styles')
    expect(styles).toHaveLength(1)
    expect(styles[0]!.textContent).toContain('.modal-container')
  })

  it('places the injected styles first so app styles win', () => {
    const own = document.createElement('style')
    document.head.append(own)
    mountContainer(createVueModal())
    expect(document.head.firstElementChild?.id).toBe('risklight-modal-styles')
  })

  it('does not inject styles when unstyled', () => {
    mountContainer(createVueModal(), { unstyled: true })
    expect(document.getElementById('risklight-modal-styles')).toBeNull()
  })
})
