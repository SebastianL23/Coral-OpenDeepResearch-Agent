import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export const config = {
  database: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    schema: 'public'
  },
  test_user_id: process.env.TEST_USER_ID,
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
}; 