import { report } from './report.js'
import type {
  ModalCloseEvent,
  CloseGuard,
  ClosedListener,
  ModalEventListener,
  ModalHandle,
  ModalId,
  ModalStatus,
  Namespace,
} from './types.js'

export interface ManagedHandle {
  readonly id: ModalId
  readonly namespace: Namespace
  seal(): void
  complete(event: ModalCloseEvent, notify: boolean): void
}

export interface InternalHandle<C> extends ModalHandle<C, unknown>, ManagedHandle {
  startTimer(): void
}

export interface HandleHost {
  finalize(handle: ManagedHandle, event: ModalCloseEvent): void
  touch(handle: ManagedHandle): void
  escClose(namespace: Namespace): boolean
}

export interface HandleInit<C> {
  namespace: Namespace
  component: C
  props: unknown
  name: string | undefined
  isRoute: boolean
  extra: Readonly<Record<string, unknown>>
  backgroundClose: boolean
  escClose: boolean | undefined
  draggable: boolean | string
  timeout: number | false
}

interface Slot<T> {
  readonly fn: T
}

let nextId = 1

export function closeEvent(partial: Partial<ModalCloseEvent> = {}): ModalCloseEvent {
  return { background: partial.background === true, esc: partial.esc === true, route: partial.route === true }
}

function assertFunction(value: unknown, what: string): void {
  if (typeof value !== 'function') throw new TypeError(`${what} must be a function, got ${typeof value}`)
}

function removeOnce<T>(list: Slot<T>[], slot: Slot<T>): boolean {
  const index = list.indexOf(slot)
  if (index === -1) return false
  list.splice(index, 1)
  return true
}

export class Handle<C = unknown, R = unknown> implements ModalHandle<C, R> {
  readonly id: ModalId = nextId++
  readonly namespace: Namespace
  readonly component: C
  readonly props: unknown
  readonly name: string | undefined
  readonly isRoute: boolean
  readonly extra: Readonly<Record<string, unknown>>
  readonly result: Promise<R | null>
  readonly timeout: number | false
  instance: unknown = undefined

  #host: HandleHost
  #backgroundClose: boolean
  #escClose: boolean | undefined
  #draggable: boolean | string
  #status: ModalStatus = 'open'
  #closing: Promise<boolean> | undefined
  #pending: { value: R } | undefined
  #settle!: (value: R | null) => void
  #revision = 0
  #timer: ReturnType<typeof setTimeout> | undefined
  #finished = false
  #guards: Slot<CloseGuard>[] = []
  #closedListeners: Slot<ClosedListener>[] = []
  #events = new Map<string, Slot<ModalEventListener>[]>()

  constructor(host: HandleHost, init: HandleInit<C>) {
    this.#host = host
    this.namespace = init.namespace
    this.component = init.component
    this.props = init.props
    this.name = init.name
    this.isRoute = init.isRoute
    this.extra = init.extra
    this.#backgroundClose = init.backgroundClose
    this.#escClose = init.escClose
    this.#draggable = init.draggable
    this.timeout = init.timeout
    this.result = new Promise<R | null>(resolve => {
      this.#settle = resolve
    })
  }

  get status(): ModalStatus {
    return this.#status
  }

  get closed(): boolean {
    return this.#status === 'closed'
  }

  get revision(): number {
    return this.#revision
  }

  get backgroundClose(): boolean {
    return this.#backgroundClose
  }

  set backgroundClose(value: boolean) {
    if (value === this.#backgroundClose) return
    this.#backgroundClose = value
    this.#changed()
  }

  get escClose(): boolean {
    return this.#escClose ?? this.#host.escClose(this.namespace)
  }

  set escClose(value: boolean) {
    if (value === this.#escClose) return
    this.#escClose = value
    this.#changed()
  }

  get draggable(): boolean | string {
    return this.#draggable
  }

  set draggable(value: boolean | string) {
    if (value === this.#draggable) return
    this.#draggable = value
    this.#changed()
  }

  close(partial?: Partial<ModalCloseEvent>): Promise<boolean> {
    if (this.#status === 'closed') return Promise.resolve(false)
    if (this.#closing) return this.#closing
    const event = closeEvent(partial)
    const guards = this.#guards.map(slot => slot.fn)
    let settle!: { resolve: (closed: boolean) => void; reject: (error: unknown) => void }
    const closing = new Promise<boolean>((resolve, reject) => {
      settle = { resolve, reject }
    })
    this.#status = 'closing'
    this.#closing = closing
    this.#runGuards(guards, event).then(
      allowed => {
        this.#closing = undefined
        if (this.#status === 'closed') {
          settle.resolve(true)
          return
        }
        if (!allowed) {
          this.#status = 'open'
          this.#pending = undefined
          settle.resolve(false)
          return
        }
        this.#host.finalize(this, event)
        settle.resolve(true)
      },
      (error: unknown) => {
        this.#closing = undefined
        if (this.#status === 'closing') {
          this.#status = 'open'
          this.#pending = undefined
        }
        settle.reject(error)
      },
    )
    return closing
  }

  resolve(value: R): Promise<boolean> {
    if (this.#status === 'closed') return Promise.resolve(false)
    if (!this.#pending) this.#pending = { value }
    return this.close()
  }

  onBeforeClose(guard: CloseGuard): () => void {
    assertFunction(guard, 'Close guard')
    if (this.closed) return () => {}
    const slot = { fn: guard }
    this.#guards.push(slot)
    return () => {
      removeOnce(this.#guards, slot)
    }
  }

  onClosed(listener: ClosedListener): () => void {
    assertFunction(listener, 'Closed listener')
    if (this.closed) return () => {}
    const slot = { fn: listener }
    this.#closedListeners.push(slot)
    return () => {
      removeOnce(this.#closedListeners, slot)
    }
  }

  on(event: string, listener: ModalEventListener): () => void {
    assertFunction(listener, 'Event listener')
    if (this.closed) return () => {}
    const slot = { fn: listener }
    const list = this.#events.get(event) ?? []
    list.push(slot)
    this.#events.set(event, list)
    this.#changed()
    return () => {
      const current = this.#events.get(event)
      if (!current || !removeOnce(current, slot)) return
      if (current.length === 0) this.#events.delete(event)
      this.#changed()
    }
  }

  emit(event: string, ...args: unknown[]): void {
    if (this.closed) return
    for (const slot of (this.#events.get(event) ?? []).slice()) {
      try {
        Reflect.apply(slot.fn, undefined, args)
      } catch (error) {
        report(error)
      }
    }
  }

  eventNames(): readonly string[] {
    return [...this.#events.keys()]
  }

  startTimer(): void {
    if (this.timeout === false || this.#timer !== undefined || this.closed) return
    this.#timer = setTimeout(() => {
      this.close().catch(report)
    }, this.timeout)
  }

  seal(): void {
    this.#status = 'closed'
    if (this.#timer !== undefined) clearTimeout(this.#timer)
    this.#timer = undefined
  }

  complete(event: ModalCloseEvent, notify: boolean): void {
    if (this.#finished) return
    this.#finished = true
    this.seal()
    const listeners = notify ? this.#closedListeners.map(slot => slot.fn) : []
    const pending = this.#pending
    this.#guards = []
    this.#closedListeners = []
    this.#events.clear()
    this.#pending = undefined
    for (const listener of listeners) {
      try {
        listener(event)
      } catch (error) {
        report(error)
      }
    }
    this.#settle(pending ? pending.value : null)
  }

  async #runGuards(guards: CloseGuard[], event: ModalCloseEvent): Promise<boolean> {
    for (const guard of guards) {
      if (this.closed) return true
      const verdict = await guard.call(this.instance, event)
      if (this.closed) return true
      if (verdict === false) return false
    }
    return true
  }

  #changed(): void {
    this.#revision++
    this.#host.touch(this)
  }
}
