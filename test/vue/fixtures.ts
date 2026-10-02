import { defineComponent, h, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { PROMPT_EVENT } from '../../src'
import { ModalContainer, onBeforeModalClose, useCurrentModal, useModalResolve, type VueModalManager } from '../../src/vue'

export const Title = defineComponent({
  name: 'Title',
  props: { title: { type: String, default: '' }, extra: { type: Number, default: 0 } },
  setup(props) {
    const local = ref('local')
    return { local, props }
  },
  render() {
    return h('div', { class: 'title' }, this.title)
  },
})

export const Emitter = defineComponent({
  name: 'Emitter',
  props: { value: { type: null, default: undefined } },
  emits: ['save', PROMPT_EVENT],
  setup(props, { emit }) {
    return () =>
      h('div', [
        h('button', { class: 'save', onClick: () => emit('save', props.value) }),
        h('button', { class: 'prompt', onClick: () => emit(PROMPT_EVENT, props.value) }),
      ])
  },
})

export const Resolver = defineComponent({
  name: 'Resolver',
  props: { value: { type: null, default: undefined } },
  setup(props) {
    const resolve = useModalResolve()
    return () => h('button', { class: 'resolve', onClick: () => resolve(props.value).catch(() => {}) })
  },
})

export function guarded(verdict: () => boolean | void, seen: unknown[] = []) {
  return defineComponent({
    name: 'Guarded',
    setup() {
      const handle = useCurrentModal()
      onBeforeModalClose(function (this: unknown, event) {
        seen.push({ handle, event, self: this })
        return verdict()
      })
      return () => h('div', { class: 'guarded' }, String(handle.id))
    },
  })
}

export const OptionsGuard = defineComponent({
  name: 'OptionsGuard',
  beforeModalClose() {
    return false
  },
  render() {
    return h('div', 'options-guard')
  },
})

export const WithSlots = defineComponent({
  name: 'WithSlots',
  setup(_props, { slots }) {
    return () => h('div', { class: 'with-slots' }, [slots.default?.(), slots.footer?.({ label: 'f' })])
  },
})

export const Focusable = defineComponent({
  name: 'Focusable',
  render() {
    return h('div', { class: 'focusable' }, [h('button', { id: 'first' }), h('button', { id: 'last' })])
  },
})

export const Draggable = defineComponent({
  name: 'Draggable',
  render() {
    return h('div', { class: 'draggable' }, [h('header', { class: 'handle' }, 'drag')])
  },
})

export function mountContainer(manager: VueModalManager, props: Record<string, unknown> = {}, attrs: Record<string, unknown> = {}) {
  return mount(ModalContainer, { props, attrs, global: { plugins: [manager] }, attachTo: document.body })
}
