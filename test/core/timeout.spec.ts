import { createModal } from '../../src'
import { A, B } from '../helpers'

describe('auto-close timeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not close by default', async () => {
    const m = createModal()
    const h = await m.push(A)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(h.closed).toBe(false)
  })

  it('closes after the per-open timeout', async () => {
    const m = createModal()
    const h = await m.push(A, {}, { timeout: 3000 })
    await vi.advanceTimersByTimeAsync(2999)
    expect(h.closed).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    expect(h.closed).toBe(true)
  })

  it('uses the namespace timeout and lets per-open options override or disable it', async () => {
    const m = createModal({ namespaces: { toast: { timeout: 1000 } } })
    const a = await m.push(A, {}, { namespace: 'toast' })
    const b = await m.push(B, {}, { namespace: 'toast', timeout: 5000 })
    const c = await m.push(B, {}, { namespace: 'toast', timeout: false })
    const main = await m.push(A)
    await vi.advanceTimersByTimeAsync(1000)
    expect(a.closed).toBe(true)
    expect(b.closed).toBe(false)
    await vi.advanceTimersByTimeAsync(4000)
    expect(b.closed).toBe(true)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(c.closed).toBe(false)
    expect(main.closed).toBe(false)
  })

  it('exposes the effective timeout on the handle', async () => {
    const m = createModal({ namespaces: { toast: { timeout: 1000 } } })
    expect((await m.push(A, {}, { namespace: 'toast' })).timeout).toBe(1000)
    expect((await m.push(A)).timeout).toBe(false)
    expect(m.options('toast').timeout).toBe(1000)
    expect(m.options().timeout).toBe(false)
  })

  it('treats zero and negative timeouts as disabled', async () => {
    const m = createModal()
    const zero = await m.push(A, {}, { timeout: 0 })
    const negative = await m.push(A, {}, { timeout: -5 })
    await vi.advanceTimersByTimeAsync(10_000)
    expect(zero.closed).toBe(false)
    expect(negative.closed).toBe(false)
  })

  it('cancels the timer when the modal closes earlier', async () => {
    const m = createModal()
    const h = await m.push(A, {}, { timeout: 1000 })
    const guard = vi.fn()
    h.onBeforeClose(guard)
    await h.close()
    await vi.advanceTimersByTimeAsync(5000)
    expect(guard).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps the modal when a guard vetoes the timed close and does not retry', async () => {
    const m = createModal()
    const h = await m.push(A, {}, { timeout: 1000 })
    const guard = vi.fn(() => false)
    h.onBeforeClose(guard)
    await vi.advanceTimersByTimeAsync(1000)
    expect(h.closed).toBe(false)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(guard).toHaveBeenCalledOnce()
  })

  it('clears timers on reset and dispose', async () => {
    const m = createModal()
    await m.push(A, {}, { timeout: 1000 })
    m.reset()
    expect(vi.getTimerCount()).toBe(0)
    await m.push(A, {}, { timeout: 1000 })
    m.dispose()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('resolves a prompt with null when it times out', async () => {
    const m = createModal()
    const result = m.prompt(A, {}, { timeout: 500 })
    await vi.advanceTimersByTimeAsync(500)
    expect(await result).toBeNull()
  })
})
