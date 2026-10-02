import { nextTick } from 'vue'
import { createVueModal } from '../../src/vue'
import { mountContainer, Title } from './fixtures'

describe('vue setProps', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('re-renders the open modal with new props', async () => {
    const modal = createVueModal()
    const wrapper = mountContainer(modal)
    const handle = await modal.push(Title, { title: 'one' })
    handle.setProps({ title: 'two' })
    await nextTick()
    expect(wrapper.find('.title').text()).toBe('two')
  })
})
