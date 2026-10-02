import { defineComponent, h, onBeforeUnmount, onMounted, TransitionGroup, watch, type PropType } from 'vue'
import { DEFAULT_NAMESPACE } from '../core/constants.js'
import { acquireBehaviors } from '../dom/behaviors.js'
import { useModal, useModalSnapshot } from './composables.js'
import { ModalItem } from './item.js'
import { injectStyles } from './styles.js'
import type { VueModalManager } from './types.js'

export const ModalContainer = defineComponent({
  name: 'ModalContainer',
  props: {
    namespace: { type: String, default: DEFAULT_NAMESPACE },
    manager: { type: Object as PropType<VueModalManager>, default: undefined },
    transition: { type: String, default: 'modal-list' },
    appear: { type: Boolean, default: true },
    trapFocus: { type: Boolean, default: true },
    behaviors: { type: Boolean, default: true },
    unstyled: { type: Boolean, default: false },
  },
  setup(props) {
    const manager = props.manager ?? useModal()
    const snapshot = useModalSnapshot(() => props.namespace, manager)
    let detach: (() => void) | undefined
    let release: (() => void) | undefined

    onMounted(() => {
      if (!props.unstyled) injectStyles()
      detach = manager.attachHost(props.namespace)
      if (props.behaviors) release = acquireBehaviors(manager.core)
    })
    watch(
      () => props.namespace,
      namespace => {
        if (!detach) return
        detach()
        detach = manager.attachHost(namespace)
      },
    )
    onBeforeUnmount(() => {
      detach?.()
      release?.()
      detach = undefined
      release = undefined
    })

    return () => {
      const { items, options } = snapshot.value
      const last = items.length - 1
      return h(
        TransitionGroup,
        { name: props.transition, appear: props.appear, tag: 'div' },
        {
          default: () =>
            items.map((handle, index) =>
              h(ModalItem, {
                key: handle.id,
                handle,
                revision: handle.revision,
                active: !options.singleShow || index === last,
                trapFocus: props.trapFocus,
              }),
            ),
        },
      )
    }
  },
})
