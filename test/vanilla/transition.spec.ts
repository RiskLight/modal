import { createVanillaModal as create, type VanillaModalManager } from '../../src/vanilla'

const created: VanillaModalManager[] = []

beforeEach(() => {
  vi.useFakeTimers()
  const style = document.createElement('style')
  style.textContent = '.fade-enter-active, .fade-leave-active { transition: opacity 200ms; }'
  document.head.append(style)
})

afterEach(() => {
  for (const manager of created.splice(0)) manager.dispose()
  vi.useRealTimers()
  document.body.innerHTML = ''
  document.head.innerHTML = ''
})

function setup(transition?: string | false) {
  const modal = create({ autoMount: false })
  created.push(modal)
  modal.mount(undefined, transition === undefined ? { transition: 'fade' } : { transition })
  return modal
}

describe('vanilla transitions', () => {
  it('runs the enter transition on open', async () => {
    const modal = setup()
    await modal.push(() => 'x')
    const root = document.querySelector('.modal-container')!
    expect(root.classList.contains('fade-enter-active')).toBe(true)
    await vi.advanceTimersByTimeAsync(300)
    expect(root.classList.contains('fade-enter-active')).toBe(false)
  })

  it('keeps the modal during the leave transition, then removes it and calls destroy', async () => {
    const modal = setup()
    const destroy = vi.fn()
    const handle = await modal.push(() => ({ element: document.createElement('section'), destroy }))
    await vi.advanceTimersByTimeAsync(300)
    await handle.close()
    const root = document.querySelector('.modal-container')!
    expect(root.classList.contains('fade-leave-active')).toBe(true)
    expect(destroy).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(300)
    expect(document.querySelector('.modal-container')).toBeNull()
    expect(destroy).toHaveBeenCalledOnce()
  })

  it('releases focus and inert as soon as closing starts', async () => {
    const page = document.createElement('main')
    const opener = document.createElement('button')
    page.append(opener)
    document.body.append(page)
    opener.focus()
    const modal = setup()
    const handle = await modal.push(() => {
      const box = document.createElement('div')
      box.innerHTML = '<button>in</button>'
      return box
    })
    expect(page.inert).toBe(true)
    await handle.close()
    await vi.advanceTimersByTimeAsync(0)
    expect(page.inert).toBe(false)
    expect(document.activeElement).toBe(opener)
  })

  it('removes immediately with transition false', async () => {
    const modal = setup(false)
    const handle = await modal.push(() => 'x')
    expect(document.querySelector('.modal-container')!.className).not.toContain('enter')
    await handle.close()
    expect(document.querySelector('.modal-container')).toBeNull()
  })

  it('uses modal-list by default', async () => {
    const style = document.createElement('style')
    style.textContent = '.modal-list-enter-active { transition: opacity 200ms; }'
    document.head.append(style)
    const modal = create({ autoMount: false })
    created.push(modal)
    modal.mount()
    await modal.push(() => 'x')
    expect(document.querySelector('.modal-container')!.classList.contains('modal-list-enter-active')).toBe(true)
  })

  it('drops leaving modals immediately on dispose', async () => {
    const modal = setup()
    const handle = await modal.push(() => 'x')
    await handle.close()
    modal.dispose()
    expect(document.querySelector('.modal-container')).toBeNull()
  })
})
