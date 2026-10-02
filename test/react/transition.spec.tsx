import { act } from '@testing-library/react'
import { createReactModal } from '../../src/react'
import { renderContainer, Title } from './fixtures'

beforeEach(() => {
  vi.useFakeTimers()
  const style = document.createElement('style')
  style.textContent = '.fade-enter-active, .fade-leave-active { transition: opacity 200ms; }'
  document.head.append(style)
})

afterEach(() => {
  vi.useRealTimers()
  document.head.innerHTML = ''
})

describe('react transitions', () => {
  it('runs enter and keeps the modal during leave', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal, { transition: 'fade' })
    const handle = await act(() => modal.push(Title, { title: 'x' }))
    const root = () => view.container.querySelector('.modal-container')
    expect(root()!.classList.contains('fade-enter-active')).toBe(true)
    await act(() => vi.advanceTimersByTimeAsync(300))
    expect(root()!.classList.contains('fade-enter-active')).toBe(false)
    await act(() => handle.close())
    expect(root()!.classList.contains('fade-leave-active')).toBe(true)
    expect(modal.getSnapshot().items).toHaveLength(0)
    await act(() => vi.advanceTimersByTimeAsync(300))
    expect(root()).toBeNull()
  })

  it('does not trap focus or block the page while leaving', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal, { transition: 'fade' }, <main id="page">page</main>)
    const handle = await act(() => modal.push(Title, { title: 'x' }))
    await act(() => handle.close())
    expect((view.container.querySelector('#page') as HTMLElement).inert).toBe(false)
  })

  it('removes immediately with transition false', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal, { transition: false })
    const handle = await act(() => modal.push(Title, { title: 'x' }))
    expect(view.container.querySelector('.modal-container')!.className).not.toContain('enter')
    await act(() => handle.close())
    expect(view.container.querySelector('.modal-container')).toBeNull()
  })

  it('keeps stack order while an item in the middle leaves', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal, { transition: 'fade' })
    await act(() => modal.push(Title, { title: 'a' }))
    const b = await act(() => modal.push(Title, { title: 'b' }))
    await act(() => modal.push(Title, { title: 'c' }))
    await act(() => b.close())
    expect([...view.container.querySelectorAll('.title')].map(el => el.textContent)).toEqual(['a', 'b', 'c'])
    await act(() => vi.advanceTimersByTimeAsync(300))
    expect([...view.container.querySelectorAll('.title')].map(el => el.textContent)).toEqual(['a', 'c'])
  })
})
