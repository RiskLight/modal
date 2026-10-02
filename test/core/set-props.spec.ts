import { createModal } from '../../src'
import { A } from '../helpers'

describe('handle.setProps', () => {
  it('replaces props, bumps revision and notifies subscribers', async () => {
    const m = createModal()
    const h = await m.push(A, { id: 1 })
    const listener = vi.fn()
    m.subscribe(listener)
    const revision = h.revision
    const before = m.getSnapshot()
    h.setProps({ id: 2 })
    expect(h.props).toEqual({ id: 2 })
    expect(h.revision).toBe(revision + 1)
    expect(listener).toHaveBeenCalledOnce()
    expect(m.getSnapshot()).not.toBe(before)
  })

  it('is ignored after close', async () => {
    const m = createModal()
    const h = await m.push(A, { id: 1 })
    await h.close()
    h.setProps({ id: 2 })
    expect(h.props).toEqual({ id: 1 })
  })

  it('does nothing when given the same props object', async () => {
    const m = createModal()
    const props = { id: 1 }
    const h = await m.push(A, props)
    const listener = vi.fn()
    m.subscribe(listener)
    h.setProps(props)
    expect(listener).not.toHaveBeenCalled()
  })
})
