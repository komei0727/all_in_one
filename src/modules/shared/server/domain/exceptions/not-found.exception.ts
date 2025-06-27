import { DomainException } from './domain.exception'

/**
 * リソースが見つからない場合の例外
 */
export class NotFoundException extends DomainException {
  readonly httpStatusCode = 404
  readonly errorCode = 'RESOURCE_NOT_FOUND'

  constructor(resourceType: string, identifier: string | Record<string, unknown>) {
    const id = typeof identifier === 'string' ? identifier : JSON.stringify(identifier)
    super(`${resourceType} not found: ${id}`, {
      resourceType,
      identifier,
    })
  }
}
