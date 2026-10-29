// Authoritative migration registry — single source of truth
// Do NOT rename deployed migrations without deployment audit; preserve backups.
export const MIGRATION_REGISTRY = [
  '1709999999999-Baseline',
  '1710000000001-AddShippingAddressToOrders',
  '1710000000002-BackfillShippingAddress',
  '1710000000003-AddOrderNumber',
  '1710000000004-AddUsersAndRefreshTokens',
  '1710000000005-AddFulfillmentOperationRecord', // Applied after CategoriesAndCatalogContract in deployed DB; different schema (fulfillment_operation_records table)
  '1710000000005-CategoriesAndCatalogContract', // Applied (15 applied); creates categories + products/backlinks
  '1710000000006-AddMissingForeignKeysAndIndexes',
  '1710000000007-AddProductDescriptionAndImages',
  '1710000000008-AddOrderNumberSequence',
  '1710000000009-AddPaymentAuthorizations',
  '1710000000010-BackfillProductCategory',
  '1710000000011-FixAuditEntityEnum',
  '1715000000000-AddReviewsTable',
  '1716000000000-AddRazorpayPaymentSupport',
  '1717000000000-AddWebhookEventIdempotency',
  '1749624000000-AddVendorApplicationTable',
  '20261010-customer-addresses',
  '20261012-vendor-link-safeguards',
  '20261013-AddPartialUniquePendingApplicantIndex',
  '20261013-AddVendorUserConstraints',
  '20261014-FixProductVendorIdColumn',
  '20261015-AddBuyerIdempotencyKeyConstraint',
  '20261015-AddOAuthIdentityTable',
  '20261016-AddPasswordResetTokens',
  '20261017-AddPromotionsTable',
  '20261027-AddVendorPaymentAccounts',
  '20261028-AddVendorPaymentLedger',
  '20261029-CreateRefundDisputeTables',
];

/* Idempotency check: 1710000000005 (categories applied, fulfillment pending) and 2026101300000 (vendor_applications created by 1749624000000; index + constraints pending). Duplicate suffixes are different schemas, not duplicate identities. */
export const DUPLICATE_TIMESTAMPS: string[] = [
  '1710000000005', // Different schema operations (categories + catalog contract vs fulfillment_operation_records). Not duplicate identities — both preserved.
  '2026101300000', // Different operations (vendor user constraints vs partial unique pending-applicant index). Not duplicate identities — both preserved.
];

export const DEPLOYED_AUDIT_NOTE = `15 applied migrations confirmed; pending: AddFulfillmentOperationRecord1710000000005, AddVendorApplicationTable1749624000000, AddPartialUniquePendingApplicantIndex2026101300000, AddVendorUserConstraints2026101300000. Preflight counts (vendor constraints): 0.`;

