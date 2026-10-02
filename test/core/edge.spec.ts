import { createModal, isModalError, ModalError } from '../../src'
import { A, B, deferred, flush, settle } from '../helpers'

describe('ModalError', () => {
  it('carries code, details and name', () => {
    const error = new ModalError('not-found', 'gone', { id: 1 })
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('ModalError')
    expect(error.code).toBe('not-found')
    expect(error.details).toEqual({ id: 1 })
  })

  it('isModalError checks type and optional code', () => {
    const error = new ModalError('disposed', 'x')
    expect(isModalError(error)).toBe(true)
    expect(isModalError(error, 'disposed')).toBe(true)
    expect(isModalError(error, 'not-found')).toBe(false)
    expect(isModalError(new Error('x'))).toBe(false)
    expect(isModalError(null)).toBe(false)
  })
})

describe('error reporting fallback', () => {
  it('falls back to console.error without reportError', async () => {
    const original = globalThis.reportError
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    ;(globalThis as { reportError?: unknown }).reportError = undefined
    try {
      const m = createModal()
      m.subscribe(() => {
        throw new Error('listener')
      })
      await m.push(A)
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ message: 'listener' }))
    } finally {
      globalThis.reportError = original
      spy.mockRestore()
    }
  })
})

describe('closed handles', () => {
  it('resolves resolve with false', async () => {
    const m = createModal()
    const h = await m.push(A)
    await h.close()
    await expect(h.resolve(1 as never)).resolves.toBe(false)
  })

  it('ignores guards and closed listeners added after close', async () => {
    const m = createModal()
    const h = await m.push(A)
    await h.close()
    const off1 = h.onBeforeClose(() => false)
    const off2 = h.onClosed(() => {})
    expect(() => {
      off1()
      off2()
    }).not.toThrow()
  })

  it('throws when the closed listener is not a function', async () => {
    const m = createModal()
    const h = await m.push(A)
    expect(() => h.onClosed(null as never)).toThrow(TypeError)
  })

  it('ignores emits after close', async () => {
    const m = createModal()
    const h = await m.push(A)
    const listener = vi.fn()
    h.on('x', listener)
    await h.close()
    h.emit('x')
    expect(listener).not.toHaveBeenCalled()
  })

  it('does not notify when a listener is removed after close', async () => {
    const m = createModal()
    const h = await m.push(A)
    const off = h.on('x', () => {})
    await h.close()
    const listener = vi.fn()
    m.subscribe(listener)
    off()
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('guards and lifecycle interleaving', () => {
  it('does not run a guard added while closing is in progress', async () => {
    const m = createModal()
    const h = await m.push(A)
    const gate = deferred<void>()
    h.onBeforeClose(() => gate.promise)
    const closing = h.close()
    const late = vi.fn(() => false)
    h.onBeforeClose(late)
    gate.resolve()
    await closing
    expect(late).not.toHaveBeenCalled()
    expect(h.closed).toBe(true)
  })

  it('resolves the close when reset happens before a late veto', async () => {
    const m = createModal()
    const h = await m.push(A)
    const gate = deferred<boolean>()
    h.onBeforeClose(() => gate.promise)
    const closing = settle(h.close())
    m.reset()
    gate.resolve(false)
    await flush()
    expect(closing.state).toBe('fulfilled')
    expect(h.status).toBe('closed')
  })

  it('stays closed when a guard throws after reset', async () => {
    const m = createModal()
    const h = await m.push(A)
    const gate = deferred<void>()
    h.onBeforeClose(async () => {
      await gate.promise
      throw new Error('late')
    })
    const closing = settle(h.close())
    m.reset()
    gate.resolve()
    await flush()
    expect(closing.state).toBe('rejected')
    expect(h.status).toBe('closed')
  })

  it('does not double-complete when reset runs inside a guard', async () => {
    const m = createModal()
    const h = await m.push(A)
    const closed = vi.fn()
    h.onClosed(closed)
    h.onBeforeClose(() => {
      m.reset()
    })
    await h.close()
    expect(closed).not.toHaveBeenCalled()
    expect(h.closed).toBe(true)
  })

  it('rejects a push whose beforeOpen hook outlives dispose', async () => {
    const gate = deferred<void>()
    const m = createModal({ defaults: { beforeOpen: () => gate.promise } })
    const pushing = m.push(A)
    m.dispose()
    gate.resolve()
    await expect(pushing).rejects.toMatchObject({ code: 'disposed' })
    expect(m.getSnapshot().items).toEqual([])
  })

  it('lets open reject when beforeOpen of the new modal refuses after clearing', async () => {
    const m = createModal()
    const a = await m.push(A)
    await expect(m.open(B, {}, { beforeOpen: () => false })).rejects.toMatchObject({ code: 'before-open-rejected' })
    expect(a.closed).toBe(true)
    expect(m.getSnapshot().items).toEqual([])
  })
})

describe('configuration edge cases', () => {
  it('keeps a namespace beforeOpen when later config omits it', async () => {
    const m = createModal()
    m.configureNamespace('side', { beforeOpen: () => false })
    m.configureNamespace('side', { escClose: false })
    await expect(m.push(A, {}, { namespace: 'side' })).rejects.toMatchObject({ code: 'before-open-rejected' })
  })

  it('clears a namespace beforeOpen when set to undefined explicitly', async () => {
    const m = createModal()
    m.configureNamespace('side', { beforeOpen: () => false })
    m.configureNamespace('side', { beforeOpen: undefined })
    await expect(m.push(A, {}, { namespace: 'side' })).resolves.toBeTruthy()
  })

  it('keeps the global beforeOpen when configure omits it', async () => {
    const m = createModal({ defaults: { beforeOpen: () => false } })
    m.configure({ escClose: false })
    await expect(m.push(A)).rejects.toMatchObject({ code: 'before-open-rejected' })
  })

  it('normalizes the empty namespace key in config', () => {
    const m = createModal({ namespaces: { '': { escClose: false } } })
    expect(m.options().escClose).toBe(false)
  })

  it('copies registry entries so later mutation does not leak in', async () => {
    const entry = { component: A, backgroundClose: false }
    const m = createModal({ registry: { a: entry } })
    entry.backgroundClose = true
    expect((await m.push('a')).backgroundClose).toBe(false)
  })

  it('accepts a registry entry whose component is a function', async () => {
    const fn = () => null
    const m = createModal<typeof fn>({ registry: { f: fn } })
    expect((await m.push('f')).component).toBe(fn)
  })

  it('ignores a guardFrom result that is not a function', async () => {
    const m = createModal<{ beforeModalClose?: unknown }>({ guardFrom: c => c.beforeModalClose as never })
    const h = await m.push({ beforeModalClose: 'nope' })
    await h.close()
    expect(h.closed).toBe(true)
  })
})
