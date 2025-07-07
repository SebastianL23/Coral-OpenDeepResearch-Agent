/**
 * Main Orchestrator for Coral + UpsellEngine Integration
 * Coordinates communication and data flow between agents
 */

import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';
import { CoralAdapter } from './coral-adapter.js';
import { UpsellAdapter } from './upsell-adapter.js';
import { DataProcessor } from './data-processor.js';
import { 
  IntegrationWorkflowSchema, 
  AgentRequestSchema,
  validateData 
} from '../shared/schemas.js';

class IntegrationOrchestrator {
  constructor(config) {
    this.config = config;
    this.supabase = createClient(config.database.url, config.database.key);
    
    // Create adapters with full config including database
    const coralConfig = config.agents.find(a => a.type === 'coral');
    const upsellConfig = config.agents.find(a => a.type === 'upsell');
    
    this.coralAdapter = new CoralAdapter({
      ...coralConfig,
      database: config.database
    });
    this.upsellAdapter = new UpsellAdapter({
      ...upsellConfig,
      database: config.database
    });
    
    this.dataProcessor = new DataProcessor();
    this.workflows = new Map();
    this.isRunning = false;
    
    this.logger = {
      info: (message, data = {}) => console.log(`[INFO] ${message}`, data),
      warn: (message, data = {}) => console.warn(`[WARN] ${message}`, data),
      error: (message, data = {}) => console.error(`[ERROR] ${message}`, data),
      debug: (message, data = {}) => {
        if (config.logging.level === 'debug') {
          console.log(`[DEBUG] ${message}`, data);
        }
      }
    };
  }

  /**
   * Initialize the orchestrator
   */
  async initialize() {
    try {
      this.logger.info('Initializing Integration Orchestrator');
      
      // Initialize adapters
      await this.coralAdapter.initialize();
      await this.upsellAdapter.initialize();
      
      // Load active workflows
      await this.loadWorkflows();
      
      this.logger.info('Orchestrator initialized successfully');
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize orchestrator', { error: error.message });
      throw error;
    }
  }

  /**
   * Load active workflows from database
   */
  async loadWorkflows() {
    try {
      const { data: workflows, error } = await this.supabase
        .from('integration_workflows')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;

      workflows.forEach(workflow => {
        const validation = validateData(IntegrationWorkflowSchema, workflow);
        if (validation.success) {
          this.workflows.set(workflow.id, validation.data);
          this.logger.info(`Loaded workflow: ${workflow.name}`);
        } else {
          this.logger.warn(`Invalid workflow schema: ${workflow.name}`, validation.errors);
        }
      });

      this.logger.info(`Loaded ${workflows.length} active workflows`);
    } catch (error) {
      this.logger.error('Failed to load workflows', { error: error.message });
      throw error;
    }
  }

  /**
   * Start the orchestrator
   */
  async start() {
    if (this.isRunning) {
      this.logger.warn('Orchestrator is already running');
      return;
    }

    try {
      this.logger.info('Starting Integration Orchestrator');
      this.isRunning = true;

      // Start workflow execution loop
      this.workflowLoop = setInterval(() => {
        this.executeWorkflows();
      }, 30000); // Check every 30 seconds

      // Start scheduled workflows
      this.scheduledLoop = setInterval(() => {
        this.executeScheduledWorkflows();
      }, 60000); // Check every minute

      this.logger.info('Orchestrator started successfully');
    } catch (error) {
      this.logger.error('Failed to start orchestrator', { error: error.message });
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the orchestrator
   */
  async stop() {
    if (!this.isRunning) {
      this.logger.warn('Orchestrator is not running');
      return;
    }

    try {
      this.logger.info('Stopping Integration Orchestrator');
      this.isRunning = false;

      if (this.workflowLoop) {
        clearInterval(this.workflowLoop);
      }
      if (this.scheduledLoop) {
        clearInterval(this.scheduledLoop);
      }

      this.logger.info('Orchestrator stopped successfully');
    } catch (error) {
      this.logger.error('Failed to stop orchestrator', { error: error.message });
      throw error;
    }
  }

  /**
   * Execute active workflows
   */
  async executeWorkflows() {
    if (!this.isRunning) return;

    for (const [workflowId, workflow] of this.workflows) {
      try {
        if (workflow.trigger_type === 'event_based') {
          // Check for pending events
          await this.checkForEvents(workflow);
        }
      } catch (error) {
        this.logger.error(`Error executing workflow ${workflow.name}`, { 
          workflowId, 
          error: error.message 
        });
        await this.updateWorkflowStatus(workflowId, 'error', error.message);
      }
    }
  }

  /**
   * Execute scheduled workflows
   */
  async executeScheduledWorkflows() {
    if (!this.isRunning) return;

    const now = new Date();
    
    for (const [workflowId, workflow] of this.workflows) {
      try {
        if (workflow.trigger_type === 'scheduled') {
          const shouldExecute = this.shouldExecuteScheduledWorkflow(workflow, now);
          if (shouldExecute) {
            await this.executeWorkflow(workflow);
          }
        }
      } catch (error) {
        this.logger.error(`Error executing scheduled workflow ${workflow.name}`, { 
          workflowId, 
          error: error.message 
        });
        await this.updateWorkflowStatus(workflowId, 'error', error.message);
      }
    }
  }

  /**
   * Check if scheduled workflow should execute
   */
  shouldExecuteScheduledWorkflow(workflow, now) {
    const config = workflow.trigger_config;
    const lastExecution = workflow.last_execution?.timestamp;
    
    if (!lastExecution) return true;

    const lastExec = new Date(lastExecution);
    const interval = config.interval || 3600000; // Default 1 hour
    const nextExec = new Date(lastExec.getTime() + interval);

    return now >= nextExec;
  }

  /**
   * Execute a specific workflow
   */
  async executeWorkflow(workflow) {
    const executionId = uuidv4();
    this.logger.info(`Executing workflow: ${workflow.name}`, { executionId });

    try {
      // Update workflow status
      await this.updateWorkflowStatus(workflow.id, 'processing');

      // Execute workflow steps in order
      const results = [];
      for (const step of workflow.steps.sort((a, b) => a.order - b.order)) {
        try {
          const result = await this.executeWorkflowStep(step, workflow);
          results.push({ stepId: step.id, success: true, data: result });
        } catch (error) {
          results.push({ stepId: step.id, success: false, error: error.message });
          this.logger.error(`Step ${step.name} failed`, { stepId: step.id, error: error.message });
          
          // Check if workflow should continue on step failure
          if (step.config.continue_on_failure !== true) {
            throw error;
          }
        }
      }

      // Update workflow status
      const hasErrors = results.some(r => !r.success);
      const status = hasErrors ? 'partial' : 'success';
      await this.updateWorkflowStatus(workflow.id, status, null, results);

      this.logger.info(`Workflow ${workflow.name} completed`, { 
        executionId, 
        status, 
        resultsCount: results.length 
      });

      return results;
    } catch (error) {
      await this.updateWorkflowStatus(workflow.id, 'error', error.message);
      throw error;
    }
  }

  /**
   * Execute a single workflow step
   */
  async executeWorkflowStep(step, workflow) {
    this.logger.debug(`Executing step: ${step.name}`, { stepId: step.id, agent: step.agent });

    switch (step.agent) {
      case 'coral':
        return await this.executeCoralStep(step, workflow);
      case 'upsell':
        return await this.executeUpsellStep(step, workflow);
      default:
        throw new Error(`Unknown agent type: ${step.agent}`);
    }
  }

  /**
   * Execute a Coral agent step
   */
  async executeCoralStep(step, workflow) {
    const { action, config } = step;

    switch (action) {
      case 'analyze_bundle_opportunities':
        return await this.coralAdapter.analyzeBundleOpportunities(config);
      
      case 'analyze_trends':
        return await this.coralAdapter.analyzeTrends(config);
      
      case 'analyze_customer_segments':
        return await this.coralAdapter.analyzeCustomerSegments(config);
      
      case 'generate_insights':
        return await this.coralAdapter.generateInsights(config);
      
      default:
        throw new Error(`Unknown Coral action: ${action}`);
    }
  }

  /**
   * Execute an UpsellEngine step
   */
  async executeUpsellStep(step, workflow) {
    const { action, config } = step;

    switch (action) {
      case 'create_rule':
        return await this.upsellAdapter.createRule(config);
      
      case 'create_campaign':
        return await this.upsellAdapter.createCampaign(config);
      
      case 'update_rule':
        return await this.upsellAdapter.updateRule(config);
      
      case 'activate_campaign':
        return await this.upsellAdapter.activateCampaign(config);
      
      case 'get_performance_metrics':
        return await this.upsellAdapter.getPerformanceMetrics(config);
      
      default:
        throw new Error(`Unknown UpsellEngine action: ${action}`);
    }
  }

  /**
   * Check for pending events
   */
  async checkForEvents(workflow) {
    const { data: events, error } = await this.supabase
      .from('agent_requests')
      .select('*')
      .eq('type', workflow.trigger_config.event_type)
      .eq('status', 'pending')
      .limit(10);

    if (error) throw error;

    for (const event of events) {
      try {
        await this.executeWorkflow(workflow);
        await this.markEventProcessed(event.id);
      } catch (error) {
        this.logger.error(`Failed to process event ${event.id}`, { error: error.message });
      }
    }
  }

  /**
   * Mark event as processed
   */
  async markEventProcessed(eventId) {
    const { error } = await this.supabase
      .from('agent_requests')
      .update({ status: 'completed' })
      .eq('id', eventId);

    if (error) throw error;
  }

  /**
   * Update workflow status
   */
  async updateWorkflowStatus(workflowId, status, errorMessage = null, results = null) {
    const updateData = {
      status,
      last_execution: {
        timestamp: new Date().toISOString(),
        status,
        error_message: errorMessage,
        results
      }
    };

    const { error } = await this.supabase
      .from('integration_workflows')
      .update(updateData)
      .eq('id', workflowId);

    if (error) throw error;
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(workflowData) {
    const validation = validateData(IntegrationWorkflowSchema, workflowData);
    if (!validation.success) {
      throw new Error(`Invalid workflow data: ${JSON.stringify(validation.errors)}`);
    }

    const { data, error } = await this.supabase
      .from('integration_workflows')
      .insert(workflowData)
      .select()
      .single();

    if (error) throw error;

    this.workflows.set(data.id, data);
    this.logger.info(`Created workflow: ${data.name}`);
    return data;
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(workflowId, updates) {
    const { data, error } = await this.supabase
      .from('integration_workflows')
      .update(updates)
      .eq('id', workflowId)
      .select()
      .single();

    if (error) throw error;

    if (data.status === 'active') {
      this.workflows.set(workflowId, data);
    } else {
      this.workflows.delete(workflowId);
    }

    this.logger.info(`Updated workflow: ${data.name}`);
    return data;
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(workflowId) {
    const { error } = await this.supabase
      .from('integration_workflows')
      .delete()
      .eq('id', workflowId);

    if (error) throw error;

    this.workflows.delete(workflowId);
    this.logger.info(`Deleted workflow: ${workflowId}`);
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    return workflow;
  }

  /**
   * Get all workflows
   */
  async getAllWorkflows() {
    return Array.from(this.workflows.values());
  }

  /**
   * Manual trigger for workflow execution
   */
  async triggerWorkflow(workflowId, payload = {}) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    // Create manual trigger event
    const eventData = {
      id: uuidv4(),
      type: 'manual_trigger',
      user_id: payload.user_id,
      payload: { workflow_id: workflowId, ...payload },
      status: 'pending',
      created_at: new Date().toISOString()
    };

    const { error } = await this.supabase
      .from('agent_requests')
      .insert(eventData);

    if (error) throw error;

    this.logger.info(`Manual trigger created for workflow: ${workflow.name}`);
    return eventData;
  }
}

export default IntegrationOrchestrator; 