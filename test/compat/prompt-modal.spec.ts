import { mount } from '@vue/test-utils'
import { closeModal, container, promptModal } from '../../src/compat'
import { forceClean, ModalPromptValue, ModalPromptValueWithHandler, wait } from './fixtures'

let app: ReturnType<typeof mount>

beforeEach(async () => {
  forceClean()
  app = mount(container)
  await wait()
})

describe('Testing prompt-modal', () => {
  it('Test for opened modal window', async () => {
    const value = '123'
    void promptModal(ModalPromptValue, { value })
    await wait(1)
    expect(app.text()).toEqual(value)
  })

  it('Should be returned with provided value', async () => {
    const value = Math.random()
    const prResult = promptModal(ModalPromptValue, { value })
    await wait()
    await app.find('button').trigger('click')
    await wait()
    expect(await prResult).toEqual(value)
  })

  it('If modal was prompted and then just closed, promise should be resolved with value null', async () => {
    const prResult = promptModal(ModalPromptValue, { value: Math.random() })
    await wait()
    await closeModal()
    expect(await prResult).toEqual(null)
  })

  it("Should not be executed, if on of close's handler stop closing process", async () => {
    const value = Math.random()
    const prResult = promptModal(ModalPromptValueWithHandler, { value })
    await wait()
    await app.find('button').trigger('click')
    await wait()
    await app.find('button').trigger('click')
    await wait()
    expect(await prResult).toEqual(value)
  })
})
