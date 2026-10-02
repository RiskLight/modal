import { createVanillaModal } from '../../src/vanilla'

describe('vanilla adapter without a DOM', () => {
  it('can be created and mount is a no-op', () => {
    const modal = createVanillaModal()
    expect(typeof modal.mount()).toBe('function')
    expect(() => modal.mount()()).not.toThrow()
  })

  it('opens headless when hosts are not required', async () => {
    const modal = createVanillaModal({ requireHost: false })
    const handle = await modal.push(() => 'x')
    expect(modal.getSnapshot().items).toEqual([handle])
  })
})
