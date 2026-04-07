/**
 * AI Agents Module
 * Export all agents and utilities
 */

// Types
export * from './types'

// Registry
export { agentRegistry } from './registry'

// Base
export { BaseAgent } from './base-agent'

// Specialized Agents
export { GitHubAgent } from './github-agent'
export { CodebaseAgent } from './codebase-agent'
export { DevOpsAgent } from './devops-agent'
export { OrchestratorAgent } from './orchestrator-agent'

// Agent factory
import { GitHubAgent } from './github-agent'
import { CodebaseAgent } from './codebase-agent'
import { DevOpsAgent } from './devops-agent'
import { OrchestratorAgent } from './orchestrator-agent'
import { agentRegistry } from './registry'
import type { AgentRole, AgentContext } from './types'

/**
 * Initialize all agents and register with the system
 */
export function initializeAgents(accessToken?: string): void {
  // Create and register all agents
  new OrchestratorAgent()
  new GitHubAgent(accessToken)
  new CodebaseAgent()
  new DevOpsAgent()
}

/**
 * Process a request through the agent system
 */
export async function processRequest(
  input: string,
  context?: Partial<AgentContext>
): Promise<string> {
  // Route to appropriate agent
  const targetAgentId = await agentRegistry.routeRequest(input, context || {})
  
  const agent = agentRegistry.getAgent(targetAgentId)
  if (!agent) {
    return 'No agent available to handle this request.'
  }
  
  // Get agent state and check if it can process
  const state = agentRegistry.getState(targetAgentId)
  if (state?.status === 'busy' || state?.status === 'executing') {
    return `Agent ${agent.name} is currently busy. Please try again.`
  }
  
  return `Request routed to ${agent.name}. Use the CLI to interact with this agent.`
}

/**
 * Get agent by role
 */
export function getAgentByRole(role: AgentRole) {
  return agentRegistry.getAgentByRole(role)
}

/**
 * Get all registered agents
 */
export function getAllAgents() {
  return agentRegistry.getAllAgents()
}

/**
 * Subscribe to agent events
 */
export function subscribeToAgentEvents(
  callback: (event: { type: string; agentId: string; data: unknown }) => void
) {
  return agentRegistry.subscribe(callback)
}
