export class AllocationConflictError extends Error {
  constructor(
    public readonly orderReference: string,
    public readonly vendorId: string,
    message: string,
  ) {
    super(message);
    this.name = 'AllocationConflictError';
  }
}

export class ConcurrentAllocationError extends Error {
  constructor(
    public readonly orderReference: string,
    public readonly vendorId: string,
    message: string,
  ) {
    super(message);
    this.name = 'ConcurrentAllocationError';
  }
}
