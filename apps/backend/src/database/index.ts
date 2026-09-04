/**
 * Database Migrations
 * 
 * This directory contains TypeORM migrations for the Marketplace Order & Fulfillment System.
 * Migrations follow the expand-and-contract pattern for zero-downtime deployments.
 */

export * from './migrations/datasource';
export * from './migrations/1710000000001-AddShippingAddressToOrders';
export * from './migrations/1710000000002-BackfillShippingAddress';