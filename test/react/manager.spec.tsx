import { act, render, renderHook } from '@testing-library/react'
import { createReactModal, ModalProvider, useModal } from '../../src/react'
import { renderContainer, Title } from './fixtures'

describe('createReactModal', () => {
  it('requires a mounted container for the default namespace only', async () => {
    const modal = createReactModal()
    await expect(modal.push(Title)).rejects.toMatchObject({ code: 'not-hosted' })
    await expect(modal.push(Title, {}, { namespace: 'side' })).resolves.toBeTruthy()
  })

  it('accepts modals once a container is mounted and rejects after unmount', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    await act(() => modal.push(Title))
    view.unmount()
    await expect(modal.push(Title)).rejects.toMatchObject({ code: 'not-hosted' })
  })

  it('lets options override requireHost', async () => {
    await expect(createReactModal({ requireHost: false }).push(Title)).resolves.toBeTruthy()
  })

  it('exposes the core manager', async () => {
    const modal = createReactModal({ requireHost: false })
    const handle = await modal.push(Title)
    expect(modal.core.get(handle.id)).toBe(handle)
  })
})

describe('ModalProvider and useModal', () => {
  it('provides the manager', () => {
    const modal = createReactModal()
    const { result } = renderHook(() => useModal(), { wrapper: ({ children }) => <ModalProvider manager={modal}>{children}</ModalProvider> })
    expect(result.current).toBe(modal)
  })

  it('throws no-manager without a provider', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useModal())).toThrow(expect.objectContaining({ code: 'no-manager' }))
    error.mockRestore()
  })

  it('lets a container use an explicit manager without a provider', async () => {
    const modal = createReactModal()
    const view = render(<div><Title title="page" /></div>)
    const { ModalContainer } = await import('../../src/react')
    view.rerender(<ModalContainer manager={modal} />)
    await act(() => modal.push(Title, { title: 'explicit' }))
    expect(view.container.textContent).toBe('explicit')
  })
})
