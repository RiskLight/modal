import type { PropType } from 'vue'

export interface UnionProp<T extends string> {
  type: PropType<T>
  skipCheck: true
  default: T
  validator: (value: unknown) => boolean
}

export interface RequiredObjectProp<T> {
  type: PropType<T>
  skipCheck: true
  required: true
  validator: (value: unknown) => boolean
}

export interface OptionalObjectProp<T> {
  type: PropType<T | undefined>
  skipCheck: true
  default: undefined
  validator: (value: unknown) => boolean
}

function unreachable(): never {
  throw new Error('Prop type carriers are never called')
}

export function unionProp<T extends string>(values: readonly T[], fallback: T): UnionProp<T> {
  const carrier = (): T => fallback
  return { type: carrier, skipCheck: true, default: fallback, validator: value => values.some(item => item === value) }
}

export function requiredObjectProp<T>(check: (value: unknown) => value is T): RequiredObjectProp<T> {
  const carrier = (): T => unreachable()
  return { type: carrier, skipCheck: true, required: true, validator: check }
}

export function optionalObjectProp<T>(check: (value: unknown) => value is T): OptionalObjectProp<T> {
  const carrier = (): T | undefined => undefined
  return { type: carrier, skipCheck: true, default: undefined, validator: value => value === undefined || check(value) }
}

export interface OptionalStringProp {
  type: PropType<string | undefined>
  skipCheck: true
  default: undefined
  validator: (value: unknown) => boolean
}

export function optionalStringProp(): OptionalStringProp {
  const carrier = (): string | undefined => undefined
  return { type: carrier, skipCheck: true, default: undefined, validator: value => value === undefined || typeof value === 'string' }
}
