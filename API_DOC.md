# Upsell Engine API Documentation

## Table of Contents
1. [Overview](#overview)
2. [Authentication & Security](#authentication--security)
3. [Database Schema](#database-schema)
4. [API Endpoints](#api-endpoints)
5. [Data Models](#data-models)
6. [Security Constraints](#security-constraints)
7. [Rate Limiting](#rate-limiting)
8. [Error Handling](#error-handling)
9. [Best Practices](#best-practices)
10. [Development Guidelines](#development-guidelines)

## Overview

The Upsell Engine API is built with Next.js 14 App Router, Supabase for authentication and database, and follows RESTful principles with proper security constraints.

### Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase PostgreSQL
- **Authentication**: Supabase Auth
- **API**: Next.js API Routes
- **Security**: Row Level Security (RLS)
- **Validation**: Zod schemas

## Authentication & Security

### User Authentication Flow
```typescript
// All API routes require authentication
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Continue with authenticated user
}
```

### Role-Based Access Control
```typescript
// Check admin privileges
const isAdmin = await supabase.rpc('is_admin', { p_user_id: user.id })

if (!isAdmin) {
  return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
}
```

## Database Schema

### Core Tables

#### `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  company_name TEXT,
  website TEXT,
  phone TEXT,
  timezone TEXT DEFAULT 'UTC',
  language TEXT DEFAULT 'en',
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'starter', 'pro', 'enterprise')),
  plan_status TEXT DEFAULT 'active' CHECK (plan_status IN ('active', 'cancelled', 'suspended', 'trial')),
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  subscription_id TEXT,
  stripe_customer_id TEXT,
  settings JSONB DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  last_login_at TIMESTAMP WITH TIME ZONE,
  login_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `user_roles`
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user', 'viewer')),
  granted_by UUID REFERENCES profiles(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, role)
);
```

#### `products`
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  shopify_product_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2),
  compare_at_price DECIMAL(10,2),
  image_url TEXT,
  product_type TEXT,
  vendor TEXT,
  tags TEXT[],
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `campaigns`
```sql
CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  campaign_type TEXT NOT NULL CHECK (campaign_type IN ('popup', 'banner', 'modal', 'inline')),
  trigger_type TEXT DEFAULT 'page_load' CHECK (trigger_type IN ('page_load', 'scroll', 'time_delay', 'exit_intent')),
  trigger_delay INTEGER DEFAULT 0,
  trigger_scroll_percentage INTEGER DEFAULT 50,
  target_pages TEXT[],
  excluded_pages TEXT[],
  settings JSONB DEFAULT '{}',
  content JSONB DEFAULT '{}',
  rules JSONB DEFAULT '[]',
  performance_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `upsell_rules`
```sql
CREATE TABLE upsell_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('product_based', 'cart_value', 'customer_segment', 'time_based')),
  conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `templates`
```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('campaign', 'rule', 'content')),
  content JSONB NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## API Endpoints

### User Management

#### `GET /api/users`
- **Description**: Get current user profile
- **Authentication**: Required
- **Response**: User profile with roles

#### `PUT /api/users`
- **Description**: Update current user profile
- **Authentication**: Required
- **Body**: Partial user profile data
- **Response**: Updated user profile

#### `GET /api/admin/users`
- **Description**: Get all users (admin only)
- **Authentication**: Required
- **Authorization**: Admin role required
- **Response**: Array of user profiles

#### `POST /api/admin/users`
- **Description**: Create new user (admin only)
- **Authentication**: Required
- **Authorization**: Admin role required
- **Body**: User creation data
- **Response**: Created user profile

#### `PUT /api/admin/users/[id]`
- **Description**: Update user (admin only)
- **Authentication**: Required
- **Authorization**: Admin role required
- **Body**: User update data
- **Response**: Updated user profile

#### `DELETE /api/admin/users/[id]`
- **Description**: Deactivate user (admin only)
- **Authentication**: Required
- **Authorization**: Admin role required
- **Response**: Success message

### Product Management

#### `GET /api/products`
- **Description**: Get user's products
- **Authentication**: Required
- **Query Parameters**: 
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20)
  - `search`: Search term
  - `status`: Filter by status
- **Response**: Paginated products array

#### `POST /api/products`
- **Description**: Create new product
- **Authentication**: Required
- **Body**: Product data
- **Response**: Created product

#### `GET /api/products/[id]`
- **Description**: Get specific product
- **Authentication**: Required
- **Authorization**: Must own the product
- **Response**: Product details

#### `PUT /api/products/[id]`
- **Description**: Update product
- **Authentication**: Required
- **Authorization**: Must own the product
- **Body**: Product update data
- **Response**: Updated product

#### `DELETE /api/products/[id]`
- **Description**: Delete product
- **Authentication**: Required
- **Authorization**: Must own the product
- **Response**: Success message

### Campaign Management

#### `GET /api/campaigns`
- **Description**: Get user's campaigns
- **Authentication**: Required
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 20)
  - `status`: Filter by status
- **Response**: Paginated campaigns array

#### `POST /api/campaigns`
- **Description**: Create new campaign
- **Authentication**: Required
- **Body**: Campaign data
- **Response**: Created campaign

#### `GET /api/campaigns/[id]`
- **Description**: Get specific campaign
- **Authentication**: Required
- **Authorization**: Must own the campaign
- **Response**: Campaign details

#### `PUT /api/campaigns/[id]`
- **Description**: Update campaign
- **Authentication**: Required
- **Authorization**: Must own the campaign
- **Body**: Campaign update data
- **Response**: Updated campaign

#### `DELETE /api/campaigns/[id]`
- **Description**: Delete campaign
- **Authentication**: Required
- **Authorization**: Must own the campaign
- **Response**: Success message

#### `POST /api/campaigns/[id]/activate`
- **Description**: Activate campaign
- **Authentication**: Required
- **Authorization**: Must own the campaign
- **Response**: Updated campaign

#### `POST /api/campaigns/[id]/pause`
- **Description**: Pause campaign
- **Authentication**: Required
- **Authorization**: Must own the campaign
- **Response**: Updated campaign

### Upsell Rules

#### `GET /api/rules`
- **Description**: Get user's upsell rules
- **Authentication**: Required
- **Response**: Array of upsell rules

#### `POST /api/rules`
- **Description**: Create new upsell rule
- **Authentication**: Required
- **Body**: Rule data
- **Response**: Created rule

#### `GET /api/rules/[id]`
- **Description**: Get specific rule
- **Authentication**: Required
- **Authorization**: Must own the rule
- **Response**: Rule details

#### `PUT /api/rules/[id]`
- **Description**: Update rule
- **Authentication**: Required
- **Authorization**: Must own the rule
- **Body**: Rule update data
- **Response**: Updated rule

#### `DELETE /api/rules/[id]`
- **Description**: Delete rule
- **Authentication**: Required
- **Authorization**: Must own the rule
- **Response**: Success message

### Templates

#### `GET /api/templates`
- **Description**: Get user's templates and public templates
- **Authentication**: Required
- **Query Parameters**:
  - `type`: Filter by template type
  - `public`: Include public templates (default: true)
- **Response**: Array of templates

#### `POST /api/templates`
- **Description**: Create new template
- **Authentication**: Required
- **Body**: Template data
- **Response**: Created template

#### `GET /api/templates/[id]`
- **Description**: Get specific template
- **Authentication**: Required
- **Authorization**: Must own the template or template must be public
- **Response**: Template details

#### `PUT /api/templates/[id]`
- **Description**: Update template
- **Authentication**: Required
- **Authorization**: Must own the template
- **Body**: Template update data
- **Response**: Updated template

#### `DELETE /api/templates/[id]`
- **Description**: Delete template
- **Authentication**: Required
- **Authorization**: Must own the template
- **Response**: Success message

### Analytics & Performance

#### `GET /api/analytics/campaigns`
- **Description**: Get campaign performance metrics
- **Authentication**: Required
- **Query Parameters**:
  - `campaign_id`: Specific campaign ID
  - `date_from`: Start date (ISO string)
  - `date_to`: End date (ISO string)
- **Response**: Performance metrics

#### `GET /api/analytics/revenue`
- **Description**: Get revenue analytics
- **Authentication**: Required
- **Query Parameters**:
  - `date_from`: Start date (ISO string)
  - `date_to`: End date (ISO string)
  - `group_by`: Grouping (day, week, month)
- **Response**: Revenue data

#### `GET /api/analytics/conversions`
- **Description**: Get conversion analytics
- **Authentication**: Required
- **Query Parameters**:
  - `campaign_id`: Specific campaign ID
  - `date_from`: Start date (ISO string)
  - `date_to`: End date (ISO string)
- **Response**: Conversion data

## Data Models

### User Profile
```typescript
interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  company_name?: string;
  website?: string;
  phone?: string;
  timezone: string;
  language: string;
  plan_type: 'free' | 'starter' | 'pro' | 'enterprise';
  plan_status: 'active' | 'cancelled' | 'suspended' | 'trial';
  trial_ends_at?: string;
  subscription_id?: string;
  stripe_customer_id?: string;
  settings: Record<string, any>;
  preferences: Record<string, any>;
  last_login_at?: string;
  login_count: number;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
  roles: string[];
}
```

### Product
```typescript
interface Product {
  id: string;
  user_id: string;
  shopify_product_id?: string;
  title: string;
  description?: string;
  price?: number;
  compare_at_price?: number;
  image_url?: string;
  product_type?: string;
  vendor?: string;
  tags: string[];
  status: 'active' | 'inactive' | 'archived';
  created_at: string;
  updated_at: string;
}
```

### Campaign
```typescript
interface Campaign {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  campaign_type: 'popup' | 'banner' | 'modal' | 'inline';
  trigger_type: 'page_load' | 'scroll' | 'time_delay' | 'exit_intent';
  trigger_delay: number;
  trigger_scroll_percentage: number;
  target_pages: string[];
  excluded_pages: string[];
  settings: Record<string, any>;
  content: Record<string, any>;
  rules: any[];
  performance_metrics: Record<string, any>;
  created_at: string;
  updated_at: string;
}
```

### Upsell Rule
```typescript
interface UpsellRule {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  rule_type: 'product_based' | 'cart_value' | 'customer_segment' | 'time_based';
  conditions: Record<string, any>;
  actions: Record<string, any>;
  priority: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

## Security Constraints

### Row Level Security (RLS) Policies

#### Profiles Table
```sql
-- Users can view own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Users can update own profile
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role = 'admin' 
      AND is_active = TRUE
    )
  );
```

#### Products Table
```sql
-- Users can view own products
CREATE POLICY "Users can view own products" ON products
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert own products
CREATE POLICY "Users can insert own products" ON products
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update own products
CREATE POLICY "Users can update own products" ON products
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete own products
CREATE POLICY "Users can delete own products" ON products
  FOR DELETE USING (user_id = auth.uid());
```

#### Campaigns Table
```sql
-- Users can view own campaigns
CREATE POLICY "Users can view own campaigns" ON campaigns
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert own campaigns
CREATE POLICY "Users can insert own campaigns" ON campaigns
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update own campaigns
CREATE POLICY "Users can update own campaigns" ON campaigns
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete own campaigns
CREATE POLICY "Users can delete own campaigns" ON campaigns
  FOR DELETE USING (user_id = auth.uid());
```

### API Security Constraints

1. **Authentication Required**: All API endpoints require valid authentication
2. **User Isolation**: Users can only access their own data
3. **Admin Authorization**: Admin-only endpoints check for admin role
4. **Input Validation**: All inputs are validated using Zod schemas
5. **SQL Injection Prevention**: Use parameterized queries only
6. **Rate Limiting**: Implement rate limiting on all endpoints
7. **CORS**: Configure CORS properly for production

## Rate Limiting

### Implementation
```typescript
// Example rate limiting middleware
import { rateLimit } from '@/lib/rate-limit'

const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500
})

export async function GET(request: Request) {
  try {
    await limiter.check(request, 10, 'CACHE_TOKEN') // 10 requests per minute
  } catch {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }
  
  // Continue with request
}
```

### Rate Limits by Endpoint
- **Authentication endpoints**: 5 requests per minute
- **Read operations**: 100 requests per minute
- **Write operations**: 20 requests per minute
- **Admin operations**: 50 requests per minute
- **Analytics endpoints**: 30 requests per minute

## Error Handling

### Standard Error Response Format
```typescript
interface ApiError {
  error: string;
  message: string;
  code?: string;
  details?: any;
  timestamp: string;
}
```

### HTTP Status Codes
- `200`: Success
- `201`: Created
- `400`: Bad Request (validation error)
- `401`: Unauthorized (authentication required)
- `403`: Forbidden (authorization required)
- `404`: Not Found
- `409`: Conflict (duplicate resource)
- `422`: Unprocessable Entity (business logic error)
- `429`: Too Many Requests (rate limit exceeded)
- `500`: Internal Server Error

### Error Handling Example
```typescript
export async function GET(request: Request) {
  try {
    // API logic here
  } catch (error) {
    console.error('API Error:', error)
    
    if (error instanceof ZodError) {
      return NextResponse.json({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.errors,
        timestamp: new Date().toISOString()
      }, { status: 400 })
    }
    
    return NextResponse.json({
      error: 'Internal Server Error',
      message: 'Something went wrong',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
```

## Best Practices

### API Design
1. **Consistent Naming**: Use kebab-case for URLs, camelCase for JSON
2. **Versioning**: Include API version in URL path (`/api/v1/`)
3. **Pagination**: Always paginate list endpoints
4. **Filtering**: Support filtering and sorting on list endpoints
5. **Caching**: Implement proper caching headers
6. **Documentation**: Keep API documentation updated

### Security
1. **Input Validation**: Validate all inputs with Zod schemas
2. **Output Sanitization**: Sanitize all outputs
3. **Error Handling**: Don't expose sensitive information in errors
4. **Logging**: Log security events and errors
5. **Monitoring**: Monitor for suspicious activity

### Performance
1. **Database Queries**: Optimize database queries
2. **Caching**: Use Redis for caching
3. **Pagination**: Implement cursor-based pagination for large datasets
4. **Compression**: Enable gzip compression
5. **CDN**: Use CDN for static assets

## Development Guidelines

### Creating New API Endpoints

1. **File Structure**:
app/api/
├── v1/
│ ├── products/
│ │ ├── route.ts
│ │ └── [id]/
│ │ └── route.ts
│ └── campaigns/
│ ├── route.ts
│ └── [id]/
│ └── route.ts


2. **Template for New Endpoint**:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'

// Input validation schema
const CreateProductSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  // ... other fields
})

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // 2. Validate input
    const body = await request.json()
    const validatedData = CreateProductSchema.parse(body)
    
    // 3. Check business logic constraints
    // (e.g., plan limits, feature availability)
    
    // 4. Perform database operation
    const { data, error } = await supabase
      .from('products')
      .insert({
        ...validatedData,
        user_id: user.id
      })
      .select()
      .single()
    
    if (error) {
      throw error
    }
    
    // 5. Return success response
    return NextResponse.json(data, { status: 201 })
    
  } catch (error) {
    // 6. Handle errors
    console.error('API Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.errors
      }, { status: 400 })
    }
    
    return NextResponse.json({
      error: 'Internal Server Error',
      message: 'Something went wrong'
    }, { status: 500 })
  }
}
```

### Testing API Endpoints

1. **Unit Tests**: Test individual functions
2. **Integration Tests**: Test API endpoints
3. **E2E Tests**: Test complete user flows
4. **Load Tests**: Test performance under load

### Monitoring & Logging

1. **Application Logs**: Log all API requests and errors
2. **Performance Monitoring**: Monitor response times
3. **Error Tracking**: Track and alert on errors
4. **Usage Analytics**: Track API usage patterns

### Deployment

1. **Environment Variables**: Use proper environment configuration
2. **Database Migrations**: Run migrations before deployment
3. **Health Checks**: Implement health check endpoints
4. **Rollback Plan**: Have rollback procedures ready

---

This documentation should be updated as the API evolves. Keep it current with any changes to endpoints, data models, or security constraints.
