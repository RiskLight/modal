import { createMemoryHistory, createRouter } from 'vue-router'
import { useModalRouter } from '../../../src/compat'

export const ModalRoute = { name: 'ModalRoute', template: '<div><p>Modal router</p></div>' }
export const ContainerUsers = { name: 'ContainerUsers', template: '<router-view name="modal"/>' }
export const ModalUser = { name: 'ModalUser', props: { id: String }, template: '<p>user-{{id}}</p>' }
export const ModalGuard = {
  name: 'ModalGuard',
  beforeModalClose() {
    return false
  },
  template: '<p>123</p>',
}

export function createTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/router-simple-modal', component: useModalRouter(ModalRoute) },
      { path: '/simple-modal', component: useModalRouter(ModalRoute) },
      { path: '/users', component: ContainerUsers, children: [{ path: ':id', components: { modal: useModalRouter(ModalUser) } }] },
      { path: '/a', component: { template: 'A' } },
      { path: '/b', component: { template: 'B' } },
      { path: '/c', component: { template: 'C' } },
      { path: '/', component: { template: 'Test' } },
      { path: '/guard', component: useModalRouter(ModalGuard) },
    ],
  })
}

export const App = {
  template: '<div><container/><router-view/></div>',
}
