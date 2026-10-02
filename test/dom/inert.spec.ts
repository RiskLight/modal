import { inertOutside } from '../../src/dom'

function tree() {
  document.body.innerHTML = `
    <header id="header"></header>
    <div id="app">
      <main id="main"></main>
      <div id="host" data-modal-host><div id="keep"></div></div>
      <div id="other-host" data-modal-host></div>
      <aside id="aside"><div data-modal-host id="nested-host"></div></aside>
    </div>
    <script id="script"></script>
  `
  const get = (id: string) => document.getElementById(id) as HTMLElement
  return get
}

describe('inertOutside', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('makes siblings along the ancestor chain inert and restores them', () => {
    const get = tree()
    const release = inertOutside(get('keep'), { exclude: '[data-modal-host]' })
    expect(get('header').inert).toBe(true)
    expect(get('main').inert).toBe(true)
    expect(get('app').inert).toBe(false)
    expect(get('host').inert).toBe(false)
    expect(get('keep').inert).toBe(false)
    expect(get('other-host').inert).toBe(false)
    expect(get('aside').inert).toBe(false)
    expect(get('script').inert).toBe(false)
    release()
    release()
    expect(get('header').inert).toBe(false)
    expect(get('main').inert).toBe(false)
  })

  it('counts overlapping releases', () => {
    const get = tree()
    const one = inertOutside(get('keep'))
    const two = inertOutside(get('keep'))
    one()
    expect(get('main').inert).toBe(true)
    two()
    expect(get('main').inert).toBe(false)
  })

  it('restores elements that were inert before', () => {
    const get = tree()
    get('main').inert = true
    inertOutside(get('keep'))()
    expect(get('main').inert).toBe(true)
  })
})
