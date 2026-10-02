import { createModal, ModalError } from '../../src'
import { A, B, flush } from '../helpers'

describe('beforeOpen', () => {
  it('runs global, namespace, registry and per-open hooks in that order', async () => {
    const order: string[] = []
    const m = createModal({
      defaults: { beforeOpen: () => void order.push('global') },
      namespaces: { default: { beforeOpen: () => void order.push('namespace') } },
      registry: { a: { component: A, beforeOpen: () => void order.push('registry') } },
    })
    await m.push('a', {}, { beforeOpen: () => void order.push('open') })
    expect(order).toEqual(['global', 'namespace', 'registry', 'open'])
  })

  it('passes the open context', async () => {
    const hook = vi.fn()
    const m = createModal({ defaults: { beforeOpen: hook }, registry: { a: A } })
    const props = { x: 1 }
    await m.push('a', props, { namespace: 'side' })
    expect(hook).toHaveBeenCalledWith({ component: A, props, namespace: 'side', name: 'a' })
  })

  it('passes name undefined when opened by component', async () => {
    const hook = vi.fn()
    const m = createModal({ defaults: { beforeOpen: hook } })
    await m.push(A)
    expect(hook.mock.calls[0]![0].name).toBeUndefined()
  })

  it.each(['global', 'namespace', 'registry', 'open'] as const)('rejects when the %s hook returns false', async level => {
    const no = () => false
    const m = createModal({
      defaults: level === 'global' ? { beforeOpen: no } : {},
      namespaces: level === 'namespace' ? { default: { beforeOpen: no } } : {},
      registry: { a: level === 'registry' ? { component: A, beforeOpen: no } : A },
    })
    const error = await m.push('a', {}, level === 'open' ? { beforeOpen: no } : {}).catch(e => e)
    expect(error).toBeInstanceOf(ModalError)
    expect(error.code).toBe('before-open-rejected')
    expect(m.getSnapshot().items).toEqual([])
  })

  it('waits for async hooks', async () => {
    const m = createModal({
      defaults: {
        beforeOpen: async () => {
          await flush()
          return false
        },
      },
    })
    await expect(m.push(A)).rejects.toMatchObject({ code: 'before-open-rejected' })
  })

  it('skips later hooks after a rejection', async () => {
    const later = vi.fn()
    const m = createModal({ defaults: { beforeOpen: () => false } })
    await m.push(A, {}, { beforeOpen: later }).catch(() => {})
    expect(later).not.toHaveBeenCalled()
  })

  it('treats any value other than false as allow', async () => {
    const m = createModal({ defaults: { beforeOpen: () => 0 as never } })
    await expect(m.push(A)).resolves.toBeTruthy()
  })

  it('propagates errors thrown by hooks', async () => {
    const boom = new Error('boom')
    const m = createModal({
      defaults: {
        beforeOpen: () => {
          throw boom
        },
      },
    })
    await expect(m.push(A)).rejects.toBe(boom)
  })

  it('can be replaced through configure', async () => {
    const m = createModal()
    let allow = false
    m.configure({ beforeOpen: () => allow })
    await expect(m.push(A)).rejects.toMatchObject({ code: 'before-open-rejected' })
    allow = true
    await expect(m.push(B)).resolves.toBeTruthy()
  })

  it('counts each attempt independently', async () => {
    let count = 3
    const m = createModal({ registry: { a: { component: A, beforeOpen: () => count-- <= 0 } } })
    for (let i = 0; i < 3; i++) await m.push('a').catch(() => {})
    await m.push('a')
    await m.push('a')
    expect(m.getSnapshot().items).toHaveLength(2)
  })

  it('runs on open after the namespace was cleared', async () => {
    const m = createModal()
    const a = await m.push(A)
    const hook = vi.fn(() => {
      expect(a.closed).toBe(true)
    })
    await m.open(B, {}, { beforeOpen: hook })
    expect(hook).toHaveBeenCalledOnce()
  })
})
