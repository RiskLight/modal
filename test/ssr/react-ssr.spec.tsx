import { renderToString } from 'react-dom/server'
import { createReactModal, ModalContainer, ModalProvider } from '../../src/react'

function Title({ title }: { title: string }) {
  return <p>{title}</p>
}

describe('react server rendering', () => {
  it('renders open modals and keeps managers isolated without a DOM', async () => {
    const one = createReactModal({ requireHost: false })
    const two = createReactModal({ requireHost: false })
    await one.push(Title, { title: 'only-one' })
    const first = renderToString(<ModalProvider manager={one}><ModalContainer /></ModalProvider>)
    const second = renderToString(<ModalProvider manager={two}><ModalContainer /></ModalProvider>)
    expect(first).toContain('only-one')
    expect(first).toContain('data-modal-host')
    expect(second).not.toContain('only-one')
    expect(one.isHosted()).toBe(false)
  })
})
