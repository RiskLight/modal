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
import { trapFocus as createFocusTrap, type ReleaseFocusTrap } from '../dom/focus-trap.js'
import { HANDLE_KEY } from './keys.js'
import type { BackdropTrigger, VueModalHandle } from './types.js'

interface ItemExtra {
  slots?: Record<string, Slot>
  ariaLabel?: string
  ariaLabelledby?: string
}

const HEADING = 'h1, h2, h3, h4, h5, h6, [role="heading"], [data-modal-title]'

let headingSeed = 0

function noop(): void {}

function readProps(source: unknown): Record<string, unknown> {
  const value = toValue(source)
  if (!value || typeof value !== 'object') return {}
  const props: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) props[key] = isRef(entry) ? entry.value : entry
  return props
}

function listenersOf(handle: VueModalHandle, cache: Map<string, (...args: unknown[]) => void>): Record<string, unknown> {
  const listeners: Record<string, unknown> = {}
  for (const name of new Set([PROMPT_EVENT, ...handle.eventNames()])) {
    let listener = cache.get(name)
    if (!listener) {
      listener = (...args: unknown[]) => handle.emit(name, ...args)
      cache.set(name, listener)
    }
    listeners[toHandlerKey(camelize(name))] = listener
  }
  return listeners
}

function stableSlots(slots: Record<string, Slot> | undefined) {
  return slots ? { ...slots, $stable: true } : undefined
}

function safeQuery(root: HTMLElement | undefined, selector: string): HTMLElement | null {
  try {
    return root?.querySelector<HTMLElement>(selector) ?? null
  } catch {
    return null
  }
}

function labelAttrs(extra: ItemExtra): Record<string, string> {
  const attrs: Record<string, string> = {}
  if (extra.ariaLabel !== undefined) attrs['aria-label'] = extra.ariaLabel
  if (extra.ariaLabelledby !== undefined) attrs['aria-labelledby'] = extra.ariaLabelledby
  return attrs
}

function applyDialogDefaults(surface: HTMLElement): void {
  if (!surface.hasAttribute('role')) surface.setAttribute('role', 'dialog')
  if (!surface.hasAttribute('aria-modal')) surface.setAttribute('aria-modal', 'true')
  labelFromHeading(surface)
}

function labelFromHeading(surface: HTMLElement): void {
  if (surface.hasAttribute('aria-label') || surface.hasAttribute('aria-labelledby')) return
  const heading = surface.querySelector<HTMLElement>(HEADING)
  if (!heading) return
  if (!heading.id) heading.id = `risklight-modal-title-${++headingSeed}`
  surface.setAttribute('aria-labelledby', heading.id)
}

export const ModalItem = defineComponent({
  name: 'ModalItem',
  props: {
    handle: { type: Object as PropType<VueModalHandle>, required: true },
    revision: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    trapFocus: { type: Boolean, default: true },
    backdropTrigger: { type: String as PropType<BackdropTrigger>, default: 'click' },
  },
  setup(props) {
    const handle = props.handle
    provide(HANDLE_KEY, handle)
    const root = ref<HTMLElement>()
    let releaseTrap: ReleaseFocusTrap | undefined
    let releaseDrag: (() => void) | undefined
    let savedFocus: HTMLElement | undefined
    let pressedBackdrop = false
    const listenerCache = new Map<string, (...args: unknown[]) => void>()

    const surface = (): HTMLElement | undefined => {
      const element = root.value?.firstElementChild
      return element instanceof HTMLElement ? element : undefined
    }

    const syncTrap = () => {
      const element = root.value
      const wanted = props.trapFocus && props.active && !handle.closed && element !== undefined
      if (wanted && !releaseTrap && element) {
        const initialFocus = savedFocus?.isConnected ? savedFocus : undefined
        savedFocus = undefined
        releaseTrap = createFocusTrap(element, { initialFocus, fallbackFocus: surface() })
      } else if (!wanted && releaseTrap) {
        const focused = document.activeElement
        if (!handle.closed && focused instanceof HTMLElement && element?.contains(focused)) savedFocus = focused
        releaseTrap({ returnFocus: handle.closed })
        releaseTrap = undefined
      }
    }

    let boundDraggable: boolean | string = false

    const syncDrag = () => {
      const draggable = handle.draggable
      if (draggable === boundDraggable && (releaseDrag || !draggable)) return
      releaseDrag?.()
      releaseDrag = undefined
      boundDraggable = draggable
      const content = surface()
      if (!draggable || !content) return
      const grip = typeof draggable === 'string' ? safeQuery(root.value, draggable) : content
      if (grip) releaseDrag = makeDraggable(content, grip)
    }

    const setInstance = (instance: unknown) => {
      if (instance === null && handle.closed) return
      handle.instance = instance
    }

    const onPointerdown = (event: PointerEvent) => {
      pressedBackdrop = event.target === event.currentTarget
      if (!pressedBackdrop) return
      event.stopPropagation()
      if (props.backdropTrigger === 'pointerdown') closeFromBackdrop()
    }

    const onClick = (event: MouseEvent) => {
      const fromBackdrop = pressedBackdrop && event.target === event.currentTarget
      pressedBackdrop = false
      if (fromBackdrop && props.backdropTrigger === 'click') closeFromBackdrop()
    }

    const closeFromBackdrop = () => {
      if (handle.backgroundClose) handle.close({ background: true }).catch(noop)
    }

    onMounted(() => {
      const content = surface()
      if (content) applyDialogDefaults(content)
      syncTrap()
      syncDrag()
    })
    watch(() => [props.active, props.trapFocus], syncTrap, { flush: 'post' })
    watch(() => props.revision, syncDrag, { flush: 'post' })
    onBeforeUnmount(() => {
      releaseTrap?.()
      releaseDrag?.()
      releaseTrap = undefined
      releaseDrag = undefined
    })

    return () => {
      void props.revision
      const extra = handle.extra as ItemExtra
      const content = h(
        handle.component,
        mergeProps(readProps(handle.props), listenersOf(handle, listenerCache), labelAttrs(extra), {
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
