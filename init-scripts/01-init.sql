-- ============================================
-- PostgreSQL Initialization Script
-- Phase 10 Implementation
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Set timezone
SET TimeZone = 'UTC';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE marketplace TO postgres;

-- Create extensions in the database
\c marketplace;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";