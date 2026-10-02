import { createModal, ModalError } from '../../src'
import { A, B, C, deferred, flush, settle } from '../helpers'

describe('handle.close', () => {
  it('removes the modal and marks it closed', async () => {
    const m = createModal()
    const h = await m.push(A)
    await h.close()
    expect(h.closed).toBe(true)
    expect(h.status).toBe('closed')
    expect(m.getSnapshot().items).toEqual([])
  })

  it('rejects with not-found when closing an already closed modal', async () => {
    const m = createModal()
    const h = await m.push(A)
    await h.close()
    await expect(h.close()).rejects.toMatchObject({ code: 'not-found' })
  })

  it('removes the right modal from the middle of the stack', async () => {
    const m = createModal()
    const a = await m.push(A)
    const b = await m.push(B)
    const c = await m.push(C)
    await b.close()
    expect(m.getSnapshot().items).toEqual([a, c])
  })
})

describe('close guards', () => {
  it('runs a guard with a default close event', async () => {
    const m = createModal()
    const h = await m.push(A)
    const guard = vi.fn()
    h.onBeforeClose(guard)
    await h.close()
    expect(guard).toHaveBeenCalledWith({ background: false, esc: false, route: false })
  })

  it('merges a partial close event', async () => {
    const m = createModal()
    const h = await m.push(A)
    const guard = vi.fn()
    h.onBeforeClose(guard)
    await h.close({ esc: true })
    expect(guard).toHaveBeenCalledWith({ background: false, esc: true, route: false })
  })

  it('binds this to the handle instance', async () => {
    const m = createModal()
    const h = await m.push(A)
    const instance = { title: 't' }
    h.instance = instance
    let seen: unknown
    h.onBeforeClose(function (this: unknown) {
      seen = this
    })
    await h.close()
    expect(seen).toBe(instance)
  })

  it.each([undefined, true])('closes when a guard returns %s', async value => {
    const m = createModal()
    const h = await m.push(A)
    h.onBeforeClose(() => value)
    await h.close()
    expect(h.closed).toBe(true)
  })

  it('vetoes when a guard returns false', async () => {
    const m = createModal()
    const h = await m.push(A)
    h.onBeforeClose(() => false)
    const error = await h.close().catch(e => e)
    expect(error).toBeInstanceOf(ModalError)
    expect(error.code).toBe('guard-rejected')
    expect(h.status).toBe('open')
    expect(m.getSnapshot().items).toEqual([h])
  })

  it('vetoes when an async guard resolves false', async () => {
    const m = createModal()
    const h = await m.push(A)
    h.onBeforeClose(async () => false)
    await expect(h.close()).rejects.toMatchObject({ code: 'guard-rejected' })
    expect(h.closed).toBe(false)
  })

  it('closes when an async guard resolves true', async () => {
    const m = createModal()
    const h = await m.push(A)
    h.onBeforeClose(async () => true)
    await h.close()
    expect(h.closed).toBe(true)
  })

  it('propagates an error thrown by a guard and keeps the modal open', async () => {
    const m = createModal()
    const h = await m.push(A)
    const boom = new Error('boom')
    h.onBeforeClose(() => {
      throw boom
    })
    await expect(h.close()).rejects.toBe(boom)
    expect(h.status).toBe('open')
  })

  it('propagates a rejected async guard', async () => {
    const m = createModal()
    const h = await m.push(A)
    const boom = new Error('boom')
    h.onBeforeClose(() => Promise.reject(boom))
    await expect(h.close()).rejects.toBe(boom)
    expect(h.closed).toBe(false)
  })

  it('runs all guards in registration order', async () => {
    const m = createModal()
    const h = await m.push(A)
    const order: number[] = []
    h.onBeforeClose(async () => {
      await flush()
      order.push(1)
    })
    h.onBeforeClose(() => {
      order.push(2)
    })
    h.onBeforeClose(() => {
      order.push(3)
    })
    await h.close()
    expect(order).toEqual([1, 2, 3])
  })

  it('stops at the first vetoing guard', async () => {
    const m = createModal()
    const h = await m.push(A)
    const later = vi.fn()
    h.onBeforeClose(() => false)
    h.onBeforeClose(later)
    await h.close().catch(() => {})
    expect(later).not.toHaveBeenCalled()
  })

  it('allows the same guard function to be added several times', async () => {
    const m = createModal()
    const h = await m.push(A)
    const guard = vi.fn()
    h.onBeforeClose(guard)
    h.onBeforeClose(guard)
    h.onBeforeClose(guard)
    await h.close()
    expect(guard).toHaveBeenCalledTimes(3)
  })

  it('removes a guard with the returned disposer', async () => {
    const m = createModal()
    const h = await m.push(A)
    const remove = h.onBeforeClose(() => false)
    remove()
    remove()
    await h.close()
    expect(h.closed).toBe(true)
  })

  it('can be retried after a veto', async () => {
    const m = createModal()
    const h = await m.push(A)
    let attempts = 3
    h.onBeforeClose(() => --attempts <= 0)
    await h.close().catch(() => {})
    await h.close().catch(() => {})
    expect(h.closed).toBe(false)
    await h.close()
    expect(h.closed).toBe(true)
  })

  it('reports status closing while guards run', async () => {
    const m = createModal()
    const h = await m.push(A)
    const gate = deferred<void>()
    h.onBeforeClose(() => gate.promise)
    const closing = h.close()
    expect(h.status).toBe('closing')
    expect(h.closed).toBe(false)
    gate.resolve()
    await closing
    expect(h.status).toBe('closed')
  })

  it('throws when the guard is not a function', async () => {
    const m = createModal()
    const h = await m.push(A)
    expect(() => h.onBeforeClose('nope' as never)).toThrow(TypeError)
  })

  it('uses guardFrom to read a guard from the component', async () => {
    const guard = vi.fn(() => false)
    const component = { beforeModalClose: guard }
    const m = createModal<typeof component>({ guardFrom: c => c.beforeModalClose })
    const h = await m.push(component)
    await expect(h.close()).rejects.toMatchObject({ code: 'guard-rejected' })
    expect(guard).toHaveBeenCalledOnce()
  })

  it('runs the guardFrom guard before guards added later', async () => {
    const order: string[] = []
    const component = { beforeModalClose: () => void order.push('component') }
    const m = createModal<typeof component>({ guardFrom: c => c.beforeModalClose })
    const h = await m.push(component)
    h.onBeforeClose(() => void order.push('handle'))
    await h.close()
    expect(order).toEqual(['component', 'handle'])
  })
})

describe('onClosed', () => {
  it('fires once after removal with the close event', async () => {
    const m = createModal()
    const h = await m.push(A)
    const listener = vi.fn(() => {
      expect(m.getSnapshot().items).toEqual([])
      expect(h.closed).toBe(true)
    })
    h.onClosed(listener)
    await h.close({ background: true })
    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith({ background: true, esc: false, route: false })
  })

  it('does not fire when closing is vetoed', async () => {
    const m = createModal()
    const h = await m.push(A)
    const listener = vi.fn()
    h.onClosed(listener)
    h.onBeforeClose(() => false)
    await h.close().catch(() => {})
    expect(listener).not.toHaveBeenCalled()
  })

  it('can be removed', async () => {
    const m = createModal()
    const h = await m.push(A)
    const listener = vi.fn()
    h.onClosed(listener)()
    await h.close()
    expect(listener).not.toHaveBeenCalled()
  })

  it('reports a throwing listener without breaking the close', async () => {
    const reported = vi.fn()
    const original = globalThis.reportError
    globalThis.reportError = reported
    try {
      const m = createModal()
      const h = await m.push(A)
      const second = vi.fn()
      h.onClosed(() => {
        throw new Error('listener')
      })
      h.onClosed(second)
      await h.close()
      expect(h.closed).toBe(true)
      expect(second).toHaveBeenCalled()
      expect(reported).toHaveBeenCalledWith(expect.objectContaining({ message: 'listener' }))
    } finally {
      globalThis.reportError = original
    }
  })
})

describe('manager close helpers', () => {
  it('closeById closes the matching modal with the event', async () => {
    const m = createModal()
    const h = await m.push(A)
    const guard = vi.fn()
    h.onBeforeClose(guard)
    await m.closeById(h.id, { esc: true })
    expect(h.closed).toBe(true)
    expect(guard).toHaveBeenCalledWith({ background: false, esc: true, route: false })
  })

  it('closeById rejects with not-found for unknown ids', async () => {
    const m = createModal()
    await expect(m.closeById(42)).rejects.toMatchObject({ code: 'not-found' })
  })

  it('closeById finds modals in any namespace', async () => {
    const m = createModal()
    const h = await m.push(A, {}, { namespace: 'side' })
    await m.closeById(h.id)
    expect(m.getSnapshot('side').items).toEqual([])
  })

  it('pop closes only the top modal', async () => {
    const m = createModal()
    const a = await m.push(A)
    const b = await m.push(B)
    await m.pop()
    expect(b.closed).toBe(true)
    expect(a.closed).toBe(false)
  })

  it('pop resolves when the namespace is empty', async () => {
    const m = createModal()
    await expect(m.pop()).resolves.toBeUndefined()
  })

  it('pop respects the namespace', async () => {
    const m = createModal()
    const a = await m.push(A)
    const s = await m.push(B, {}, { namespace: 'side' })
    await m.pop({ namespace: 'side' })
    expect(s.closed).toBe(true)
    expect(a.closed).toBe(false)
  })

  it('pop rejects when the top guard vetoes', async () => {
    const m = createModal()
    const h = await m.push(A)
    h.onBeforeClose(() => false)
    await expect(m.pop()).rejects.toMatchObject({ code: 'guard-rejected' })
  })

  it('closeAll closes top-down and empties the namespace', async () => {
    const m = createModal()
    const order: string[] = []
    const a = await m.push(A)
    const b = await m.push(B)
    a.onClosed(() => void order.push('a'))
    b.onClosed(() => void order.push('b'))
    await m.closeAll()
    expect(order).toEqual(['b', 'a'])
    expect(m.getSnapshot().items).toEqual([])
  })

  it('closeAll stops at a veto and keeps modals below', async () => {
    const m = createModal()
    const a = await m.push(A)
    const b = await m.push(B)
    const c = await m.push(C)
    b.onBeforeClose(() => false)
    await expect(m.closeAll()).rejects.toMatchObject({ code: 'guard-rejected' })
    expect(c.closed).toBe(true)
    expect(m.getSnapshot().items).toEqual([a, b])
  })

  it('closeAll only touches the given namespace', async () => {
    const m = createModal()
    const a = await m.push(A)
    await m.push(B, {}, { namespace: 'side' })
    await m.closeAll({ namespace: 'side' })
    expect(m.getSnapshot('side').items).toEqual([])
    expect(a.closed).toBe(false)
  })

  it('closeAll on an empty namespace resolves', async () => {
    const m = createModal()
    await expect(m.closeAll()).resolves.toBeUndefined()
  })

  it('closeAll skips modals that were closed by someone else meanwhile', async () => {
    const m = createModal()
    const a = await m.push(A)
    const b = await m.push(B)
    b.onBeforeClose(async () => {
      await a.close()
    })
    await m.closeAll()
    expect(m.getSnapshot().items).toEqual([])
  })

  it('reset drops every modal without running guards and resolves pending results with null', async () => {
    const m = createModal()
    const a = await m.push(A)
    const b = await m.push(B, {}, { namespace: 'side' })
    const guard = vi.fn(() => false)
    const closed = vi.fn()
    a.onBeforeClose(guard)
    a.onClosed(closed)
    const result = settle(a.result)
    m.reset()
    await flush()
    expect(guard).not.toHaveBeenCalled()
    expect(closed).not.toHaveBeenCalled()
    expect(a.closed).toBe(true)
    expect(b.closed).toBe(true)
    expect(m.get(a.id)).toBeUndefined()
    expect(m.getSnapshot().items).toEqual([])
    expect(m.getSnapshot('side').items).toEqual([])
    expect(result.state).toBe('fulfilled')
    expect(result.value).toBeNull()
  })

  it('reset settles a close that is waiting on a guard', async () => {
    const m = createModal()
    const h = await m.push(A)
    const gate = deferred<void>()
    h.onBeforeClose(() => gate.promise)
    const closing = settle(h.close())
    m.reset()
    gate.resolve()
    await flush()
    expect(closing.state).toBe('fulfilled')
    expect(m.getSnapshot().items).toEqual([])
  })
})
