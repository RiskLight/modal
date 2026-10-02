import { act, render } from '@testing-library/react'
import { StrictMode, type ReactNode } from 'react'
import { createMemoryRouter, MemoryRouter, Outlet, Route, RouterProvider, Routes, useNavigate } from 'react-router'
import { createReactModal, ModalContainer, ModalProvider, useBeforeModalClose, type ReactModalManager } from '../../src/react'
import { ModalRoute } from '../../src/react-router'
import { flushReact } from './fixtures'

function User({ id }: { id: string }) {
  return <div className="user">user-{id}</div>
}

function GuardedUser({ id, allow }: { id: string; allow: () => boolean }) {
  useBeforeModalClose(() => allow())
  return <div className="user">guarded-{id}</div>
}

let navigateRef: ReturnType<typeof useNavigate> | undefined

function Layout() {
  navigateRef = useNavigate()
  return (
    <div>
      <Outlet />
      <ModalContainer />
    </div>
  )
}

function dataRouter(modal: ReactModalManager, initial: string, children: { path: string; element: ReactNode }[], wrap = false) {
  const router = createMemoryRouter([{ path: '/', element: <Layout />, children: [{ index: true, element: <p>home</p> }, { path: 'list', element: <p>list</p> }, ...children] }], { initialEntries: [initial] })
  const tree = (
    <ModalProvider manager={modal}>
      <RouterProvider router={router} />
    </ModalProvider>
  )
  const view = render(wrap ? <StrictMode>{tree}</StrictMode> : tree)
  return { router, view }
}

const users = (_modal: ReactModalManager) => [{ path: 'users/:id', element: <ModalRoute component={User} /> }]

describe('react-router data router', () => {
  it('opens the modal of the initial route with params as props', async () => {
    const modal = createReactModal()
    const { view } = dataRouter(modal, '/users/3', users(modal))
    await flushReact()
    expect(view.container.querySelector('.user')!.textContent).toBe('user-3')
    expect(modal.current()?.isRoute).toBe(true)
  })

  it('closes with route: true when navigating away', async () => {
    const modal = createReactModal()
    const { router } = dataRouter(modal, '/users/3', users(modal))
    await flushReact()
    const handle = modal.current()!
    const guard = vi.fn()
    handle.onBeforeClose(guard)
    await act(() => router.navigate('/list'))
    await flushReact()
    expect(handle.closed).toBe(true)
    expect(guard).toHaveBeenCalledWith({ background: false, esc: false, route: true })
    expect(router.state.location.pathname).toBe('/list')
  })

  it('blocks navigation while a guard vetoes', async () => {
    const modal = createReactModal()
    let allow = false
    const { router, view } = dataRouter(modal, '/users/3', [{ path: 'users/:id', element: <ModalRoute component={GuardedUser} props={({ params }) => ({ id: params.id ?? '', allow: () => allow })} /> }])
    await flushReact()
    await act(() => router.navigate('/list'))
    await flushReact()
    expect(router.state.location.pathname).toBe('/users/3')
    expect(view.container.querySelector('.user')!.textContent).toBe('guarded-3')
    allow = true
    await act(() => router.navigate('/list'))
    await flushReact()
    expect(router.state.location.pathname).toBe('/list')
    expect(view.container.querySelector('.user')).toBeNull()
  })

  it('keeps the same modal and updates props when params change, without running guards', async () => {
    const modal = createReactModal()
    const { router, view } = dataRouter(modal, '/users/1', users(modal))
    await flushReact()
    const handle = modal.current()!
    const guard = vi.fn()
    handle.onBeforeClose(guard)
    await act(() => router.navigate('/users/2'))
    await flushReact()
    expect(modal.current()).toBe(handle)
    expect(guard).not.toHaveBeenCalled()
    expect(view.container.querySelector('.user')!.textContent).toBe('user-2')
  })

  it('goes back when the modal is closed directly', async () => {
    const modal = createReactModal()
    const { router } = dataRouter(modal, '/list', users(modal))
    await flushReact()
    await act(() => router.navigate('/users/5'))
    await flushReact()
    await act(() => modal.current()!.close())
    await flushReact()
    expect(router.state.location.pathname).toBe('/list')
  })

  it('goes to the fallback when the modal route was the first entry', async () => {
    const modal = createReactModal()
    const { router } = dataRouter(modal, '/users/5', [{ path: 'users/:id', element: <ModalRoute component={User} fallback="/list" /> }])
    await flushReact()
    await act(() => modal.current()!.close())
    await flushReact()
    expect(router.state.location.pathname).toBe('/list')
  })

  it('closes on history back', async () => {
    const modal = createReactModal()
    const { router, view } = dataRouter(modal, '/list', users(modal))
    await flushReact()
    await act(() => router.navigate('/users/5'))
    await flushReact()
    await act(() => router.navigate(-1))
    await flushReact()
    expect(router.state.location.pathname).toBe('/list')
    expect(view.container.querySelector('.user')).toBeNull()
  })

  it('stacks in push mode and replaces in open mode', async () => {
    const modal = createReactModal()
    const { router } = dataRouter(modal, '/', [
      { path: 'users/:id', element: <ModalRoute component={User} mode="push" /> },
      { path: 'settings', element: <ModalRoute component={User} props={() => ({ id: 'settings' })} /> },
    ])
    await flushReact()
    const other = await act(() => modal.push(User, { id: 'other' }))
    await act(() => router.navigate('/users/1'))
    await flushReact()
    expect(other.closed).toBe(false)
    expect(modal.getSnapshot().items).toHaveLength(2)
    await act(() => router.navigate('/settings'))
    await flushReact()
    expect(other.closed).toBe(true)
  })

  it('opens exactly one modal under StrictMode and does not run guards on the simulated unmount', async () => {
    const modal = createReactModal()
    const guard = vi.fn(() => true)
    const { router } = dataRouter(modal, '/users/1', [{ path: 'users/:id', element: <ModalRoute component={GuardedUser} props={({ params }) => ({ id: params.id ?? '', allow: guard })} /> }], true)
    await flushReact()
    expect(modal.getSnapshot().items).toHaveLength(1)
    expect(guard).not.toHaveBeenCalled()
    await act(() => router.navigate('/list'))
    await flushReact()
    expect(modal.getSnapshot().items).toHaveLength(0)
  })

  it('maps search params with the props option', async () => {
    const modal = createReactModal()
    const { view } = dataRouter(modal, '/users/1?tab=history', [{ path: 'users/:id', element: <ModalRoute component={User} props={({ params, search }) => ({ id: `${params.id}-${search.get('tab')}` })} /> }])
    await flushReact()
    expect(view.container.querySelector('.user')!.textContent).toBe('user-1-history')
  })
})

describe('react-router declarative router', () => {
  function App({ modal, initial }: { modal: ReactModalManager; initial: string }) {
    return (
      <ModalProvider manager={modal}>
        <MemoryRouter initialEntries={['/list', initial]} initialIndex={1}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route path="list" element={<p>list</p>} />
              <Route path="users/:id" element={<ModalRoute component={GuardedUser} props={({ params }) => ({ id: params.id ?? '', allow: () => allowed })} />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ModalProvider>
    )
  }
  let allowed = true

  it('opens on enter and closes on leave', async () => {
    allowed = true
    const modal = createReactModal()
    const view = render(<App modal={modal} initial="/users/2" />)
    await flushReact()
    expect(view.container.querySelector('.user')!.textContent).toBe('guarded-2')
    await act(async () => navigateRef!('/list'))
    await flushReact()
    expect(view.container.querySelector('.user')).toBeNull()
  })

  it('switches directly between two modal routes', async () => {
    allowed = true
    function Settings() {
      return <div className="settings">settings</div>
    }
    const modal = createReactModal()
    const view = render(
      <ModalProvider manager={modal}>
        <MemoryRouter initialEntries={['/users/1']}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route path="users/:id" element={<ModalRoute component={User} />} />
              <Route path="settings" element={<ModalRoute component={Settings} />} />
            </Route>
          </Routes>
        </MemoryRouter>
      </ModalProvider>,
    )
    await flushReact()
    await act(async () => navigateRef!('/settings'))
    await flushReact()
    await flushReact()
    expect(view.container.querySelector('.user')).toBeNull()
    expect(view.container.querySelector('.settings')).not.toBeNull()
  })

  it('returns to the modal url and keeps the same modal when a guard vetoes', async () => {
    allowed = false
    const modal = createReactModal()
    const view = render(<App modal={modal} initial="/users/2" />)
    await flushReact()
    const handle = modal.current()!
    await act(async () => navigateRef!('/list'))
    await flushReact()
    await flushReact()
    expect(view.container.querySelector('.user')!.textContent).toBe('guarded-2')
    expect(modal.getSnapshot().items).toEqual([handle])
    allowed = true
  })
})
