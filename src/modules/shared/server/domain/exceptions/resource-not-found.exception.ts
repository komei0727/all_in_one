export class ResourceNotFoundException extends Error {
  constructor(resourceType: string, resourceId: string) {
    super(`${resourceType} with ID ${resourceId} not found`)
    this.name = 'ResourceNotFoundException'
  }
}
