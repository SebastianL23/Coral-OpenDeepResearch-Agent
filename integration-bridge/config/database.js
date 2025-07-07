/**
 * Database Configuration
 * Loads environment variables for Supabase connection
 */

import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

export const databaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_ROLE_KEY,
  schema: 'public'
};

export const agentConfigs = {
  coral: {
    id: 'coral-research-agent',
    type: 'coral',
    url: process.env.CORAL_AGENT_URL || 'http://localhost:8000',
    credentials: {
      // Add any Coral-specific credentials here
    },
    settings: {
      timeout: 30000,
      retries: 3
    }
  },
  upsell: {
    id: 'upsell-engine-agent',
    type: 'upsell',
    url: process.env.UPSELL_ENGINE_URL || 'http://localhost:3000',
    credentials: {
      // Add any UpsellEngine-specific credentials here
    },
    settings: {
      timeout: 30000,
      retries: 3
    }
  }
};

export const integrationConfig = {
  database: databaseConfig,
  agents: [agentConfigs.coral, agentConfigs.upsell],
  workflows: {},
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: 'json'
  }
};

// Validate required environment variables
function validateConfig() {
  const required = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Export validation function
export { validateConfig }; 