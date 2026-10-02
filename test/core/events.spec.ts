import { createModal } from '../../src'
import { A } from '../helpers'

describe('handle events', () => {
  it('calls listeners with emitted arguments', async () => {
    const m = createModal()
    const h = await m.push(A)
    const listener = vi.fn()
    h.on('save', listener)
    h.emit('save', 1, 'two')
    expect(listener).toHaveBeenCalledWith(1, 'two')
  })

  it('supports several listeners per event in order', async () => {
    const m = createModal()
    const h = await m.push(A)
    const order: number[] = []
    h.on('x', () => void order.push(1))
    h.on('x', () => void order.push(2))
    h.emit('x')
    expect(order).toEqual([1, 2])
  })

  it('unsubscribes with the returned function', async () => {
    const m = createModal()
    const h = await m.push(A)
    const listener = vi.fn()
    const off = h.on('x', listener)
    off()
    off()
    h.emit('x')
    expect(listener).not.toHaveBeenCalled()
  })

  it('lists events that have listeners', async () => {
    const m = createModal()
    const h = await m.push(A)
    const off = h.on('a', () => {})
    h.on('b', () => {})
    expect([...h.eventNames()].sort()).toEqual(['a', 'b'])
    off()
    expect(h.eventNames()).toEqual(['b'])
  })

  it('ignores emits without listeners', async () => {
    const m = createModal()
    const h = await m.push(A)
    expect(() => h.emit('nothing')).not.toThrow()
  })

  it('bumps revision and notifies subscribers when listeners change', async () => {
    const m = createModal()
    const h = await m.push(A)
    const listener = vi.fn()
    m.subscribe(listener)
    const r0 = h.revision
    const off = h.on('x', () => {})
    expect(h.revision).toBeGreaterThan(r0)
    expect(listener).toHaveBeenCalledTimes(1)
    off()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('rebuilds the namespace snapshot when listeners change', async () => {
    const m = createModal()
    const h = await m.push(A)
    const before = m.getSnapshot()
    h.on('x', () => {})
    expect(m.getSnapshot()).not.toBe(before)
    expect(m.getSnapshot().items).toEqual([h])
  })

  it('throws when the listener is not a function', async () => {
    const m = createModal()
    const h = await m.push(A)
    expect(() => h.on('x', 1 as never)).toThrow(TypeError)
  })

  it('reports a throwing listener and keeps calling the rest', async () => {
    const reported = vi.fn()
    const original = globalThis.reportError
    globalThis.reportError = reported
    try {
      const m = createModal()
      const h = await m.push(A)
      const second = vi.fn()
      h.on('x', () => {
        throw new Error('listener')
      })
      h.on('x', second)
      h.emit('x')
      expect(second).toHaveBeenCalled()
      expect(reported).toHaveBeenCalledOnce()
    } finally {
      globalThis.reportError = original
    }
  })

  it('ignores listeners added after close', async () => {
    const m = createModal()
    const h = await m.push(A)
    await h.close()
    const listener = vi.fn()
    h.on('x', listener)
    h.emit('x')
    expect(listener).not.toHaveBeenCalled()
    expect(h.eventNames()).toEqual([])
  })
})
