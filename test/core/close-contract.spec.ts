import { createModal } from '../../src'
import { A, B, deferred } from '../helpers'

describe('close returns whether the modal closed', () => {
  it('resolves true when the modal closes', async () => {
    const m = createModal()
    const h = await m.push(A)
    await expect(h.close()).resolves.toBe(true)
  })

  it('resolves the same value for concurrent closes', async () => {
    const m = createModal()
    const h = await m.push(A)
    const gate = deferred<boolean>()
    h.onBeforeClose(() => gate.promise)
    const first = h.close()
    const second = h.close()
    gate.resolve(false)
    await expect(first).resolves.toBe(false)
    await expect(second).resolves.toBe(false)
    expect(h.status).toBe('open')
  })

  it('still rejects when a guard throws', async () => {
    const m = createModal()
    const h = await m.push(A)
    const boom = new Error('boom')
    h.onBeforeClose(() => {
      throw boom
    })
    await expect(h.close()).rejects.toBe(boom)
    await expect(m.pop()).rejects.toBe(boom)
    await expect(m.closeAll()).rejects.toBe(boom)
    await expect(m.closeById(h.id)).rejects.toBe(boom)
  })

  it('resolve returns true when the value was delivered', async () => {
    const m = createModal()
    const h = await m.push<number>(A)
    await expect(h.resolve(1)).resolves.toBe(true)
    expect(await h.result).toBe(1)
  })

  it('pop and closeById resolve true on success', async () => {
    const m = createModal()
    const a = await m.push(A)
    await m.push(B)
    await expect(m.pop()).resolves.toBe(true)
    await expect(m.closeById(a.id)).resolves.toBe(true)
  })

  it('closeAll resolves true when everything closed and false when a veto stopped it', async () => {
    const m = createModal()
    await m.push(A)
    await m.push(B)
    await expect(m.closeAll()).resolves.toBe(true)
    const kept = await m.push(A)
    kept.onBeforeClose(() => false)
    await m.push(B)
    await expect(m.closeAll()).resolves.toBe(false)
    expect(m.getSnapshot().items).toEqual([kept])
  })

  it('open still rejects when a veto keeps the namespace occupied', async () => {
    const m = createModal()
    const h = await m.push(A)
    h.onBeforeClose(() => false)
    await expect(m.open(B)).rejects.toMatchObject({ code: 'guard-rejected' })
  })

  it('never produces an unhandled rejection for a vetoed fire-and-forget close', async () => {
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    try {
      const m = createModal()
      const h = await m.push(A)
      h.onBeforeClose(() => false)
      void h.close()
      void m.pop()
      void m.closeAll()
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(unhandled).not.toHaveBeenCalled()
    } finally {
      process.off('unhandledRejection', unhandled)
    }
  })
})
