import { act, fireEvent, render, renderHook } from '@testing-library/react'
import { createReactModal, ModalContainer, useModalSnapshot } from '../../src/react'
import { renderContainer } from './fixtures'

function Updater({ onUpdateValue, onClose }: { onUpdateValue?: (v: number) => void; onClose?: () => void }) {
  return (
    <div className="updater">
      <button className="update" onClick={() => onUpdateValue?.(7)} />
      <button className="close" onClick={() => onClose?.()} />
    </div>
  )
}

describe('react adapter edges', () => {
  it('maps namespaced and dashed event names to camelCase handler props', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    const handle = await act(() => modal.push(Updater))
    const update = vi.fn()
    const close = vi.fn()
    act(() => {
      handle.on('update:value', update)
      handle.on('close', close)
    })
    fireEvent.click(view.container.querySelector('.update')!)
    fireEvent.click(view.container.querySelector('.close')!)
    expect(update).toHaveBeenCalledWith(7)
    expect(close).toHaveBeenCalledOnce()
  })

  it('renders components opened without props', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    await act(() => modal.push(Updater))
    expect(view.container.querySelector('.updater')).not.toBeNull()
  })

  it('throws no-manager for a container without provider or manager', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<ModalContainer />)).toThrow(expect.objectContaining({ code: 'no-manager' }))
    error.mockRestore()
  })

  it('throws no-manager for useModalSnapshot without provider or manager', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useModalSnapshot())).toThrow(expect.objectContaining({ code: 'no-manager' }))
    error.mockRestore()
  })
})
