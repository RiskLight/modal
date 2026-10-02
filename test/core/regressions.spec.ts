import { createModal } from '../../src'
import { A, B, C, deferred, flush } from '../helpers'

describe('regression: double close with an async guard', () => {
  it('returns the same promise for concurrent closes', async () => {
    const m = createModal()
    const h = await m.push(A)
    const gate = deferred<void>()
    h.onBeforeClose(() => gate.promise)
    const first = h.close()
    const second = h.close({ esc: true })
    expect(second).toBe(first)
    gate.resolve()
    await Promise.all([first, second])
  })

  it('does not remove the modal underneath on a double close', async () => {
    const m = createModal()
    const a = await m.push(A)
    const b = await m.push(B)
    const gate = deferred<void>()
    b.onBeforeClose(() => gate.promise)
    const first = m.closeById(b.id, { esc: true })
    const second = m.closeById(b.id, { esc: true })
    gate.resolve()
    await Promise.all([first, second])
    expect(m.getSnapshot().items).toEqual([a])
    expect(a.closed).toBe(false)
  })

  it('removes by reference when a lower modal closes while a guard is pending', async () => {
    const m = createModal()
    const a = await m.push(A)
    const b = await m.push(B)
    const c = await m.push(C)
    const gate = deferred<void>()
    c.onBeforeClose(() => gate.promise)
    const closingC = c.close()
    await a.close()
    gate.resolve()
    await closingC
    expect(m.getSnapshot().items).toEqual([b])
  })

  it('runs guards once for concurrent closes', async () => {
    const m = createModal()
    const h = await m.push(A)
    const guard = vi.fn(() => flush())
    h.onBeforeClose(guard)
    await Promise.all([h.close(), h.close(), m.closeById(h.id)])
    expect(guard).toHaveBeenCalledOnce()
  })

  it('allows a fresh close after a vetoed concurrent close', async () => {
    const m = createModal()
    const h = await m.push(A)
    let allow = false
    h.onBeforeClose(async () => allow)
    await Promise.allSettled([h.close(), h.close()])
    expect(h.closed).toBe(false)
    allow = true
    await h.close()
    expect(h.closed).toBe(true)
  })
})

describe('regression: closed modals leak', () => {
  it('forgets handles after close', async () => {
    const m = createModal()
    const h = await m.push(A)
    await h.close()
    expect(m.get(h.id)).toBeUndefined()
  })

  it('drops guards and listeners after close', async () => {
    const m = createModal()
    const h = await m.push(A)
    h.on('x', () => {})
    h.onBeforeClose(() => {})
    await h.close()
    expect(h.eventNames()).toEqual([])
  })

  it('forgets handles of a disposed manager', async () => {
    const m = createModal()
    const h = await m.push(A)
    m.dispose()
    expect(m.get(h.id)).toBeUndefined()
    expect(h.closed).toBe(true)
  })
})
