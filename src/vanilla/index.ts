import { DEFAULT_NAMESPACE } from '../core/constants.js'
import { createModal } from '../core/createModal.js'
import { report } from '../core/report.js'
import type { ModalHandle, ModalOptions, ModalTarget, Namespace } from '../core/types.js'
import { acquireBehaviors } from '../dom/behaviors.js'
import { createDialogItem, dialogLabelAttrs, type DialogItem } from '../dom/dialog.js'
import { inertOutside } from '../dom/inert.js'
import { injectStyles } from '../dom/styles.js'
import type { MountOptions, VanillaComponent, VanillaModalCreateOptions, VanillaModalManager, VanillaRendered } from './types.js'

export type * from './types.js'

const HOST_ATTRIBUTE = 'data-modal-host'

const SURFACE_CLASS = 'modal-item widget__modal-wrap'

type Handle = ModalHandle<VanillaComponent, unknown>

interface Rendered {
  root: HTMLElement
  dialog: DialogItem
  destroy: (() => void) | undefined
}

function noop(): void {}

function resolveTarget(target: Element | string | undefined): Element {
  if (target === undefined) return document.body
  if (typeof target !== 'string') return target
  const found = document.querySelector(target)
  if (!found) throw new Error(`Modal mount target "${target}" was not found`)
  return found
}

function toNode(output: Node | string | VanillaRendered): { element: Node; destroy: (() => void) | undefined } {
  if (typeof output === 'string') return { element: document.createTextNode(output), destroy: undefined }
  if (output instanceof Node) return { element: output, destroy: undefined }
  return { element: output.element, destroy: output.destroy }
}

export function createVanillaModal(options: VanillaModalCreateOptions = {}): VanillaModalManager {
  const { autoMount = true, ...coreOptions } = options
  const core = createModal<VanillaComponent>({
    ...coreOptions,
    requireHost: coreOptions.requireHost ?? (namespace => namespace === DEFAULT_NAMESPACE),
  })

  const mounts = new Set<() => void>()

  function mount(target?: Element | string, mountOptions: MountOptions = {}): () => void {
    if (typeof document === 'undefined') return noop
    const {
      namespace = DEFAULT_NAMESPACE,
      trapFocus = true,
      behaviors = true,
      unstyled = false,
      nonce,
      backdropTrigger = 'click',
      escapeEvent = 'keydown',
      allowOutside,
      className,
    } = mountOptions
    const parent = resolveTarget(target)
    const host = document.createElement('div')
    host.setAttribute(HOST_ATTRIBUTE, '')
    if (className) host.className = className
    parent.append(host)
    if (!unstyled) injectStyles(document, nonce)
    const detach = core.attachHost(namespace)
    const release = behaviors ? acquireBehaviors(core, { escape: { event: escapeEvent, allowOutside } }) : noop
    const rendered = new Map<Handle, Rendered>()
    const exclude = [`[${HOST_ATTRIBUTE}]`, allowOutside].filter(Boolean).join(', ')
    let releaseInert: (() => void) | undefined

    const render = (handle: Handle): Rendered => {
      const root = document.createElement('div')
      root.className = 'modal-container widget__modal-container__item'
      const dialog = createDialogItem(handle, {
        trapFocus,
        backdropTrigger,
        allowOutside,
        labels: dialogLabelAttrs(handle.extra),
        surfaceClass: SURFACE_CLASS,
      })
      root.addEventListener('pointerdown', event => dialog.pointerdown(event))
      root.addEventListener('click', event => dialog.click(event))
      let destroy: (() => void) | undefined
      try {
        const output = toNode(handle.component(handle.props, handle))
        root.append(output.element)
        destroy = output.destroy
      } catch (error) {
        report(error)
        handle.close().catch(noop)
      }
      host.append(root)
      dialog.mount(root)
      return { root, dialog, destroy }
    }

    const remove = (entry: Rendered) => {
      entry.dialog.unmount()
      try {
        entry.destroy?.()
      } catch (error) {
        report(error)
      }
      entry.root.remove()
    }

    const sync = () => {
      const { items, options: namespaceOptions } = core.getSnapshot(namespace)
      const wanted = trapFocus && items.length > 0
      if (!wanted && releaseInert) {
        releaseInert()
        releaseInert = undefined
      }
      for (const [handle, entry] of rendered) {
        if (items.includes(handle)) continue
        rendered.delete(handle)
        remove(entry)
      }
      const last = items.length - 1
      items.forEach((handle, index) => {
        const entry = rendered.get(handle) ?? render(handle)
        rendered.set(handle, entry)
        const active = !namespaceOptions.singleShow || index === last
        entry.root.style.display = active ? '' : 'none'
        entry.dialog.update({ active })
      })
      if (wanted && !releaseInert) releaseInert = inertOutside(host, { exclude })
    }

    const unsubscribe = core.subscribe(sync)
    sync()

    let mounted = true
    const unmount = () => {
      if (!mounted) return
      mounted = false
      mounts.delete(unmount)
      unsubscribe()
      releaseInert?.()
      releaseInert = undefined
      for (const entry of rendered.values()) remove(entry)
      rendered.clear()
      release()
      detach()
      host.remove()
    }
    mounts.add(unmount)
    return unmount
  }

  function ensureHost(namespace: Namespace | undefined): void {
    if (autoMount === false || typeof document === 'undefined') return
    const key = namespace || DEFAULT_NAMESPACE
    if (core.isHosted(key)) return
    mount(autoMount === true ? undefined : autoMount, { namespace: key })
  }

  return {
    ...core,
    core,
    mount,
    open(target: ModalTarget<VanillaComponent>, props?: unknown, opts?: ModalOptions<VanillaComponent>) {
      ensureHost(opts?.namespace)
      return core.open(target, props, opts)
    },
    push(target: ModalTarget<VanillaComponent>, props?: unknown, opts?: ModalOptions<VanillaComponent>) {
      ensureHost(opts?.namespace)
      return core.push(target, props, opts)
    },
    prompt(target: ModalTarget<VanillaComponent>, props?: unknown, opts?: ModalOptions<VanillaComponent>) {
      ensureHost(opts?.namespace)
      return core.prompt(target, props, opts)
    },
    dispose() {
      for (const unmount of Array.from(mounts)) unmount()
      core.dispose()
    },
  } as VanillaModalManager
}
