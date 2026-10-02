export type ModalErrorCode =
  | 'not-found'
  | 'not-hosted'
  | 'before-open-rejected'
  | 'guard-rejected'
  | 'queue-not-empty'
  | 'not-registered'
  | 'no-component'
  | 'outside-modal'
  | 'no-manager'
  | 'disposed'

export class ModalError extends Error {
  readonly code: ModalErrorCode
  readonly details: unknown

  constructor(code: ModalErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'ModalError'
    this.code = code
    this.details = details
  }
}

export function isModalError(error: unknown, code?: ModalErrorCode): error is ModalError {
  return error instanceof ModalError && (code === undefined || error.code === code)
}
