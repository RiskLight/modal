import { createVanillaModal as create, fromHTML, type VanillaModalManager } from '../../src/vanilla'

const created: VanillaModalManager[] = []
const createVanillaModal = () => {
  const manager = create()
  created.push(manager)
  return manager
}

afterEach(() => {
  for (const manager of created.splice(0)) manager.dispose()
  document.body.innerHTML = ''
})

describe('vanilla setProps', () => {
  it('re-applies data-prop bindings of templates', async () => {
    const modal = createVanillaModal()
    const handle = await modal.push(fromHTML('<div><b data-prop="name"></b><input data-prop="email"></div>'), { name: 'a', email: 'x' })
    handle.setProps({ name: 'b', email: 'y' })
    expect(document.querySelector('b')!.textContent).toBe('b')
    expect(document.querySelector('input')!.value).toBe('y')
  })

  it('calls update of function components with the new props', async () => {
    const modal = createVanillaModal()
    const update = vi.fn()
    const handle = await modal.push((_props: { n: number }) => ({ element: document.createElement('div'), update }), { n: 1 })
    handle.setProps({ n: 2 })
    expect(update).toHaveBeenCalledWith({ n: 2 })
  })

  it('does not re-render components without update', async () => {
    const modal = createVanillaModal()
    let renders = 0
    const handle = await modal.push(() => {
      renders++
      return document.createElement('div')
    })
    handle.setProps({ n: 2 })
    expect(renders).toBe(1)
  })

  it('runs template setup update hooks too', async () => {
    const modal = createVanillaModal()
    const seen: unknown[] = []
    const component = fromHTML<{ n: number }>('<p data-prop="n"></p>', (_root, _props, _handle) => ({ update: next => void seen.push(next) }))
    const handle = await modal.push(component, { n: 1 })
    handle.setProps({ n: 3 })
    expect(document.querySelector('p')!.textContent).toBe('3')
    expect(seen).toEqual([{ n: 3 }])
  })
})
