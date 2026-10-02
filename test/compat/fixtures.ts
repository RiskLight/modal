import { defineComponent, onMounted } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import { Modal, modalManager, onBeforeModalClose } from '../../src/compat'

export const ModalTitle = {
  name: 'ModalTitle',
  props: { title: String, age: { type: Number, required: false } },
  template: '<p>{{title}} {{age}}</p>',
}

export const ModalButton = {
  name: 'modal-button',
  props: { value: Number },
  template: `<button role="button" @click="$emit('update', value)">click</button>`,
}

export const ModalPromptValue = defineComponent({
  props: { value: null, timeout: { type: Number, default: 1000 } },
  emits: [Modal.EVENT_PROMPT],
  setup(props, { emit }) {
    function handleClick() {
      emit(Modal.EVENT_PROMPT, props.value)
    }
    onMounted(() => {
      setTimeout(handleClick, props.timeout)
    })
    return { handleClick }
  },
  template: '<div><p>{{ value }}</p><button @click="handleClick"></button></div>',
})

export const ModalPromptValueWithHandler = defineComponent({
  props: { value: null },
  emits: [Modal.EVENT_PROMPT],
  setup(props, { emit }) {
    function handleClick() {
      emit(Modal.EVENT_PROMPT, props.value)
    }
    let canClosed = false
    onBeforeModalClose(() => {
      if (!canClosed) {
        canClosed = true
        return false
      }
      return true
    })
    return { handleClick }
  },
  template: '<div><p>{{ value }}</p><button @click="handleClick"></button></div>',
})

export function wait(n = 10): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, n))
}

export function triggerClickClose(wrapper: VueWrapper<any>) {
  return wrapper.find('.modal-container').trigger('pointerdown')
}

export function forceClean(): void {
  modalManager.reset()
}

export function escape(): void {
  document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }))
}
