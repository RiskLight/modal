import { useContext, useLayoutEffect, useRef, useState, type ComponentType } from 'react'
import { DEFAULT_NAMESPACE } from '../core/constants.js'
import { ModalError } from '../core/errors.js'
import { acquireBehaviors } from '../dom/behaviors.js'
import { createDialogItem, dialogLabelAttrs, type BackdropTrigger, type DialogItem } from '../dom/dialog.js'
import { inertOutside } from '../dom/inert.js'
import { injectStyles } from '../dom/styles.js'
import { HandleContext, ManagerContext } from './context.js'
import { useModalSnapshot } from './hooks.js'
import type { ModalContainerProps, ReactModalHandle } from './types.js'

const HOST_ATTRIBUTE = 'data-modal-host'

const SURFACE_CLASS = 'modal-item widget__modal-wrap'

interface ItemProps {
  handle: ReactModalHandle
  revision: number
  active: boolean
  trapFocus: boolean
  backdropTrigger: BackdropTrigger
  allowOutside: string | undefined
}

function handlerName(event: string): string {
  const camel = event.replace(/[-:](\w)/g, (_match, letter: string) => letter.toUpperCase())
  return `on${camel.charAt(0).toUpperCase()}${camel.slice(1)}`
}

function useListeners(handle: ReactModalHandle, props: Record<string, unknown>): Record<string, unknown> {
  const cache = useRef(new Map<string, (...args: unknown[]) => void>())
  const listeners: Record<string, unknown> = {}
  for (const name of handle.eventNames()) {
    const key = handlerName(name)
    const own = props[key]
    let listener = cache.current.get(name)
    if (!listener) {
      listener = (...args: unknown[]) => handle.emit(name, ...args)
      cache.current.set(name, listener)
    }
    const forward = listener
    listeners[key] =
      typeof own === 'function'
        ? (...args: unknown[]) => {
            own(...args)
            forward(...args)
          }
        : forward
  }
  return listeners
}

function ModalItem({ handle, revision, active, trapFocus, backdropTrigger, allowOutside }: ItemProps) {
  const root = useRef<HTMLDivElement>(null)
  const [dialog] = useState<DialogItem>(() =>
    createDialogItem(handle, { active, trapFocus, backdropTrigger, allowOutside, labels: dialogLabelAttrs(handle.extra), surfaceClass: SURFACE_CLASS }),
  )
  useLayoutEffect(() => {
    if (root.current) dialog.mount(root.current)
    return () => dialog.unmount()
  }, [dialog])
  useLayoutEffect(() => {
    dialog.update({ active, trapFocus, backdropTrigger, allowOutside })
  }, [dialog, active, trapFocus, backdropTrigger, allowOutside, revision])

  const Component = handle.component as ComponentType<Record<string, unknown>>
  const props = handle.props && typeof handle.props === 'object' ? (handle.props as Record<string, unknown>) : {}
  const listeners = useListeners(handle, props)

  return (
    <HandleContext.Provider value={handle}>
      <div
        ref={root}
        className="modal-container widget__modal-container__item"
        style={active ? undefined : { display: 'none' }}
        onPointerDown={event => dialog.pointerdown(event)}
        onClick={event => dialog.click(event)}
      >
        <Component {...props} {...listeners} />
      </div>
    </HandleContext.Provider>
  )
}

export function ModalContainer({
  namespace = DEFAULT_NAMESPACE,
  manager: explicit,
  trapFocus = true,
  behaviors = true,
  unstyled = false,
  nonce,
  backdropTrigger = 'click',
  escapeEvent = 'keydown',
  allowOutside,
  ...rest
}: ModalContainerProps) {
  const provided = useContext(ManagerContext)
  const manager = explicit ?? provided
  if (!manager) throw new ModalError('no-manager', 'No modal manager found. Wrap the app in <ModalProvider> or pass manager')
  const snapshot = useModalSnapshot(namespace, manager)
  const host = useRef<HTMLDivElement>(null)
  const hasItems = snapshot.items.length > 0

  useLayoutEffect(() => {
    if (!unstyled) injectStyles(document, nonce)
  }, [unstyled, nonce])
  useLayoutEffect(() => manager.attachHost(namespace), [manager, namespace])
  useLayoutEffect(
    () => (behaviors ? acquireBehaviors(manager.core, { escape: { event: escapeEvent, allowOutside } }) : undefined),
    [manager, behaviors, escapeEvent, allowOutside],
  )
  useLayoutEffect(
    () =>
      trapFocus && hasItems && host.current
        ? inertOutside(host.current, { exclude: [`[${HOST_ATTRIBUTE}]`, allowOutside].filter(Boolean).join(', ') })
        : undefined,
    [trapFocus, hasItems, allowOutside],
  )

  const last = snapshot.items.length - 1
  return (
    <div {...rest} ref={host} {...{ [HOST_ATTRIBUTE]: '' }}>
      {snapshot.items.map((handle, index) => (
        <ModalItem
          key={handle.id}
          handle={handle}
          revision={handle.revision}
          active={!snapshot.options.singleShow || index === last}
          trapFocus={trapFocus}
          backdropTrigger={backdropTrigger}
          allowOutside={allowOutside}
        />
      ))}
    </div>
  )
}
