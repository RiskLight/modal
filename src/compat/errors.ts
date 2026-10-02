import { ModalError as CoreModalError, type ModalErrorCode } from '../core/errors.js'
import type { ModalId, Namespace } from '../core/types.js'

export class ModalError extends CoreModalError {
  readonly isModalError = true

  constructor(message: string, details: unknown = null, code: ModalErrorCode = 'not-found') {
    super(code, message, details)
  }

  static Undefined(id: ModalId): ModalError {
    return new ModalError(`Modal with id: ${id} not founded. The modal window may have been closed earlier.`, null, 'not-found')
  }

  static NextReject(id: ModalId): ModalError {
    return new ModalError(`Guard returned false. Modal navigation was stopped. Modal id ${id}`, null, 'guard-rejected')
  }

  static GuardDeclarationType(func: unknown): ModalError {
    return new ModalError("Guard's type should be a function. Provided:", func, 'not-found')
  }

  static RejectedByBeforeEach(): ModalError {
    return new ModalError('The opening of the modal was stopped in beforeEach', null, 'before-open-rejected')
  }

  static ConfigurationType(config: unknown): ModalError {
    return new ModalError('Configuration type must be an Object. Provided', config, 'not-found')
  }

  static QueueNoEmpty(): ModalError {
    return new ModalError("Modal's queue is not empty. Probably some modal reject closing by onClose hook.", null, 'queue-not-empty')
  }

  static EmptyModalQueue(): ModalError {
    return new ModalError('Modal queue is empty.', null, 'not-found')
  }

  static NotInitialized(namespace: Namespace): ModalError {
    return new ModalError(
      `Modal Container not found. Put container from jenesius-vue-modal in App's template. Namespace: ${namespace}. Check documentation for more information https://modal.jenesius.com/docs.html/installation#getting-started.`,
      null,
      'not-hosted',
    )
  }

  static ModalComponentNotProvided(): ModalError {
    return new ModalError('The first parameter(VueComponent) was not specified.', null, 'no-component')
  }

  static ModalNotFoundByID(id: ModalId): ModalError {
    return new ModalError(`Modal with ID ${id} was not found.`, null, 'not-found')
  }

  static ModalNotExistsInStore(modalName: string): ModalError {
    return new ModalError(
      `Provided name(${modalName}) don't exist in the store. Has the given name been added to the store?`,
      null,
      'not-registered',
    )
  }
}
