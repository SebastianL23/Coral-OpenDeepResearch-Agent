# Product ID Integration Update

## Overview

The Coral Agent has been updated to properly handle provided product IDs instead of generating new UUIDs. This ensures that upsell rules and campaigns reference actual products in your system rather than creating new, disconnected entities.

## Problem Solved

**Before**: The Coral Agent was generating UUIDs like `7384c976-3f16-4752-9159-68a9b2ce22e4` and `abd91f10-1bd6-4d31-8726-04c70368dfc0` instead of using your actual product IDs.

**After**: The Coral Agent now properly validates and uses provided product IDs, ensuring consistency with your existing product catalog.

## Key Changes

### 1. Product ID Validation (`coral-insights-engine.js`)

Added comprehensive product ID validation:

```javascript
/**
 * Validate and normalize product IDs
 */
async validateProductIds(productIds, user_id) {
  // Validates product IDs against the database
  // Accepts both UUID and non-UUID formats
  // Returns only valid, existing product IDs
}
```

### 2. Enhanced Rule ID Generation

Updated rule ID generation to use actual product IDs:

```javascript
/**
 * Generate a rule ID based on product ID or timestamp
 */
generateRuleId(productId, prefix = 'rule') {
  if (productId && this.isValidProductId(productId)) {
    return `${prefix}-${productId}`;
  }
  return `${prefix}-${Date.now()}`;
}
```

### 3. Product ID Validation in Upsell Engine (`upsell-engine-manager.js`)

Added validation before creating rules and campaigns:

```javascript
/**
 * Validate product IDs against the database
 */
async validateProductIds(productIds, user_id) {
  // Checks if products exist in the database
  // Returns only valid product IDs
}
```

### 4. Improved Action Generation

Updated action generation methods to properly handle product IDs:

- `generateUpsellActions()` - Uses validated product IDs for bundle opportunities
- `generateSegmentActions()` - Uses validated product IDs for customer segments
- `getRecommendedProducts()` - Returns actual product IDs instead of empty arrays

## How to Use

### Option 1: Include Product IDs in API Calls (Recommended)

When calling the Coral Agent, include your actual product IDs:

```javascript
const coralRequest = {
  user_id: "your-user-id",
  products: [
    {
      id: "your-actual-product-id",  // Include this
      title: "Product Name",
      price: 29.99,
      // ... other product data
    }
  ],
  time_period: "30d",
  insight_types: ["bundle", "segment"]
};
```

### Option 2: Let the System Validate Existing IDs

If you have existing product IDs in your database, the system will automatically validate them:

```javascript
const coralRequest = {
  user_id: "your-user-id",
  time_period: "30d",
  insight_types: ["bundle", "segment"]
  // System will fetch and validate products from database
};
```

## Validation Logic

### Product ID Format Detection

The system distinguishes between different product ID formats:

1. **UUID Format** (`7384c976-3f16-4752-9159-68a9b2ce22e4`) - Treated as generated IDs
2. **Non-UUID Format** (`prod_123456789`, `shopify_123`) - Treated as real product IDs
3. **Database Validation** - All IDs are validated against the products table

### Validation Process

1. **Format Check**: Determines if ID is UUID or non-UUID format
2. **Database Check**: Verifies product exists in database for the user
3. **User Ownership**: Ensures product belongs to the requesting user
4. **Return Valid IDs**: Only returns IDs that pass all validation steps

## Benefits

### 1. **Consistency**
- Rules and campaigns reference actual products
- No orphaned or disconnected entities
- Better integration with existing systems

### 2. **Traceability**
- Track which products are used in upsells
- Link insights back to specific products
- Better analytics and reporting

### 3. **Performance**
- No need for additional lookups
- Reduced database queries
- Faster rule evaluation

### 4. **Data Integrity**
- Validated product references
- Prevents broken links
- Maintains referential integrity

## Migration Notes

### For Existing Rules

If you have existing rules with generated UUIDs:

1. **Audit**: Review existing rules to identify which should use product IDs
2. **Update**: Modify your upsell tool to include product IDs in future calls
3. **Test**: Verify that new rules use actual product IDs
4. **Monitor**: Check logs for validation warnings

### For New Implementations

1. **Include Product IDs**: Always include `id` field in product data
2. **Validate Format**: Ensure product IDs are in your expected format
3. **Test Integration**: Use the provided test script to verify functionality

## Testing

Use the provided test script to verify the integration:

```bash
node test-product-id-integration.js
```

The test script demonstrates:
- Product ID validation
- Rule ID generation
- Insight generation with/without product IDs
- Error handling

## Logging

The system now provides detailed logging for product ID handling:

```
[CORAL INSIGHTS] Validated provided products { provided_count: 2, validated_count: 2 }
[CORAL INSIGHTS DEBUG] Generating upsell actions { primary_id: "prod_123", secondary_id: "prod_456" }
[UPSELL ENGINE] Validated product ID { product_id: "prod_123" }
[UPSELL ENGINE] Created upsell rule { rule_id: "rule_prod_123", target_products: ["prod_456"] }
```

## Error Handling

The system gracefully handles various error scenarios:

- **Invalid Product IDs**: Logged as warnings, excluded from results
- **Missing Products**: Logged as warnings, fallback to generated IDs
- **Database Errors**: Logged as errors, fallback behavior
- **Validation Failures**: Detailed error messages with context

## Configuration

No additional configuration is required. The system automatically:

- Detects product ID formats
- Validates against your database
- Falls back to generated IDs when needed
- Logs all validation activities

## Next Steps

1. **Update Your Upsell Tool**: Include product IDs in API calls
2. **Test the Integration**: Use the provided test script
3. **Monitor Logs**: Check for validation warnings
4. **Review Existing Rules**: Consider migrating old rules if needed

## Support

If you encounter issues:

1. Check the logs for validation warnings
2. Verify product IDs exist in your database
3. Ensure product IDs belong to the correct user
4. Test with the provided test script

The system is designed to be backward compatible, so existing functionality will continue to work while new calls can take advantage of the improved product ID handling. 