import { createModal } from '../../src'
import { bindScrollLock } from '../../src/dom'
import { A, B } from '../helpers'

function mockScrollbar(width: number) {
  const inner = vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1000)
  const client = vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1000 - width)
  return () => {
    inner.mockRestore()
    client.mockRestore()
  }
}

describe('bindScrollLock', () => {
  let cleanups: (() => void)[] = []
  beforeEach(() => {
    document.body.removeAttribute('style')
  })
  afterEach(() => {
    for (const cleanup of cleanups.reverse()) cleanup()
    cleanups = []
    document.body.removeAttribute('style')
  })

  it('hides overflow while a modal is open and restores it after', async () => {
    const m = createModal()
    cleanups.push(bindScrollLock(m))
    const h = await m.push(A)
    expect(document.body.style.overflow).toBe('hidden')
    await h.close()
    expect(document.body.style.overflow).toBe('')
  })

  it('restores the previous inline overflow exactly', async () => {
    document.body.style.overflow = 'scroll'
    const m = createModal()
    cleanups.push(bindScrollLock(m))
    const h = await m.push(A)
    expect(document.body.style.overflow).toBe('hidden')
    await h.close()
    expect(document.body.style.overflow).toBe('scroll')
  })

  it('stays locked until the last modal closes', async () => {
    const m = createModal()
    cleanups.push(bindScrollLock(m))
    const a = await m.push(A)
    const b = await m.push(B)
    await b.close()
    expect(document.body.style.overflow).toBe('hidden')
    await a.close()
    expect(document.body.style.overflow).toBe('')
  })

  it('locks for any namespace with scrollLock', async () => {
    const m = createModal()
    cleanups.push(bindScrollLock(m))
    const h = await m.push(A, {}, { namespace: 'side' })
    expect(document.body.style.overflow).toBe('hidden')
    await h.close()
    expect(document.body.style.overflow).toBe('')
  })

  it('ignores namespaces with scrollLock false', async () => {
    const m = createModal({ namespaces: { toast: { scrollLock: false } } })
    cleanups.push(bindScrollLock(m))
    await m.push(A, {}, { namespace: 'toast' })
    expect(document.body.style.overflow).toBe('')
  })

  it('follows configuration changes while modals are open', async () => {
    const m = createModal()
    cleanups.push(bindScrollLock(m))
    await m.push(A)
    m.configure({ scrollLock: false })
    expect(document.body.style.overflow).toBe('')
    m.configure({ scrollLock: true })
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('locks immediately when bound with modals already open', async () => {
    const m = createModal()
    await m.push(A)
    cleanups.push(bindScrollLock(m))
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('compensates the scrollbar width with padding', async () => {
    cleanups.push(mockScrollbar(15))
    document.body.style.paddingRight = '5px'
    const m = createModal()
    cleanups.push(bindScrollLock(m))
    const h = await m.push(A)
    expect(document.body.style.paddingRight).toBe('20px')
    await h.close()
    expect(document.body.style.paddingRight).toBe('5px')
  })

  it('does not touch padding without a scrollbar', async () => {
    cleanups.push(mockScrollbar(0))
    const m = createModal()
    cleanups.push(bindScrollLock(m))
    await m.push(A)
    expect(document.body.style.paddingRight).toBe('')
  })

  it('restores styles on dispose while locked', async () => {
    document.body.style.overflow = 'auto'
    const m = createModal()
    const off = bindScrollLock(m)
    await m.push(A)
    off()
    off()
    expect(document.body.style.overflow).toBe('auto')
  })

  it('stops reacting after dispose', async () => {
    const m = createModal()
    bindScrollLock(m)()
    await m.push(A)
    expect(document.body.style.overflow).toBe('')
  })

  it('shares one lock between managers on the same target', async () => {
    document.body.style.overflow = 'visible'
    const one = createModal()
    const two = createModal()
    cleanups.push(bindScrollLock(one), bindScrollLock(two))
    const a = await one.push(A)
    const b = await two.push(B)
    await a.close()
    expect(document.body.style.overflow).toBe('hidden')
    await b.close()
    expect(document.body.style.overflow).toBe('visible')
  })

  it('supports a custom target element', async () => {
    const el = document.createElement('div')
    document.body.append(el)
    const m = createModal()
    cleanups.push(bindScrollLock(m, { target: el }))
    const h = await m.push(A)
    expect(el.style.overflow).toBe('hidden')
    expect(document.body.style.overflow).toBe('')
    await h.close()
    expect(el.style.overflow).toBe('')
    el.remove()
  })
})
