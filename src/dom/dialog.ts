import type { ModalCloseEvent } from '../core/types.js'
import { makeDraggable } from './draggable.js'
import { trapFocus, type ReleaseFocusTrap } from './focus-trap.js'

export type BackdropTrigger = 'click' | 'pointerdown'

export interface DialogSource {
  readonly closed: boolean
  readonly backgroundClose: boolean
  readonly draggable: boolean | string
  close(event?: Partial<ModalCloseEvent>): Promise<void>
}

export interface DialogState {
  active: boolean
  trapFocus: boolean
  backdropTrigger: BackdropTrigger
}

export interface DialogEvent {
  readonly target: EventTarget | null
  readonly currentTarget: EventTarget | null
  stopPropagation?(): void
}

export interface DialogItem {
  mount(root: HTMLElement): void
  update(state: Partial<DialogState>): void
  pointerdown(event: DialogEvent): void
  click(event: DialogEvent): void
  unmount(): void
}

const HEADING = 'h1, h2, h3, h4, h5, h6, [role="heading"], [data-modal-title]'

let headingSeed = 0

function noop(): void {}

function safeQuery(root: HTMLElement, selector: string): HTMLElement | null {
  try {
    return root.querySelector<HTMLElement>(selector)
  } catch {
    return null
  }
}

function labelFromHeading(surface: HTMLElement): void {
  if (surface.hasAttribute('aria-label') || surface.hasAttribute('aria-labelledby')) return
  const heading = surface.querySelector<HTMLElement>(HEADING)
  if (!heading) return
  if (!heading.id) heading.id = `risklight-modal-title-${++headingSeed}`
  surface.setAttribute('aria-labelledby', heading.id)
}

export function applyDialogDefaults(surface: HTMLElement): void {
  if (!surface.hasAttribute('role')) surface.setAttribute('role', 'dialog')
  if (!surface.hasAttribute('aria-modal')) surface.setAttribute('aria-modal', 'true')
  labelFromHeading(surface)
}

export function dialogLabelAttrs(extra: Readonly<Record<string, unknown>>): Record<string, string> {
  const attrs: Record<string, string> = {}
  if (typeof extra.ariaLabel === 'string') attrs['aria-label'] = extra.ariaLabel
  if (typeof extra.ariaLabelledby === 'string') attrs['aria-labelledby'] = extra.ariaLabelledby
  return attrs
}

export function createDialogItem(handle: DialogSource, initial: Partial<DialogState> = {}): DialogItem {
  const state: DialogState = { active: true, trapFocus: true, backdropTrigger: 'click', ...initial }
  let root: HTMLElement | undefined
  let releaseTrap: ReleaseFocusTrap | undefined
  let releaseDrag: (() => void) | undefined
  let boundDraggable: boolean | string = false
  let savedFocus: HTMLElement | undefined
  let pressedBackdrop = false

  const surface = (): HTMLElement | undefined => {
    const element = root?.firstElementChild
    return element instanceof HTMLElement ? element : undefined
  }

  const syncTrap = () => {
    const wanted = state.trapFocus && state.active && !handle.closed && root !== undefined
    if (wanted && !releaseTrap && root) {
      const initialFocus = savedFocus?.isConnected ? savedFocus : undefined
      savedFocus = undefined
      releaseTrap = trapFocus(root, { initialFocus, fallbackFocus: surface() })
    } else if (!wanted && releaseTrap) {
      const focused = document.activeElement
      if (!handle.closed && focused instanceof HTMLElement && root?.contains(focused)) savedFocus = focused
      releaseTrap({ returnFocus: handle.closed })
      releaseTrap = undefined
    }
  }

  const syncDrag = () => {
    const draggable = handle.draggable
    if (draggable === boundDraggable && (releaseDrag || !draggable)) return
    releaseDrag?.()
    releaseDrag = undefined
    boundDraggable = draggable
    const content = surface()
    if (!draggable || !content || !root) return
    const grip = typeof draggable === 'string' ? safeQuery(root, draggable) : content
    if (grip) releaseDrag = makeDraggable(content, grip)
  }

  const closeFromBackdrop = () => {
    if (handle.backgroundClose) handle.close({ background: true }).catch(noop)
  }

  return {
    mount(element) {
      root = element
      const content = surface()
      if (content) applyDialogDefaults(content)
      syncTrap()
      syncDrag()
    },
    update(next) {
      Object.assign(state, next)
      if (!root) return
      syncTrap()
      syncDrag()
    },
    pointerdown(event) {
      pressedBackdrop = event.target === event.currentTarget
      if (!pressedBackdrop) return
      event.stopPropagation?.()
      if (state.backdropTrigger === 'pointerdown') closeFromBackdrop()
    },
    click(event) {
      const fromBackdrop = pressedBackdrop && event.target === event.currentTarget
      pressedBackdrop = false
      if (fromBackdrop && state.backdropTrigger === 'click') closeFromBackdrop()
    },
    unmount() {
      releaseTrap?.()
      releaseDrag?.()
      releaseTrap = undefined
      releaseDrag = undefined
      root = undefined
    },
  }
}
