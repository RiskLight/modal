import { act, fireEvent } from '@testing-library/react'
import { createReactModal } from '../../src/react'
import { Counter, renderContainer, Title } from './fixtures'

describe('react setProps', () => {
  it('re-renders the open modal with new props', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    const handle = await act(() => modal.push(Title, { title: 'one' }))
    act(() => handle.setProps({ title: 'two' }))
    expect(view.container.querySelector('.title')!.textContent).toBe('two')
  })

  it('keeps component state when props change', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    const handle = await act(() => modal.push(Counter, {}))
    fireEvent.click(view.container.querySelector('.counter')!)
    act(() => handle.setProps({ unrelated: true }))
    expect(view.container.querySelector('.counter')!.textContent).toBe('1')
  })
})
