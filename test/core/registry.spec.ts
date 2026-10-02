import { createModal } from '../../src'
import { A, B } from '../helpers'

describe('registry', () => {
  it('opens a registered component by name', async () => {
    const m = createModal({ registry: { a: A } })
    const h = await m.push('a')
    expect(h.component).toBe(A)
    expect(h.name).toBe('a')
  })

  it('opens a registered entry with its options', async () => {
    const m = createModal({ registry: { a: { component: A, backgroundClose: false, escClose: false, draggable: true } } })
    const h = await m.push('a')
    expect(h.component).toBe(A)
    expect(h.backgroundClose).toBe(false)
    expect(h.escClose).toBe(false)
    expect(h.draggable).toBe(true)
  })

  it('lets per-open options win over the entry', async () => {
    const m = createModal({ registry: { a: { component: A, backgroundClose: false } } })
    const h = await m.push('a', {}, { backgroundClose: true })
    expect(h.backgroundClose).toBe(true)
  })

  it('does not leak entry options to other modals', async () => {
    const m = createModal({ registry: { a: { component: A, backgroundClose: false, draggable: true } } })
    await m.push('a')
    const h = await m.push(B)
    expect(h.backgroundClose).toBe(true)
    expect(h.draggable).toBe(false)
  })

  it('rejects unknown names with not-registered', async () => {
    const m = createModal()
    await expect(m.push('missing')).rejects.toMatchObject({ code: 'not-registered' })
  })

  it('rejects an entry without a component', async () => {
    const m = createModal({ registry: { a: { component: undefined as never } } })
    await expect(m.push('a')).rejects.toMatchObject({ code: 'no-component' })
  })

  it('registers, looks up and unregisters at runtime', async () => {
    const m = createModal()
    expect(m.lookup('a')).toBeUndefined()
    m.register('a', A)
    expect(m.lookup('a')).toEqual({ component: A })
    m.register('a', { component: B, backgroundClose: false })
    expect(m.lookup('a')).toEqual({ component: B, backgroundClose: false })
    m.unregister('a')
    expect(m.lookup('a')).toBeUndefined()
  })

  it('does not resolve inherited object keys', async () => {
    const m = createModal()
    await expect(m.push('toString')).rejects.toMatchObject({ code: 'not-registered' })
    await expect(m.push('__proto__')).rejects.toMatchObject({ code: 'not-registered' })
  })

  it('supports open and prompt by name', async () => {
    const m = createModal({ registry: { a: A } })
    const h = await m.open('a')
    expect(h.component).toBe(A)
    const result = m.prompt<number>('a')
    await Promise.resolve()
    await new Promise(r => setTimeout(r, 0))
    await m.current()!.resolve(5 as never)
    expect(await result).toBe(5)
  })
})
