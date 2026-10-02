import { createModal, PROMPT_EVENT } from '../../src'
import { A, deferred, flush, settle } from '../helpers'

describe('prompt', () => {
  it('pushes the modal without closing others', async () => {
    const m = createModal()
    const a = await m.push(A)
    void m.prompt(A)
    await flush()
    expect(a.closed).toBe(false)
    expect(m.getSnapshot().items).toHaveLength(2)
  })

  it('resolves with the value passed to handle.resolve and closes', async () => {
    const m = createModal()
    const result = m.prompt<number>(A)
    await flush()
    const h = m.current()!
    await h.resolve(42 as never)
    expect(await result).toBe(42)
    expect(h.closed).toBe(true)
  })

  it('treats PROMPT_EVENT as a plain event in the core, adapters map it to resolve', async () => {
    const m = createModal()
    const result = settle(m.prompt<string>(A))
    await flush()
    const handle = m.current()!
    const listener = vi.fn()
    handle.on(PROMPT_EVENT, listener)
    handle.emit(PROMPT_EVENT, 'yes')
    await flush()
    expect(listener).toHaveBeenCalledWith('yes')
    expect(result.state).toBe('pending')
  })

  it('resolves null when closed without a value', async () => {
    const m = createModal()
    const result = m.prompt(A)
    await flush()
    await m.closeAll()
    expect(await result).toBeNull()
  })

  it('stays pending when a guard vetoes the resolve', async () => {
    const m = createModal()
    const result = settle(m.prompt<number>(A))
    await flush()
    const h = m.current()!
    let allow = false
    h.onBeforeClose(() => allow)
    await expect(h.resolve(1 as never)).resolves.toBe(false)
    await flush()
    expect(result.state).toBe('pending')
    allow = true
    await h.resolve(2 as never)
    await flush()
    expect(result.value).toBe(2)
  })

  it('resolves null when a vetoed resolve is followed by a plain close', async () => {
    const m = createModal()
    const result = m.prompt<number>(A)
    await flush()
    const h = m.current()!
    let allow = false
    h.onBeforeClose(() => allow)
    await h.resolve(1 as never).catch(() => {})
    allow = true
    await h.close()
    expect(await result).toBeNull()
  })

  it('rejects when the modal cannot be opened', async () => {
    const m = createModal({ defaults: { beforeOpen: () => false } })
    await expect(m.prompt(A)).rejects.toMatchObject({ code: 'before-open-rejected' })
  })

  it('resolves null on reset', async () => {
    const m = createModal()
    const result = m.prompt(A)
    await flush()
    m.reset()
    expect(await result).toBeNull()
  })

  it('keeps the first value when resolve is called twice during a slow guard', async () => {
    const m = createModal()
    const result = m.prompt<number>(A)
    await flush()
    const h = m.current()!
    const gate = deferred<void>()
    h.onBeforeClose(() => gate.promise)
    const first = h.resolve(1 as never)
    const second = h.resolve(2 as never)
    gate.resolve()
    await Promise.all([first, second])
    expect(await result).toBe(1)
  })
})

describe('handle.result', () => {
  it('resolves with null after a plain close', async () => {
    const m = createModal()
    const h = await m.push(A)
    await h.close()
    expect(await h.result).toBeNull()
  })

  it('resolves with the resolved value', async () => {
    const m = createModal()
    const h = await m.push<string>(A)
    await h.resolve('ok')
    expect(await h.result).toBe('ok')
  })

  it('is pending while the modal is open', async () => {
    const m = createModal()
    const h = await m.push(A)
    const state = settle(h.result)
    await flush()
    expect(state.state).toBe('pending')
  })
})
