import { createModal, DEFAULT_NAMESPACE } from '../../src'
import { A } from '../helpers'

describe('hosts', () => {
  it('does not require a host by default', async () => {
    await expect(createModal().push(A)).resolves.toBeTruthy()
  })

  it('requires a host when requireHost is true', async () => {
    const m = createModal({ requireHost: true })
    await expect(m.push(A)).rejects.toMatchObject({ code: 'not-hosted', details: { namespace: DEFAULT_NAMESPACE } })
    m.attachHost()
    await expect(m.push(A)).resolves.toBeTruthy()
  })

  it('checks the predicate per namespace', async () => {
    const m = createModal({ requireHost: ns => ns === DEFAULT_NAMESPACE })
    await expect(m.push(A)).rejects.toMatchObject({ code: 'not-hosted' })
    await expect(m.push(A, {}, { namespace: 'side' })).resolves.toBeTruthy()
  })

  it('rejects before running beforeOpen hooks', async () => {
    const hook = vi.fn()
    const m = createModal({ requireHost: true, defaults: { beforeOpen: hook } })
    await m.push(A).catch(() => {})
    expect(hook).not.toHaveBeenCalled()
  })

  it('also guards open', async () => {
    const m = createModal({ requireHost: true })
    await expect(m.open(A)).rejects.toMatchObject({ code: 'not-hosted' })
  })

  it('counts hosts per namespace', () => {
    const m = createModal()
    const one = m.attachHost('side')
    const two = m.attachHost('side')
    expect(m.isHosted('side')).toBe(true)
    expect(m.isHosted()).toBe(false)
    one()
    expect(m.isHosted('side')).toBe(true)
    two()
    expect(m.isHosted('side')).toBe(false)
  })

  it('makes detach idempotent', () => {
    const m = createModal()
    const keep = m.attachHost()
    const detach = m.attachHost()
    detach()
    detach()
    expect(m.isHosted()).toBe(true)
    keep()
    expect(m.isHosted()).toBe(false)
  })

  it('reads the predicate on every push', async () => {
    let skip = false
    const m = createModal({ requireHost: () => !skip })
    await expect(m.push(A)).rejects.toMatchObject({ code: 'not-hosted' })
    skip = true
    await expect(m.push(A)).resolves.toBeTruthy()
  })
})
