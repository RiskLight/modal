import {
  camelize,
  defineComponent,
  h,
  isRef,
  mergeProps,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  toHandlerKey,
  toValue,
  vShow,
  watch,
  withDirectives,
  type PropType,
  type Slot,
} from 'vue'
import { PROMPT_EVENT } from '../core/constants.js'
import { makeDraggable } from '../dom/draggable.js'
import { trapFocus as createFocusTrap } from '../dom/focus-trap.js'
import { HANDLE_KEY } from './keys.js'
import type { VueModalHandle } from './types.js'

function noop(): void {}

function readProps(source: unknown): Record<string, unknown> {
  const value = toValue(source)
  if (!value || typeof value !== 'object') return {}
  const props: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) props[key] = isRef(entry) ? entry.value : entry
  return props
}

function listenersOf(handle: VueModalHandle): Record<string, unknown> {
  const listeners: Record<string, unknown> = {}
  for (const name of new Set([PROMPT_EVENT, ...handle.eventNames()])) {
    listeners[toHandlerKey(camelize(name))] = (...args: unknown[]) => handle.emit(name, ...args)
  }
  return listeners
}

export const ModalItem = defineComponent({
  name: 'ModalItem',
  props: {
    handle: { type: Object as PropType<VueModalHandle>, required: true },
    revision: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    trapFocus: { type: Boolean, default: true },
  },
  setup(props) {
    const handle = props.handle
    provide(HANDLE_KEY, handle)
    const root = ref<HTMLElement>()
    let releaseTrap: (() => void) | undefined
    let releaseDrag: (() => void) | undefined

    const syncTrap = () => {
      const element = root.value
      const wanted = props.trapFocus && props.active && !handle.closed && element !== undefined
      if (wanted && !releaseTrap && element) releaseTrap = createFocusTrap(element)
      else if (!wanted && releaseTrap) {
        releaseTrap()
        releaseTrap = undefined
      }
    }

    const bindDrag = () => {
      const draggable = handle.draggable
      const content = root.value?.firstElementChild
      if (!draggable || !(content instanceof HTMLElement)) return
      const grip = typeof draggable === 'string' ? root.value?.querySelector<HTMLElement>(draggable) : content
      if (grip) releaseDrag = makeDraggable(content, grip)
    }

    const setInstance = (instance: unknown) => {
      handle.instance = instance
    }

    const onPointerdown = (event: PointerEvent) => {
      if (event.target !== event.currentTarget) return
      event.stopPropagation()
      if (handle.backgroundClose) handle.close({ background: true }).catch(noop)
    }

    onMounted(() => {
      syncTrap()
      bindDrag()
    })
    watch(() => [props.active, props.trapFocus], syncTrap, { flush: 'post' })
    onBeforeUnmount(() => {
      releaseTrap?.()
      releaseDrag?.()
      releaseTrap = undefined
      releaseDrag = undefined
    })

    return () => {
      void props.revision
      const extra = handle.extra as { slots?: Record<string, Slot>; ariaLabel?: string; ariaLabelledby?: string }
      const content = h(
        handle.component,
        mergeProps(readProps(handle.props), listenersOf(handle), { class: 'modal-item widget__modal-wrap', ref: setInstance }),
        extra.slots,
      )
      return withDirectives(
        h(
          'div',
          {
            ref: root,
            class: 'modal-container widget__modal-container__item',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': extra.ariaLabel,
            'aria-labelledby': extra.ariaLabelledby,
            onPointerdown,
          },
          [content],
        ),
        [[vShow, props.active]],
      )
    }
  },
})
