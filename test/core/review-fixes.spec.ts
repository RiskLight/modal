import { createModal } from '../../src'
import { A, B, C, deferred, flush } from '../helpers'

describe('guards that close their own modal', () => {
  it('returns the in-flight promise when a guard calls close synchronously', async () => {
    const m = createModal()
    const h = await m.push(A)
    let inner: Promise<boolean> | undefined
    h.onBeforeClose(() => {
      inner = h.close()
    })
    const outer = h.close()
    expect(inner).toBe(outer)
    await outer
    expect(h.closed).toBe(true)
  })

  it('returns the in-flight promise when a guard calls resolve synchronously', async () => {
    const m = createModal()
    const h = await m.push<number>(A)
    h.onBeforeClose(() => {
      void h.resolve(5)
    })
    await h.close()
    expect(await h.result).toBe(5)
  })

  it('does not recurse when a guard calls close after an await without awaiting it', async () => {
    const m = createModal()
    const h = await m.push(A)
    h.onBeforeClose(async () => {
      await flush()
      void h.close()
    })
    await h.close()
    expect(h.closed).toBe(true)
  })
})

describe('concurrent open', () => {
  it('leaves exactly one modal when two opens race through async hooks', async () => {
    const m = createModal({ defaults: { beforeOpen: () => flush() } })
    const [a, b] = await Promise.all([m.open(A), m.open(B)])
    expect(m.getSnapshot().items).toEqual([b])
    expect(a.closed).toBe(true)
  })

  it('keeps the last open when three race', async () => {
    const m = createModal({ defaults: { beforeOpen: () => flush() } })
    const results = await Promise.all([m.open(A), m.open(B), m.open(C)])
    expect(m.getSnapshot().items).toEqual([results[2]])
  })

  it('does not serialize opens of different namespaces', async () => {
    const gate = deferred<void>()
    const m = createModal({ namespaces: { slow: { beforeOpen: () => gate.promise } } })
    const slow = m.open(A, {}, { namespace: 'slow' })
    const fast = await m.open(B)
    expect(fast.closed).toBe(false)
    gate.resolve()
    await slow
  })

  it('keeps serving opens after a rejected open', async () => {
    const m = createModal()
    await expect(m.open(A, {}, { beforeOpen: () => false })).rejects.toMatchObject({ code: 'before-open-rejected' })
    const h = await m.open(B)
    expect(m.getSnapshot().items).toEqual([h])
  })
})

describe('topmost predicate', () => {
  it('passes the top handle so per-modal flags can be considered', async () => {
    const m = createModal({ namespaces: { quiet: { escClose: false } } })
    await m.push(A)
    const loud = await m.push(B, {}, { namespace: 'quiet', escClose: true })
    expect(m.topmost((options, _ns, top) => options.escClose || top.escClose)).toBe(loud)
  })
})

describe('dispose and reset ordering', () => {
  it('rejects pushes issued by listeners while disposing', async () => {
    const m = createModal()
    await m.push(A)
    let attempted: Promise<unknown> | undefined
    m.subscribe(() => {
      attempted ??= m.push(B)
    })
    m.dispose()
    await expect(attempted).rejects.toMatchObject({ code: 'disposed' })
    expect(m.getSnapshot().items).toEqual([])
  })
})

describe('housekeeping', () => {
  it('forgets drained dynamic namespaces', async () => {
    const m = createModal({ namespaces: { configured: {} } })
    const h = await m.push(A, {}, { namespace: 'dynamic' })
    await h.close()
    expect(m.namespaces()).toEqual(['configured'])
  })

  it('returns a copy from lookup', () => {
    const m = createModal({ registry: { a: { component: A, backgroundClose: false } } })
    const entry = m.lookup('a')!
    entry.backgroundClose = true
    expect(m.lookup('a')!.backgroundClose).toBe(false)
  })

  it('notifies subscribers when a host attaches or detaches', () => {
    const m = createModal()
    const listener = vi.fn()
    m.subscribe(listener)
    const detach = m.attachHost('x')
    expect(listener).toHaveBeenCalledTimes(1)
    detach()
    expect(listener).toHaveBeenCalledTimes(2)
  })

  it('notifies and bumps revision when per-modal flags change', async () => {
    const m = createModal()
    const h = await m.push(A)
    const listener = vi.fn()
    m.subscribe(listener)
    const r = h.revision
    h.draggable = true
    h.backgroundClose = false
    h.escClose = false
    expect(listener).toHaveBeenCalledTimes(3)
    expect(h.revision).toBe(r + 3)
    h.draggable = true
    expect(listener).toHaveBeenCalledTimes(3)
  })
})
