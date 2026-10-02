import { act, fireEvent, renderHook } from '@testing-library/react'
import { createReactModal, ModalProvider, useBeforeModalClose, useCurrentModal, useModalSnapshot } from '../../src/react'
import { flushReact, Guarded, renderContainer, Resolver, Title } from './fixtures'

describe('useCurrentModal and useBeforeModalClose', () => {
  it('gives each modal its own handle', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    const a = await act(() => modal.push(Guarded, { verdict: () => true }))
    const b = await act(() => modal.push(Guarded, { verdict: () => true }))
    expect([...view.container.querySelectorAll('.guarded')].map(el => el.textContent)).toEqual([String(a.id), String(b.id)])
  })

  it('attaches the guard to the right modal and passes the event', async () => {
    const modal = createReactModal()
    renderContainer(modal)
    const seenA: unknown[] = []
    const a = await act(() => modal.push(Guarded, { verdict: () => false, seen: seenA }))
    const b = await act(() => modal.push(Guarded, { verdict: () => true }))
    await act(() => b.close())
    expect(seenA).toHaveLength(0)
    await act(() => expect(a.close({ esc: true })).resolves.toBe(false))
    expect(seenA).toEqual([{ background: false, esc: true, route: false }])
  })

  it('uses the latest guard closure', async () => {
    const modal = createReactModal()
    renderContainer(modal)
    let allow = false
    const handle = await act(() => modal.push(Guarded, { verdict: () => allow }))
    await act(() => expect(handle.close()).resolves.toBe(false))
    allow = true
    await act(() => handle.close())
    expect(handle.closed).toBe(true)
  })

  it('throws outside-modal outside a modal', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useCurrentModal())).toThrow(expect.objectContaining({ code: 'outside-modal' }))
    expect(() => renderHook(() => useBeforeModalClose(() => false))).toThrow(expect.objectContaining({ code: 'outside-modal' }))
    error.mockRestore()
  })
})

describe('useModalResolve', () => {
  it('resolves the prompt of its own modal', async () => {
    const modal = createReactModal()
    const view = renderContainer(modal)
    let result!: Promise<string | null>
    await act(async () => {
      result = modal.prompt<string>(Resolver, { value: 'done' })
    })
    await flushReact()
    fireEvent.click(view.container.querySelector('.resolve')!)
    await flushReact()
    expect(await result).toBe('done')
  })
})

describe('useModalSnapshot', () => {
  it('re-renders on changes and follows the namespace', async () => {
    const modal = createReactModal({ requireHost: false })
    const { result, rerender } = renderHook(({ ns }: { ns?: string }) => useModalSnapshot(ns), {
      initialProps: {},
      wrapper: ({ children }) => <ModalProvider manager={modal}>{children}</ModalProvider>,
    })
    expect(result.current.items).toHaveLength(0)
    const handle = await act(() => modal.push(Title))
    expect(result.current.items).toEqual([handle])
    rerender({ ns: 'side' })
    expect(result.current.namespace).toBe('side')
  })

  it('accepts an explicit manager without a provider', async () => {
    const modal = createReactModal({ requireHost: false })
    const { result } = renderHook(() => useModalSnapshot(undefined, modal))
    await act(() => modal.push(Title))
    expect(result.current.items).toHaveLength(1)
  })
})
