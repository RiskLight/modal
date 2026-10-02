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
  type Slot,
} from 'vue'
import { PROMPT_EVENT } from '../core/constants.js'
import { createDialogItem, dialogLabelAttrs } from '../dom/dialog.js'
import { isRecord } from '../core/guards.js'
import { report } from '../core/report.js'
import { HANDLE_KEY } from './keys.js'
import { requiredObjectProp, unionProp } from './props.js'
import type { BackdropTrigger, VueModalHandle } from './types.js'

interface ItemExtra {
  slots?: Record<string, Slot>
}

function readProps(source: unknown): Record<string, unknown> {
  const value = toValue(source)
  if (!isRecord(value)) return {}
  const props: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) props[key] = isRef(entry) ? entry.value : entry
  return props
}

function listenersOf(handle: VueModalHandle, cache: Map<string, (...args: unknown[]) => void>): Record<string, unknown> {
  const listeners: Record<string, unknown> = {}
  for (const name of new Set([PROMPT_EVENT, ...handle.eventNames()])) {
    let listener = cache.get(name)
    if (!listener) {
      listener =
        name === PROMPT_EVENT
          ? (...args: unknown[]) => {
              handle.emit(name, ...args)
              handle.resolve(args[0]).catch(report)
            }
          : (...args: unknown[]) => handle.emit(name, ...args)
      cache.set(name, listener)
    }
    listeners[toHandlerKey(camelize(name))] = listener
  }
  return listeners
}

function isModalHandle(value: unknown): value is VueModalHandle {
  return isRecord(value) && typeof value.close === 'function' && typeof value.id === 'number'
}

function stableSlots(slots: Record<string, Slot> | undefined) {
  return slots ? { ...slots, $stable: true } : undefined
}

export const ModalItem = defineComponent({
  name: 'ModalItem',
  props: {
    handle: requiredObjectProp(isModalHandle),
    revision: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    trapFocus: { type: Boolean, default: true },
    backdropTrigger: unionProp<BackdropTrigger>(['click', 'pointerdown'], 'click'),
    allowOutside: { type: String, default: undefined },
  },
  setup(props) {
    const handle = props.handle
    provide(HANDLE_KEY, handle)
    const root = ref<HTMLElement>()
    const dialog = createDialogItem(handle, {
      active: props.active,
      trapFocus: props.trapFocus,
      backdropTrigger: props.backdropTrigger,
      allowOutside: props.allowOutside,
    })
    const listenerCache = new Map<string, (...args: unknown[]) => void>()

    const setInstance = (instance: unknown) => {
      if (instance === null && handle.closed) return
      handle.instance = instance
    }

    const onPointerdown = (event: PointerEvent) => dialog.pointerdown(event)
    const onClick = (event: MouseEvent) => dialog.click(event)

    onMounted(() => {
      if (root.value) dialog.mount(root.value)
    })
    watch(
      () => [props.active, props.trapFocus, props.backdropTrigger, props.allowOutside, props.revision] as const,
      ([active, trapFocus, backdropTrigger, allowOutside]) => dialog.update({ active, trapFocus, backdropTrigger, allowOutside }),
      { flush: 'post' },
    )
    onBeforeUnmount(() => dialog.unmount())

    return () => {
      void props.revision
      const extra = handle.extra as ItemExtra
      const content = h(
        handle.component,
        mergeProps(readProps(handle.props), listenersOf(handle, listenerCache), dialogLabelAttrs(handle.extra), {
          class: 'modal-item widget__modal-wrap',
          ref: setInstance,
        }),
        stableSlots(extra.slots),
      )
      return withDirectives(
        h('div', { ref: root, class: 'modal-container widget__modal-container__item', onPointerdown, onClick }, [content]),
        [[vShow, props.active]],
      )
    }
  },
})
