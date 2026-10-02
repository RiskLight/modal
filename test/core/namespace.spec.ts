import { createModal, DEFAULT_NAMESPACE } from '../../src'
import { A, B, C } from '../helpers'

describe('namespace options', () => {
  it('has sensible defaults', () => {
    const m = createModal()
    expect(m.options()).toEqual({ escClose: true, scrollLock: true, singleShow: false, backgroundClose: true, draggable: false })
  })

  it('applies defaults to every namespace', () => {
    const m = createModal({ defaults: { escClose: false } })
    expect(m.options('any').escClose).toBe(false)
  })

  it('lets a namespace override defaults', () => {
    const m = createModal({ defaults: { escClose: false }, namespaces: { side: { escClose: true, scrollLock: false } } })
    expect(m.options('side')).toMatchObject({ escClose: true, scrollLock: false })
    expect(m.options()).toMatchObject({ escClose: false, scrollLock: true })
  })

  it('configure merges into defaults and keeps namespace overrides', () => {
    const m = createModal({ namespaces: { side: { escClose: false } } })
    m.configure({ escClose: true, singleShow: true })
    expect(m.options('side')).toMatchObject({ escClose: false, singleShow: true })
    m.configure({ scrollLock: false })
    expect(m.options()).toMatchObject({ singleShow: true, scrollLock: false })
  })

  it('configureNamespace merges into one namespace only', () => {
    const m = createModal()
    m.configureNamespace('side', { singleShow: true })
    m.configureNamespace('side', { escClose: false })
    expect(m.options('side')).toMatchObject({ singleShow: true, escClose: false })
    expect(m.options()).toMatchObject({ singleShow: false, escClose: true })
  })

  it('ignores undefined values in configure', () => {
    const m = createModal()
    m.configure({ escClose: undefined })
    expect(m.options().escClose).toBe(true)
  })

  it('returns frozen options', () => {
    expect(Object.isFrozen(createModal().options())).toBe(true)
  })

  it('does not change flags of modals that are already open', async () => {
    const m = createModal()
    const h = await m.push(A)
    m.configure({ backgroundClose: false })
    expect(h.backgroundClose).toBe(true)
    expect((await m.push(B)).backgroundClose).toBe(false)
  })

  it('does not share state between managers', async () => {
    const one = createModal()
    const two = createModal()
    one.configure({ escClose: false })
    await one.push(A)
    expect(two.options().escClose).toBe(true)
    expect(two.getSnapshot().items).toEqual([])
  })
})

describe('namespaces and topmost', () => {
  it('lists namespaces that have been used', async () => {
    const m = createModal({ namespaces: { side: {} } })
    await m.push(A, {}, { namespace: 'other' })
    expect([...m.namespaces()].sort()).toEqual(['other', 'side'])
  })

  it('current returns the top of a namespace', async () => {
    const m = createModal()
    await m.push(A)
    const b = await m.push(B)
    const s = await m.push(C, {}, { namespace: 'side' })
    expect(m.current()).toBe(b)
    expect(m.current(DEFAULT_NAMESPACE)).toBe(b)
    expect(m.current('side')).toBe(s)
    expect(m.current('none')).toBeUndefined()
  })

  it('topmost returns the most recently opened top across namespaces', async () => {
    const m = createModal()
    await m.push(A)
    const s = await m.push(B, {}, { namespace: 'side' })
    expect(m.topmost()).toBe(s)
    const c = await m.push(C)
    expect(m.topmost()).toBe(c)
  })

  it('topmost filters by namespace options', async () => {
    const m = createModal({ namespaces: { toast: { escClose: false } } })
    const a = await m.push(A)
    await m.push(B, {}, { namespace: 'toast' })
    expect(m.topmost(o => o.escClose)).toBe(a)
    expect(m.topmost((_o, ns) => ns === 'toast')?.namespace).toBe('toast')
  })

  it('topmost is undefined when nothing is open', () => {
    expect(createModal().topmost()).toBeUndefined()
  })
})
