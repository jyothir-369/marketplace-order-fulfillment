# Phase 7: Expand-and-Contract Migration

## Overview

This document describes the expand-and-contract migration pattern implementation for the Marketplace Order & Fulfillment System. This migration adds a shipping_address field to the Order entity while maintaining zero-downtime deployment.

## Why Expand-and-Contract?

Traditional schema migrations often require downtime or complex rollback strategies. The expand-and-contract pattern allows us to:

1. Add new fields without breaking existing functionality
2. Gradually migrate data without batch jobs
3. Maintain backward compatibility during transition
4. Achieve zero-downtime deployments

## Migration Phases

### Phase 1: Expand (Current)

Add the new shipping_address column to the database:

`sql
ALTER TABLE orders ADD COLUMN shipping_address VARCHAR(500);
`

**Key characteristics:**
- Column is nullable (maintains backward compatibility)
- Existing orders don't require immediate updates
- Application code updated to write to both old and new fields

**Files modified:**
- src/common/entities/order.entity.ts - Added shippingAddress field
- src/orders/orders.service.ts - Updated to write to new field
- src/orders/dto/orders.dto.ts - Added shippingAddress to DTOs

### Phase 2: Dual-Write

Application code writes to both old and new fields during the transition period:

`	ypescript
// In checkout service - dual-write implementation
const order = manager.create(Order, {
  buyerId: dto.buyerId,
  status: OrderStatus.PLACED,
  correlationId: correlationId,
  shippingAddress: dto.shippingAddress || null, // New field
  // Legacy fields remain for backward compatibility
});
`

**Benefits:**
- Zero downtime migration
- Immediate data consistency
- Easy rollback if issues arise

### Phase 3: Backfill

Populate the new field for existing records:

`	ypescript
// Backfill migration
UPDATE orders 
SET shipping_address = 'Default Shipping Address - Legacy Order'
WHERE shipping_address IS NULL;
`

**Execution:**
`ash
npm run migration:run
`

### Phase 4: Cut-Over

Switch reads to use the new field:

`	ypescript
// In toOrderResponseDto - cut-over to new field
private toOrderResponseDto(order: Order): OrderResponseDto {
  return {
    id: order.id,
    // ...
    shippingAddress: order.shippingAddress || '', // READ from new field
    // ...
  };
}
`

### Phase 5: Contract (Future Release)

Remove the old field in a future release:

`sql
ALTER TABLE orders DROP COLUMN legacy_shipping_field;
`

**Note:** This step is deferred to a future release to allow for rollback if needed.

## Running Migrations

### Run all pending migrations:
`ash
npm run migration:run
`

### Revert last migration:
`ash
npm run migration:revert <migration-name>
`

### Check migration status:
`ash
npm run migration:status
`

## Migration Files

| Migration | Description |
|-----------|-------------|
| 1710000000001-AddShippingAddressToOrders.ts | Adds shipping_address column |
| 1710000000002-BackfillShippingAddress.ts | Backfills existing records |

## API Changes

### Checkout Request (Updated)

`json
{
  ""buyerId"": ""uuid"",
  ""items"": [
    {
      ""productId"": ""uuid"",
      ""quantity"": 1
    }
  ],
  ""shippingAddress"": ""123 Main St, City, Country""
}
`

### Order Response (Updated)

`json
{
  ""id"": ""uuid"",
  ""buyerId"": ""uuid"",
  ""status"": ""placed"",
  ""totalAmount"": 99.99,
  ""shippingAddress"": ""123 Main St, City, Country"",
  ""lineItems"": [],
  ""createdAt"": ""2024-01-01T00:00:00Z"",
  ""updatedAt"": ""2024-01-01T00:00:00Z""
}
`

## Rollback Strategy

If issues arise during migration:

1. **Immediate Rollback**: Revert migration using 
pm run migration:revert
2. **Code Rollback**: Revert service code changes
3. **Data Integrity**: Old data remains intact in legacy fields

## Monitoring

Monitor the migration impact:

1. **Error Rates**: Watch for increased error rates in checkout endpoint
2. **Latency**: Monitor for increased response times
3. **Data Consistency**: Verify shipping_address is populated correctly

## Lessons Learned

### What Worked Well
- Nullable columns maintained backward compatibility
- Dual-write pattern prevented data loss
- Incremental migration steps reduced risk

### Potential Improvements
- Add automated data validation checks
- Implement feature flags for gradual rollout
- Add monitoring alerts for migration-related metrics

## References

- Blueprint Pattern: Expand-and-Contract Migrations
- TypeORM Migrations Documentation
