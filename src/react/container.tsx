import { useContext, useLayoutEffect, useReducer, useRef, useState } from 'react'
import { DEFAULT_NAMESPACE } from '../core/constants.js'
import { ModalError } from '../core/errors.js'
import { isRecord } from '../core/guards.js'
import { acquireBehaviors } from '../dom/behaviors.js'
import { createDialogItem, dialogLabelAttrs, type BackdropTrigger, type DialogItem } from '../dom/dialog.js'
import { inertOutside } from '../dom/inert.js'
import { joinSelectors } from '../dom/selector.js'
import { injectStyles } from '../dom/styles.js'
import { enterTransition, leaveTransition } from '../dom/transition.js'
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
  transition: string | false
  leaving: boolean
  onLeft: (handle: ReactModalHandle) => void
}

interface Displayed {
  handle: ReactModalHandle
  leaving: boolean
}

function mergeDisplayed(previous: readonly Displayed[], items: readonly ReactModalHandle[], animate: boolean, finished: ReadonlySet<ReactModalHandle>): Displayed[] {
  const next: Displayed[] = []
  for (const entry of previous) {
    if (items.includes(entry.handle)) next.push({ handle: entry.handle, leaving: false })
    else if (animate && !finished.has(entry.handle)) next.push({ handle: entry.handle, leaving: true })
  }
  for (const handle of items) {
    if (!next.some(entry => entry.handle === handle)) next.push({ handle, leaving: false })
  }
  return next
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

function ModalItem({ handle, revision, active, trapFocus, backdropTrigger, allowOutside, transition, leaving, onLeft }: ItemProps) {
  const root = useRef<HTMLDivElement>(null)
  const [dialog] = useState<DialogItem>(() =>
    createDialogItem(handle, { active, trapFocus, backdropTrigger, allowOutside, labels: dialogLabelAttrs(handle.extra), surfaceClass: SURFACE_CLASS }),
  )
  useLayoutEffect(() => {
    const element = root.current
    if (element) dialog.mount(element)
    const cancelEnter = element && transition ? enterTransition(element, transition) : undefined
    return () => {
      cancelEnter?.()
      dialog.unmount()
    }
  }, [dialog])
  useLayoutEffect(() => {
    const element = root.current
    if (!leaving) return undefined
    dialog.unmount()
    if (!element || !transition) {
      onLeft(handle)
      return undefined
    }
    return leaveTransition(element, transition, () => onLeft(handle))
  }, [leaving])
  useLayoutEffect(() => {
    dialog.update({ active, trapFocus, backdropTrigger, allowOutside })
  }, [dialog, active, trapFocus, backdropTrigger, allowOutside, revision])

  const Component = handle.component
  const props = isRecord(handle.props) ? handle.props : {}
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
  transition = 'modal-list',
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
        ? inertOutside(host.current, { exclude: joinSelectors(`[${HOST_ATTRIBUTE}]`, allowOutside) })
        : undefined,
    [trapFocus, hasItems, allowOutside],
  )

  const displayedRef = useRef<Displayed[]>([])
  const finished = useRef(new Set<ReactModalHandle>()).current
  const [, rerender] = useReducer((count: number) => count + 1, 0)
  const displayed = mergeDisplayed(displayedRef.current, snapshot.items, transition !== false, finished)
  displayedRef.current = displayed
  for (const handle of finished) {
    if (!displayed.some(entry => entry.handle === handle)) finished.delete(handle)
  }
  const onLeft = (handle: ReactModalHandle) => {
    finished.add(handle)
    rerender()
  }
  const last = snapshot.items.at(-1)
  return (
    <div {...rest} ref={host} {...{ [HOST_ATTRIBUTE]: '' }}>
      {displayed.map(({ handle, leaving }) => (
        <ModalItem
          key={handle.id}
          handle={handle}
          revision={handle.revision}
          active={leaving || !snapshot.options.singleShow || handle === last}
          trapFocus={trapFocus && !leaving}
          backdropTrigger={backdropTrigger}
          allowOutside={allowOutside}
          transition={transition}
          leaving={leaving}
          onLeft={onLeft}
        />
      ))}
    </div>
  )
}
