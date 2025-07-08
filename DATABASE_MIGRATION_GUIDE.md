# Database Migration Guide

## Problem Solved

The error you encountered:
```
ERROR: 42804: foreign key constraint "fk_upsell_rules_target_products" cannot be implemented
DETAIL: Key columns "target_products" and "id" are of incompatible types: text[] and uuid.
```

This occurred because you can't create a foreign key constraint between a `text[]` array column and a `uuid` column in PostgreSQL.

## Solution: Junction Tables

Instead of using array columns, we've created proper junction tables for many-to-many relationships:

### New Tables Created

1. **`upsell_rule_products`** - Links rules to their target products
2. **`campaign_trigger_products`** - Links campaigns to their trigger products  
3. **`campaign_upsell_products`** - Links campaigns to their upsell products

## Migration Steps

### Step 1: Run the Database Schema Fix

Execute the SQL script in your Supabase SQL editor:

```sql
-- Copy and paste the entire contents of database-schema-fix.sql
```

This script will:
- Create the new junction tables
- Add proper indexes for performance
- Migrate existing data (if any)
- Create helper functions
- Set up Row Level Security (RLS)
- Create backward-compatible views

### Step 2: Verify the Migration

Run these verification queries:

```sql
-- Check if junction tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN (
  'upsell_rule_products', 
  'campaign_trigger_products', 
  'campaign_upsell_products'
);

-- Check if helper functions were created
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN (
  'get_rule_target_products',
  'get_campaign_trigger_products', 
  'get_campaign_upsell_products'
);

-- Test the helper functions
SELECT get_rule_target_products(ur.id) as target_products
FROM upsell_rules ur 
LIMIT 1;
```

### Step 3: Update Your Application Code

The Coral Agent code has been updated to work with the new structure. The changes are:

1. **Rule Creation**: Now inserts into `upsell_rule_products` junction table
2. **Campaign Creation**: Now inserts into `campaign_trigger_products` and `campaign_upsell_products`
3. **Data Retrieval**: Uses helper functions to get product arrays
4. **Similarity Checks**: Updated to work with junction tables

## What Changed

### Before (Array Columns)
```sql
-- This caused the foreign key constraint error
CREATE TABLE upsell_rules (
  id UUID PRIMARY KEY,
  target_products TEXT[], -- ❌ Can't create FK constraint on array
  -- ... other columns
);
```

### After (Junction Tables)
```sql
-- Main table without array columns
CREATE TABLE upsell_rules (
  id UUID PRIMARY KEY,
  -- ... other columns (no target_products array)
);

-- Junction table for many-to-many relationship
CREATE TABLE upsell_rule_products (
  id UUID PRIMARY KEY,
  rule_id UUID REFERENCES upsell_rules(id),
  product_id UUID REFERENCES products(id),
  UNIQUE(rule_id, product_id)
);
```

## Benefits of the New Structure

### 1. **Proper Foreign Key Constraints**
- Validates that all product IDs exist
- Maintains referential integrity
- Prevents orphaned references

### 2. **Better Performance**
- Indexed foreign keys for fast lookups
- Efficient queries with proper joins
- Reduced data duplication

### 3. **Scalability**
- No array size limitations
- Better query optimization
- Easier to add additional metadata

### 4. **Data Integrity**
- Enforces product existence
- Cascading deletes work properly
- No invalid product references

## Helper Functions

The migration creates these helper functions for backward compatibility:

### `get_rule_target_products(rule_uuid)`
Returns an array of product IDs for a given rule.

### `get_campaign_trigger_products(campaign_uuid)`
Returns an array of product IDs that trigger a given campaign.

### `get_campaign_upsell_products(campaign_uuid)`
Returns an array of product IDs that are upsells for a given campaign.

## Backward Compatible Views

The migration creates views that maintain the old interface:

### `upsell_rules_with_products`
Shows rules with their target products as an array (like the old structure).

### `campaigns_with_products`
Shows campaigns with their trigger and upsell products as arrays.

## Testing the Migration

### 1. Test Helper Functions
```sql
-- Test rule products
SELECT get_rule_target_products(ur.id) as target_products
FROM upsell_rules ur 
LIMIT 1;

-- Test campaign products
SELECT 
  get_campaign_trigger_products(c.id) as trigger_products,
  get_campaign_upsell_products(c.id) as upsell_products
FROM campaigns c 
LIMIT 1;
```

### 2. Test Views
```sql
-- Test backward compatible views
SELECT * FROM upsell_rules_with_products LIMIT 1;
SELECT * FROM campaigns_with_products LIMIT 1;
```

### 3. Test Junction Tables
```sql
-- Check junction table data
SELECT 
  'upsell_rule_products' as table_name,
  COUNT(*) as record_count
FROM upsell_rule_products
UNION ALL
SELECT 
  'campaign_trigger_products' as table_name,
  COUNT(*) as record_count
FROM campaign_trigger_products
UNION ALL
SELECT 
  'campaign_upsell_products' as table_name,
  COUNT(*) as record_count
FROM campaign_upsell_products;
```

## Rollback Plan

If you need to rollback (not recommended), you can:

1. **Drop the new tables**:
```sql
DROP TABLE IF EXISTS upsell_rule_products;
DROP TABLE IF EXISTS campaign_trigger_products;
DROP TABLE IF EXISTS campaign_upsell_products;
```

2. **Drop the helper functions**:
```sql
DROP FUNCTION IF EXISTS get_rule_target_products(UUID);
DROP FUNCTION IF EXISTS get_campaign_trigger_products(UUID);
DROP FUNCTION IF EXISTS get_campaign_upsell_products(UUID);
```

3. **Drop the views**:
```sql
DROP VIEW IF EXISTS upsell_rules_with_products;
DROP VIEW IF EXISTS campaigns_with_products;
```

## Next Steps

1. **Run the migration script** in your Supabase SQL editor
2. **Verify the migration** using the test queries above
3. **Update your application** to use the new Coral Agent code
4. **Test the integration** with your upsell tool
5. **Monitor the logs** for any validation warnings

## Support

If you encounter any issues:

1. Check the Supabase logs for SQL errors
2. Verify all tables and functions were created
3. Test the helper functions manually
4. Check the Coral Agent logs for validation warnings

The new structure is more robust and will prevent the foreign key constraint issues you were experiencing! 