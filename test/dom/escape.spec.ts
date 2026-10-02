import { createModal } from '../../src'
import { bindEscape } from '../../src/dom'
import { A, B, deferred, flush } from '../helpers'

function press(init: KeyboardEventInit & { type?: string } = {}, target: EventTarget = document): KeyboardEvent {
  const event = new KeyboardEvent(init.type ?? 'keyup', { key: 'Escape', bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

describe('bindEscape', () => {
  let dispose: (() => void) | undefined
  afterEach(() => {
    dispose?.()
    dispose = undefined
  })

  it('closes the top modal on Escape keyup with esc: true', async () => {
    const m = createModal()
    dispose = bindEscape(m)
    const a = await m.push(A)
    const b = await m.push(B)
    const guard = vi.fn()
    b.onBeforeClose(guard)
    press()
    await flush()
    expect(b.closed).toBe(true)
    expect(a.closed).toBe(false)
    expect(guard).toHaveBeenCalledWith({ background: false, esc: true, route: false })
  })

  it('accepts code Escape when key differs', async () => {
    const m = createModal()
    dispose = bindEscape(m)
    const a = await m.push(A)
    press({ key: 'Unidentified', code: 'Escape' })
    await flush()
    expect(a.closed).toBe(true)
  })

  it('ignores other keys', async () => {
    const m = createModal()
    dispose = bindEscape(m)
    const a = await m.push(A)
    press({ key: 'Enter' })
    await flush()
    expect(a.closed).toBe(false)
  })

  it('ignores keydown by default and listens to it when configured', async () => {
    const m = createModal()
    dispose = bindEscape(m)
    const a = await m.push(A)
    press({ type: 'keydown' })
    await flush()
    expect(a.closed).toBe(false)
    dispose()
    dispose = bindEscape(m, { event: 'keydown' })
    press({ type: 'keydown' })
    await flush()
    expect(a.closed).toBe(true)
  })

  it('closes modals of non-default namespaces', async () => {
    const m = createModal()
    dispose = bindEscape(m)
    const side = await m.push(A, {}, { namespace: 'side' })
    press()
    await flush()
    expect(side.closed).toBe(true)
  })

  it('closes the most recently opened modal across namespaces', async () => {
    const m = createModal()
    dispose = bindEscape(m)
    const a = await m.push(A)
    const side = await m.push(B, {}, { namespace: 'side' })
    press()
    await flush()
    expect(side.closed).toBe(true)
    expect(a.closed).toBe(false)
    press()
    await flush()
    expect(a.closed).toBe(true)
  })

  it('skips namespaces with escClose false', async () => {
    const m = createModal({ namespaces: { toast: { escClose: false } } })
    dispose = bindEscape(m)
    const a = await m.push(A)
    const toast = await m.push(B, {}, { namespace: 'toast' })
    press()
    await flush()
    expect(toast.closed).toBe(false)
    expect(a.closed).toBe(true)
  })

  it('does nothing when the top modal has escClose false', async () => {
    const m = createModal()
    dispose = bindEscape(m)
    const a = await m.push(A)
    const b = await m.push(B, {}, { escClose: false })
    press()
    await flush()
    expect(b.closed).toBe(false)
    expect(a.closed).toBe(false)
  })

  it('respects escClose false set globally', async () => {
    const m = createModal({ defaults: { escClose: false } })
    dispose = bindEscape(m)
    const a = await m.push(A)
    press()
    await flush()
    expect(a.closed).toBe(false)
  })

  it('does not close the modal underneath on a double Escape', async () => {
    const m = createModal()
    dispose = bindEscape(m)
    const a = await m.push(A)
    const b = await m.push(B)
    const gate = deferred<void>()
    b.onBeforeClose(() => gate.promise)
    press()
    press()
    gate.resolve()
    await flush()
    expect(b.closed).toBe(true)
    expect(a.closed).toBe(false)
  })

  it('swallows a vetoed close', async () => {
    const m = createModal()
    dispose = bindEscape(m)
    const a = await m.push(A)
    a.onBeforeClose(() => false)
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    press()
    await flush()
    await flush()
    process.off('unhandledRejection', unhandled)
    expect(unhandled).not.toHaveBeenCalled()
    expect(a.closed).toBe(false)
  })

  it('ignores events during IME composition', async () => {
    const m = createModal()
    dispose = bindEscape(m)
    const a = await m.push(A)
    press({ isComposing: true })
    await flush()
    expect(a.closed).toBe(false)
  })

  it('ignores events whose default was prevented', async () => {
    const m = createModal()
    dispose = bindEscape(m)
    const a = await m.push(A)
    const input = document.createElement('input')
    document.body.append(input)
    input.addEventListener('keyup', e => e.preventDefault())
    press({}, input)
    await flush()
    expect(a.closed).toBe(false)
    input.remove()
  })

  it('stops listening after dispose and removes the listener', async () => {
    const m = createModal()
    const remove = vi.spyOn(document, 'removeEventListener')
    const off = bindEscape(m)
    const a = await m.push(A)
    off()
    off()
    expect(remove).toHaveBeenCalledWith('keyup', expect.any(Function))
    remove.mockRestore()
    press()
    await flush()
    expect(a.closed).toBe(false)
  })

  it('listens on a custom target', async () => {
    const m = createModal()
    const root = document.createElement('div')
    document.body.append(root)
    dispose = bindEscape(m, { target: root })
    const a = await m.push(A)
    press()
    await flush()
    expect(a.closed).toBe(false)
    press({}, root)
    await flush()
    expect(a.closed).toBe(true)
    root.remove()
  })
})
