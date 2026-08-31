import { Router, type Router as RouterType } from 'express';
import { taskStore } from '../store/taskStore';
import { asyncHandler } from '../middleware/errorHandler';

export const agentsRouter: RouterType = Router();

const AGENTS = [
  {
    id: 'orchestrator',
    name: 'OrchestratorAgent',
    description: 'Plans and coordinates all sub-agents based on business goals',
    capabilities: ['goal_parsing', 'plan_creation', 'agent_coordination', 'approval_gating'],
    model: 'gemini-3.6-flash',
  },
  {
    id: 'billing',
    name: 'BillingAgent',
    description: 'Retrieves and analyses invoice and billing data',
    capabilities: ['invoice_retrieval', 'overdue_detection', 'amount_calculation'],
    model: 'rule-based',
  },
  {
    id: 'customer',
    name: 'CustomerAgent',
    description: 'Analyses customer profiles, history, and calculates priority',
    capabilities: ['profile_retrieval', 'history_analysis', 'priority_scoring'],
    model: 'rule-based',
  },
  {
    id: 'communication',
    name: 'CommunicationAgent',
    description: 'Generates personalized messages and dispatches communications',
    capabilities: ['message_generation', 'email_sending', 'channel_selection'],
    model: 'gemini-3.6-flash',
  },
  {
    id: 'followup',
    name: 'FollowupAgent',
    description: 'Schedules follow-up tasks and manages escalation timelines',
    capabilities: ['followup_creation', 'escalation_scheduling'],
    model: 'rule-based',
  },
  {
    id: 'verification',
    name: 'VerificationAgent',
    description: 'Verifies that all required actions were completed successfully',
    capabilities: ['execution_verification', 'result_auditing', 'report_generation'],
    model: 'rule-based',
  },
];

// GET /api/agents
agentsRouter.get('/', asyncHandler(async (_req, res) => {
  const stats = taskStore.getStats();
  const agents = AGENTS.map((a) => ({
    ...a,
    status: stats.tasks_running > 0 ? 'active' : 'idle',
  }));
  res.json({ success: true, data: agents });
}));

// GET /api/agents/:id
agentsRouter.get('/:id', asyncHandler(async (req, res) => {
  const agent = AGENTS.find((a) => a.id === req.params['id']);
  if (!agent) {
    res.status(404).json({ success: false, error: 'Agent not found' });
    return;
  }
  res.json({ success: true, data: agent });
}));
