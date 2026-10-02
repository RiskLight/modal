import { createModal } from '../../src'
import { acquireBehaviors } from '../../src/dom'
import { A, flush } from '../helpers'

function escape() {
  document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', bubbles: true, cancelable: true }))
}

describe('acquireBehaviors', () => {
  afterEach(() => {
    document.body.removeAttribute('style')
  })

  it('binds escape and scroll lock once per manager', async () => {
    const add = vi.spyOn(document, 'addEventListener')
    const m = createModal()
    const one = acquireBehaviors(m)
    const two = acquireBehaviors(m)
    expect(add.mock.calls.filter(([type]) => type === 'keyup')).toHaveLength(1)
    add.mockRestore()
    const h = await m.push(A)
    expect(document.body.style.overflow).toBe('hidden')
    escape()
    await flush()
    expect(h.closed).toBe(true)
    one()
    two()
  })

  it('keeps behaviors until the last release', async () => {
    const m = createModal()
    const one = acquireBehaviors(m)
    const two = acquireBehaviors(m)
    one()
    one()
    const h = await m.push(A)
    expect(document.body.style.overflow).toBe('hidden')
    two()
    expect(document.body.style.overflow).toBe('')
    escape()
    await flush()
    expect(h.closed).toBe(false)
  })

  it('binds again after a full release', async () => {
    const m = createModal()
    acquireBehaviors(m)()
    const again = acquireBehaviors(m)
    const h = await m.push(A)
    escape()
    await flush()
    expect(h.closed).toBe(true)
    again()
  })

  it('keeps managers independent', async () => {
    const one = createModal()
    const two = createModal()
    const release = acquireBehaviors(one)
    const h = await two.push(A)
    escape()
    await flush()
    expect(h.closed).toBe(false)
    release()
  })

  it('can skip escape or scroll lock', async () => {
    const m = createModal()
    const release = acquireBehaviors(m, { escape: false, scrollLock: false })
    const h = await m.push(A)
    expect(document.body.style.overflow).toBe('')
    escape()
    await flush()
    expect(h.closed).toBe(false)
    release()
  })
})
