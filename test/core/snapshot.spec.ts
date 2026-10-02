import { createModal, DEFAULT_NAMESPACE } from '../../src'
import { A, B } from '../helpers'

describe('snapshots', () => {
  it('returns an empty frozen snapshot for an unused namespace', () => {
    const m = createModal()
    const s = m.getSnapshot('nothing')
    expect(s.namespace).toBe('nothing')
    expect(s.items).toEqual([])
    expect(s.top).toBeUndefined()
    expect(Object.isFrozen(s)).toBe(true)
    expect(Object.isFrozen(s.items)).toBe(true)
  })

  it('defaults to the default namespace', () => {
    const m = createModal()
    expect(m.getSnapshot().namespace).toBe(DEFAULT_NAMESPACE)
  })

  it('returns the same reference until something changes', async () => {
    const m = createModal()
    const first = m.getSnapshot()
    expect(m.getSnapshot()).toBe(first)
    await m.push(A)
    const second = m.getSnapshot()
    expect(second).not.toBe(first)
    expect(m.getSnapshot()).toBe(second)
  })

  it('keeps snapshots of untouched namespaces stable', async () => {
    const m = createModal()
    await m.push(A, {}, { namespace: 'side' })
    const side = m.getSnapshot('side')
    await m.push(B)
    expect(m.getSnapshot('side')).toBe(side)
  })

  it('never mutates a previous snapshot', async () => {
    const m = createModal()
    const a = await m.push(A)
    const before = m.getSnapshot()
    await m.push(B)
    await a.close()
    expect(before.items).toEqual([a])
  })

  it('exposes top as the last item', async () => {
    const m = createModal()
    await m.push(A)
    const b = await m.push(B)
    expect(m.getSnapshot().top).toBe(b)
  })

  it('includes resolved namespace options', () => {
    const m = createModal({ defaults: { singleShow: true }, namespaces: { side: { escClose: false } } })
    expect(m.getSnapshot('side').options).toEqual({
      escClose: false,
      scrollLock: true,
      singleShow: true,
      backgroundClose: true,
      draggable: false,
    })
  })

  it('rebuilds snapshots when options change', () => {
    const m = createModal()
    const before = m.getSnapshot()
    m.configure({ singleShow: true })
    expect(m.getSnapshot()).not.toBe(before)
    expect(m.getSnapshot().options.singleShow).toBe(true)
  })
})

describe('subscribe', () => {
  it('notifies synchronously on push and close', async () => {
    const m = createModal()
    const listener = vi.fn()
    m.subscribe(listener)
    const h = await m.push(A)
    expect(listener).toHaveBeenCalledTimes(1)
    await h.close()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('sees the new snapshot inside the listener', async () => {
    const m = createModal()
    const seen: number[] = []
    m.subscribe(() => void seen.push(m.getSnapshot().items.length))
    const h = await m.push(A)
    await h.close()
    expect(seen).toEqual([1, 0])
  })

  it('stops notifying after unsubscribe', async () => {
    const m = createModal()
    const listener = vi.fn()
    const off = m.subscribe(listener)
    off()
    off()
    await m.push(A)
    expect(listener).not.toHaveBeenCalled()
  })

  it('notifies on configure, configureNamespace and reset', async () => {
    const m = createModal()
    await m.push(A)
    const listener = vi.fn()
    m.subscribe(listener)
    m.configure({ escClose: false })
    m.configureNamespace('side', { singleShow: true })
    m.reset()
    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('does not notify when a close is vetoed', async () => {
    const m = createModal()
    const h = await m.push(A)
    h.onBeforeClose(() => false)
    const listener = vi.fn()
    m.subscribe(listener)
    await h.close().catch(() => {})
    expect(listener).not.toHaveBeenCalled()
  })

  it('keeps notifying other listeners when one throws', async () => {
    const reported = vi.fn()
    const original = globalThis.reportError
    globalThis.reportError = reported
    try {
      const m = createModal()
      const second = vi.fn()
      m.subscribe(() => {
        throw new Error('listener')
      })
      m.subscribe(second)
      await m.push(A)
      expect(second).toHaveBeenCalledOnce()
      expect(reported).toHaveBeenCalledOnce()
    } finally {
      globalThis.reportError = original
    }
  })

  it('tolerates unsubscribing during notification', async () => {
    const m = createModal()
    const second = vi.fn()
    const off = m.subscribe(() => off())
    m.subscribe(second)
    await m.push(A)
    expect(second).toHaveBeenCalledOnce()
  })

  it('bumps the version on every change', async () => {
    const m = createModal()
    const v0 = m.getVersion()
    const h = await m.push(A)
    const v1 = m.getVersion()
    await h.close()
    expect(v1).toBeGreaterThan(v0)
    expect(m.getVersion()).toBeGreaterThan(v1)
  })

  it('drops all listeners on dispose', async () => {
    const m = createModal()
    const listener = vi.fn()
    m.subscribe(listener)
    m.dispose()
    listener.mockClear()
    m.configure({ escClose: false })
    expect(listener).not.toHaveBeenCalled()
  })
})
