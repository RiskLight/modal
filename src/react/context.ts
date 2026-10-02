import { createContext } from 'react'
import type { ReactModalHandle, ReactModalManager } from './types.js'

export const ManagerContext = createContext<ReactModalManager | null>(null)

export const HandleContext = createContext<ReactModalHandle | null>(null)
