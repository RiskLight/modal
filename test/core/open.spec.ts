import { createModal, DEFAULT_NAMESPACE, ModalError } from '../../src'
import { A, B } from '../helpers'

describe('push', () => {
  it('adds a handle to the default namespace', async () => {
    const m = createModal()
    const h = await m.push(A, { title: 'x' })
    expect(h.namespace).toBe(DEFAULT_NAMESPACE)
    expect(h.component).toBe(A)
    expect(h.status).toBe('open')
    expect(h.closed).toBe(false)
    expect(m.getSnapshot().items).toEqual([h])
  })

  it('stacks modals in push order', async () => {
    const m = createModal()
    const a = await m.push(A)
    const b = await m.push(B)
    expect(m.getSnapshot().items).toEqual([a, b])
    expect(m.current()).toBe(b)
  })

  it('assigns unique increasing ids', async () => {
    const m = createModal()
    const a = await m.push(A)
    const b = await m.push(A)
    expect(b.id).toBeGreaterThan(a.id)
  })

  it('keeps ids unique across managers', async () => {
    const a = await createModal().push(A)
    const b = await createModal().push(A)
    expect(a.id).not.toBe(b.id)
  })

  it('stores props by reference without cloning', async () => {
    const m = createModal()
    const props = { nested: { value: 1 } }
    const h = await m.push(A, props)
    expect(h.props).toBe(props)
  })

  it('accepts any props value including undefined and primitives', async () => {
    const m = createModal()
    expect((await m.push(A)).props).toBeUndefined()
    expect((await m.push(A, 5)).props).toBe(5)
  })

  it('defaults isRoute to false and extra to an empty object', async () => {
    const m = createModal()
    const h = await m.push(A)
    expect(h.isRoute).toBe(false)
    expect(h.extra).toEqual({})
    expect(h.name).toBeUndefined()
  })

  it('passes isRoute and extra through options', async () => {
    const m = createModal()
    const extra = { slots: {} }
    const h = await m.push(A, {}, { isRoute: true, extra })
    expect(h.isRoute).toBe(true)
    expect(h.extra).toBe(extra)
  })

  it('takes per-modal flags from namespace options by default', async () => {
    const m = createModal({ defaults: { backgroundClose: false, escClose: false, draggable: '.handle' } })
    const h = await m.push(A)
    expect(h.backgroundClose).toBe(false)
    expect(h.escClose).toBe(false)
    expect(h.draggable).toBe('.handle')
  })

  it('lets per-open options override namespace options', async () => {
    const m = createModal({ defaults: { backgroundClose: false } })
    const h = await m.push(A, {}, { backgroundClose: true, escClose: false, draggable: true })
    expect(h.backgroundClose).toBe(true)
    expect(h.escClose).toBe(false)
    expect(h.draggable).toBe(true)
  })

  it('keeps per-modal flags mutable', async () => {
    const m = createModal()
    const h = await m.push(A)
    h.backgroundClose = false
    h.escClose = false
    h.draggable = true
    expect(h.backgroundClose).toBe(false)
    expect(h.escClose).toBe(false)
    expect(h.draggable).toBe(true)
  })

  it('rejects when the component is missing', async () => {
    const m = createModal()
    await expect(m.push(undefined as never)).rejects.toMatchObject({ code: 'no-component' })
    await expect(m.push(null as never)).rejects.toBeInstanceOf(ModalError)
    expect(m.getSnapshot().items).toHaveLength(0)
  })

  it('places the handle into the requested namespace only', async () => {
    const m = createModal()
    const h = await m.push(A, {}, { namespace: 'side' })
    expect(h.namespace).toBe('side')
    expect(m.getSnapshot('side').items).toEqual([h])
    expect(m.getSnapshot().items).toEqual([])
  })

  it('treats an empty namespace string as the default namespace', async () => {
    const m = createModal()
    const h = await m.push(A, {}, { namespace: '' })
    expect(h.namespace).toBe(DEFAULT_NAMESPACE)
  })

  it('exposes handles by id', async () => {
    const m = createModal()
    const h = await m.push(A)
    expect(m.get(h.id)).toBe(h)
    expect(m.get(9999)).toBeUndefined()
  })
})

describe('open', () => {
  it('closes everything in the namespace then pushes', async () => {
    const m = createModal()
    const a = await m.push(A)
    const b = await m.push(B)
    const c = await m.open(A)
    expect(a.closed).toBe(true)
    expect(b.closed).toBe(true)
    expect(m.getSnapshot().items).toEqual([c])
  })

  it('does not touch other namespaces', async () => {
    const m = createModal()
    const side = await m.push(A, {}, { namespace: 'side' })
    await m.open(B)
    expect(side.closed).toBe(false)
  })

  it('rejects and keeps the stack when a guard vetoes closing', async () => {
    const m = createModal()
    const a = await m.push(A)
    a.onBeforeClose(() => false)
    await expect(m.open(B)).rejects.toMatchObject({ code: 'guard-rejected' })
    expect(m.getSnapshot().items).toEqual([a])
  })

  it('rejects with queue-not-empty if something was pushed while closing', async () => {
    const m = createModal()
    const a = await m.push(A)
    let pushed: Promise<unknown> | undefined
    a.onBeforeClose(() => {
      pushed = m.push(B)
    })
    await expect(m.open(A)).rejects.toMatchObject({ code: 'queue-not-empty' })
    await pushed
  })
})

describe('disposed manager', () => {
  it('rejects new modals after dispose', async () => {
    const m = createModal()
    m.dispose()
    await expect(m.push(A)).rejects.toMatchObject({ code: 'disposed' })
  })
})
