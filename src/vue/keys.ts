import type { Component, InjectionKey } from 'vue'
import type { ModalHandle } from '../core/types.js'
import type { VueModalManager } from './types.js'

export const MANAGER_KEY: InjectionKey<VueModalManager> = Symbol('risklight-modal-manager')

export const HANDLE_KEY: InjectionKey<ModalHandle<Component, unknown>> = Symbol('risklight-modal-handle')
