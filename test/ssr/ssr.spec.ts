import { createSSRApp, defineComponent, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { createVueModal, ModalContainer } from '../../src/vue'

const Title = defineComponent({ props: { title: String }, render() { return h('p', this.title) } })

function app(modal: ReturnType<typeof createVueModal>) {
  return createSSRApp({ render: () => h('main', [h(ModalContainer)]) }).use(modal)
}

describe('server rendering', () => {
  it('renders without touching the DOM', async () => {
    const html = await renderToString(app(createVueModal()))
    expect(html).toContain('<main>')
  })

  it('renders modals opened before rendering and keeps apps isolated', async () => {
    const one = createVueModal({ requireHost: false })
    const two = createVueModal({ requireHost: false })
    await one.push(Title, { title: 'only-one' })
    const [first, second] = await Promise.all([renderToString(app(one)), renderToString(app(two))])
    expect(first).toContain('only-one')
    expect(second).not.toContain('only-one')
  })

  it('does not attach hosts on the server', async () => {
    const modal = createVueModal()
    await renderToString(app(modal))
    expect(modal.isHosted()).toBe(false)
  })
})
