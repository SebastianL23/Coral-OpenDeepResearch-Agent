/**
 * Production Orchestrator for Coral + UpsellEngine Integration
 * Coordinates all components for production use
 */

import { createClient } from '@supabase/supabase-js';
import { CoralInsightsEngine } from './coral-insights-engine.js';
import { UpsellEngineManager } from './upsell-engine-manager.js';
import { AIAssistant } from './ai-assistant.js';

class ProductionOrchestrator {
  constructor(config) {
    this.config = config;
    this.supabase = createClient(config.database.url, config.database.key);
    
    // Initialize components
    this.coralEngine = new CoralInsightsEngine(config);
    this.upsellManager = new UpsellEngineManager(config);
    this.aiAssistant = new AIAssistant(config);
    
    this.isRunning = false;
    this.scheduledJobs = new Map();
    
    this.logger = {
      info: (message, data = {}) => console.log(`[PRODUCTION ORCHESTRATOR] ${message}`, data),
      warn: (message, data = {}) => console.warn(`[PRODUCTION ORCHESTRATOR] ${message}`, data),
      error: (message, data = {}) => console.error(`[PRODUCTION ORCHESTRATOR] ${message}`, data),
      debug: (message, data = {}) => {
        if (config.logging?.level === 'debug') {
          console.log(`[PRODUCTION ORCHESTRATOR DEBUG] ${message}`, data);
        }
      }
    };
  }

  /**
   * Initialize the production orchestrator
   */
  async initialize() {
    try {
      this.logger.info('Initializing Production Orchestrator');
      
      // Test database connection
      await this.testDatabaseConnection();
      
      // Initialize components
      await Promise.all([
        this.coralEngine.initialize(),
        this.upsellManager.initialize()
      ]);
      
      this.isRunning = true;
      this.logger.info('Production Orchestrator initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Production Orchestrator', { error: error.message });
      throw error;
    }
  }

  /**
   * Test database connection
   */
  async testDatabaseConnection() {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('id')
        .limit(1);

      if (error) throw error;
      
      this.logger.debug('Database connection test successful');
    } catch (error) {
      this.logger.error('Database connection test failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Start scheduled jobs
   */
  async startScheduledJobs() {
    try {
      this.logger.info('Starting scheduled jobs');
      
      // Daily insight generation
      this.scheduleJob('daily-insights', '0 2 * * *', () => this.generateDailyInsights());
      
      // Weekly performance analysis
      this.scheduleJob('weekly-analysis', '0 3 * * 0', () => this.generateWeeklyAnalysis());
      
      // Monthly optimization
      this.scheduleJob('monthly-optimization', '0 4 1 * *', () => this.runMonthlyOptimization());
      
      this.logger.info('Scheduled jobs started');
    } catch (error) {
      this.logger.error('Failed to start scheduled jobs', { error: error.message });
      throw error;
    }
  }

  /**
   * Schedule a job
   */
  scheduleJob(name, cronExpression, jobFunction) {
    // In production, you'd use a proper job scheduler like node-cron
    // For now, we'll simulate with setInterval
    const interval = this.parseCronToInterval(cronExpression);
    
    const job = setInterval(async () => {
      try {
        this.logger.info(`Running scheduled job: ${name}`);
        await jobFunction();
        this.logger.info(`Completed scheduled job: ${name}`);
      } catch (error) {
        this.logger.error(`Scheduled job failed: ${name}`, { error: error.message });
      }
    }, interval);
    
    this.scheduledJobs.set(name, job);
    this.logger.debug(`Scheduled job: ${name} (${cronExpression})`);
  }

  /**
   * Parse cron expression to interval (simplified)
   */
  parseCronToInterval(cronExpression) {
    // Simplified cron parser - in production use a proper library
    const parts = cronExpression.split(' ');
    
    if (parts[0] === '0' && parts[1] === '2' && parts[2] === '*' && parts[3] === '*' && parts[4] === '*') {
      return 24 * 60 * 60 * 1000; // Daily
    } else if (parts[0] === '0' && parts[1] === '3' && parts[2] === '*' && parts[3] === '*' && parts[4] === '0') {
      return 7 * 24 * 60 * 60 * 1000; // Weekly
    } else if (parts[0] === '0' && parts[1] === '4' && parts[2] === '1' && parts[3] === '*' && parts[4] === '*') {
      return 30 * 24 * 60 * 60 * 1000; // Monthly
    }
    
    return 60 * 60 * 1000; // Default: hourly
  }

  /**
   * Generate daily insights for all users
   */
  async generateDailyInsights() {
    try {
      this.logger.info('Starting daily insight generation');
      
      // Get all active users
      const { data: users, error } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true);

      if (error) throw error;

      const results = {
        users_processed: 0,
        insights_generated: 0,
        rules_created: 0,
        campaigns_created: 0,
        errors: []
      };

      for (const user of users) {
        try {
          const userResults = await this.processUserInsights(user.id);
          
          results.users_processed++;
          results.insights_generated += userResults.insights_generated;
          results.rules_created += userResults.rules_created;
          results.campaigns_created += userResults.campaigns_created;
        } catch (error) {
          this.logger.error(`Failed to process insights for user ${user.id}`, { error: error.message });
          results.errors.push({ user_id: user.id, error: error.message });
        }
      }

      this.logger.info('Daily insight generation completed', results);
      return results;
    } catch (error) {
      this.logger.error('Daily insight generation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate weekly analysis
   */
  async generateWeeklyAnalysis() {
    try {
      this.logger.info('Starting weekly analysis');
      
      // Get all active users
      const { data: users, error } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true);

      if (error) throw error;

      const results = {
        users_processed: 0,
        analyses_completed: 0,
        optimizations_applied: 0,
        errors: []
      };

      for (const user of users) {
        try {
          const analysis = await this.aiAssistant.assistWithPerformanceAnalysis(user.id, {
            analysis_type: 'comprehensive',
            time_period: '7d',
            metrics: ['revenue', 'conversion_rate', 'aov']
          });
          
          results.users_processed++;
          results.analyses_completed++;
          
          // Apply optimizations if recommended
          if (analysis.recommendations.length > 0) {
            const optimization = await this.aiAssistant.assistWithOptimization(user.id, {
              target_type: 'all',
              optimization_goal: 'performance_improvement'
            });
            
            results.optimizations_applied += optimization.optimizations_applied;
          }
        } catch (error) {
          this.logger.error(`Failed to process weekly analysis for user ${user.id}`, { error: error.message });
          results.errors.push({ user_id: user.id, error: error.message });
        }
      }

      this.logger.info('Weekly analysis completed', results);
      return results;
    } catch (error) {
      this.logger.error('Weekly analysis failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Run monthly optimization
   */
  async runMonthlyOptimization() {
    try {
      this.logger.info('Starting monthly optimization');
      
      // Get all active users
      const { data: users, error } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true);

      if (error) throw error;

      const results = {
        users_processed: 0,
        optimizations_applied: 0,
        performance_improvements: [],
        errors: []
      };

      for (const user of users) {
        try {
          const optimization = await this.aiAssistant.assistWithOptimization(user.id, {
            target_type: 'all',
            optimization_goal: 'maximize_revenue'
          });
          
          results.users_processed++;
          results.optimizations_applied += optimization.optimizations_applied;
          results.performance_improvements.push({
            user_id: user.id,
            improvement: optimization.performance_improvement
          });
        } catch (error) {
          this.logger.error(`Failed to process monthly optimization for user ${user.id}`, { error: error.message });
          results.errors.push({ user_id: user.id, error: error.message });
        }
      }

      this.logger.info('Monthly optimization completed', results);
      return results;
    } catch (error) {
      this.logger.error('Monthly optimization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Process insights for a specific user
   */
  async processUserInsights(user_id) {
    try {
      // Generate insights
      const insights = await this.coralEngine.generateUpsellInsights({
        user_id,
        time_period: '30d',
        insight_types: ['bundle', 'trend', 'segment', 'performance']
      });

      // Process insights with UpsellEngine
      const results = await this.upsellManager.processCoralInsights(insights, user_id);

      return {
        insights_generated: insights.length,
        rules_created: results.rules_created,
        campaigns_created: results.campaigns_created,
        errors: results.errors
      };
    } catch (error) {
      this.logger.error(`Failed to process insights for user ${user_id}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Handle real-time upsell evaluation
   */
  async evaluateUpsells(cartItems, sessionId, user_id, timeContext = {}) {
    try {
      this.logger.debug('Evaluating upsells in real-time', { sessionId, user_id });
      
      const offer = await this.upsellManager.evaluateUpsells(cartItems, sessionId, user_id, timeContext);
      
      return offer;
    } catch (error) {
      this.logger.error('Real-time upsell evaluation failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Handle AI assistant requests
   */
  async handleAssistantRequest(user_id, request) {
    try {
      this.logger.info('Handling AI assistant request', { user_id, request_type: request.type });
      
      const result = await this.aiAssistant.assistUser(user_id, request);
      
      return result;
    } catch (error) {
      this.logger.error('AI assistant request failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Get system status
   */
  async getSystemStatus() {
    try {
      const status = {
        is_running: this.isRunning,
        scheduled_jobs: Array.from(this.scheduledJobs.keys()),
        database_connected: false,
        components_status: {
          coral_engine: false,
          upsell_manager: false,
          ai_assistant: false
        },
        last_insight_generation: null,
        last_optimization: null,
        active_users: 0,
        total_rules: 0,
        total_campaigns: 0
      };

      // Check database connection
      try {
        const { data, error } = await this.supabase
          .from('profiles')
          .select('id')
          .limit(1);
        
        if (!error) {
          status.database_connected = true;
        }
      } catch (error) {
        this.logger.warn('Database connection check failed', { error: error.message });
      }

      // Check component status
      status.components_status.coral_engine = this.coralEngine.isInitialized;
      status.components_status.upsell_manager = true; // Always true if initialized
      status.components_status.ai_assistant = true; // Always true if initialized

      // Get system metrics
      try {
        const [usersResult, rulesResult, campaignsResult] = await Promise.all([
          this.supabase.from('profiles').select('id', { count: 'exact' }).eq('is_active', true),
          this.supabase.from('upsell_rules').select('id', { count: 'exact' }).eq('status', 'active'),
          this.supabase.from('campaigns').select('id', { count: 'exact' }).eq('status', 'active')
        ]);

        status.active_users = usersResult.count || 0;
        status.total_rules = rulesResult.count || 0;
        status.total_campaigns = campaignsResult.count || 0;
      } catch (error) {
        this.logger.warn('Failed to get system metrics', { error: error.message });
      }

      return status;
    } catch (error) {
      this.logger.error('Failed to get system status', { error: error.message });
      throw error;
    }
  }

  /**
   * Stop the orchestrator
   */
  async stop() {
    try {
      this.logger.info('Stopping Production Orchestrator');
      
      // Stop scheduled jobs
      for (const [name, job] of this.scheduledJobs) {
        clearInterval(job);
        this.logger.debug(`Stopped scheduled job: ${name}`);
      }
      this.scheduledJobs.clear();
      
      this.isRunning = false;
      this.logger.info('Production Orchestrator stopped');
    } catch (error) {
      this.logger.error('Failed to stop Production Orchestrator', { error: error.message });
      throw error;
    }
  }

  /**
   * Initialize UpsellEngine manager (placeholder)
   */
  async initialize() {
    // This would be implemented in the UpsellEngineManager
    return Promise.resolve();
  }
}

export { ProductionOrchestrator }; 