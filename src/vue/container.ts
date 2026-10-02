import {
  defineComponent,
  getCurrentInstance,
  h,
  onBeforeUnmount,
  onMounted,
  TransitionGroup,
  watch,
} from 'vue'
import { DEFAULT_NAMESPACE } from '../core/constants.js'
import { acquireBehaviors } from '../dom/behaviors.js'
import { inertOutside } from '../dom/inert.js'
import { joinSelectors } from '../dom/selector.js'
import { useModal, useModalSnapshot } from './composables.js'
import { ModalItem } from './item.js'
import { injectStyles } from './styles.js'
import { optionalObjectProp, optionalStringProp, unionProp } from './props.js'
import { isRecord } from '../core/guards.js'
import type { BackdropTrigger, VueModalManager } from './types.js'

export const HOST_ATTRIBUTE = 'data-modal-host'

function isVueModalManager(value: unknown): value is VueModalManager {
  return isRecord(value) && typeof value.attachHost === 'function' && typeof value.getSnapshot === 'function'
}

export const ModalContainer = defineComponent({
  name: 'ModalContainer',
  props: {
    namespace: { type: String, default: DEFAULT_NAMESPACE },
    manager: optionalObjectProp(isVueModalManager),
    transition: { type: String, default: 'modal-list' },
    appear: { type: Boolean, default: true },
    trapFocus: { type: Boolean, default: true },
    behaviors: { type: Boolean, default: true },
    unstyled: { type: Boolean, default: false },
    nonce: optionalStringProp(),
    backdropTrigger: unionProp<BackdropTrigger>(['click', 'pointerdown'], 'click'),
    escapeEvent: unionProp<'keydown' | 'keyup'>(['keydown', 'keyup'], 'keydown'),
    allowOutside: optionalStringProp(),
  },
  setup(props) {
    const manager = props.manager ?? useModal()
    const snapshot = useModalSnapshot(() => props.namespace, manager)
    const instance = getCurrentInstance()
    let detach: (() => void) | undefined
    let release: (() => void) | undefined
    let releaseInert: (() => void) | undefined

    const syncInert = () => {
      const element = instance?.vnode.el
      const wanted = props.trapFocus && snapshot.value.items.length > 0 && element instanceof HTMLElement
      if (wanted && !releaseInert) releaseInert = inertOutside(element, { exclude: joinSelectors(`[${HOST_ATTRIBUTE}]`, props.allowOutside) })
      else if (!wanted && releaseInert) {
        releaseInert()
        releaseInert = undefined
      }
    }

    const bindBehaviors = () => {
      release?.()
      release = props.behaviors ? acquireBehaviors(manager.core, { escape: { event: props.escapeEvent, allowOutside: props.allowOutside } }) : undefined
    }

    onMounted(() => {
      if (!props.unstyled) injectStyles(document, props.nonce)
      detach = manager.attachHost(props.namespace)
      bindBehaviors()
      syncInert()
    })
    watch(
      () => [props.escapeEvent, props.allowOutside] as const,
      () => {
        if (!detach) return
        bindBehaviors()
      },
    )
    watch(
      () => props.allowOutside,
      () => {
        releaseInert?.()
        releaseInert = undefined
        syncInert()
      },
    )
    watch(
      () => props.namespace,
      namespace => {
        if (!detach) return
        detach()
        detach = manager.attachHost(namespace)
      },
    )
    watch([snapshot, () => props.trapFocus], syncInert)
    onBeforeUnmount(() => {
      detach?.()
      release?.()
      releaseInert?.()
      detach = undefined
      release = undefined
      releaseInert = undefined
    })

    return () => {
      const { items, options } = snapshot.value
      const last = items.length - 1
      return h(
        TransitionGroup,
        { name: props.transition, appear: props.appear, tag: 'div', [HOST_ATTRIBUTE]: '' },
        {
          default: () =>
            items.map((handle, index) =>
              h(ModalItem, {
                key: handle.id,
                handle,
                revision: handle.revision,
                active: !options.singleShow || index === last,
                trapFocus: props.trapFocus,
                backdropTrigger: props.backdropTrigger,
                allowOutside: props.allowOutside,
              }),
            ),
        },
      )
    }
  },
})
