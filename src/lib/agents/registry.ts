/**
 * Agent Registry
 * Central registry for managing and routing between agents
 */

import type {
  AgentConfig,
  AgentRole,
  AgentState,
  AgentRequest,
  AgentResponse,
  AgentContext,
  ComplexityLevel,
  AgentEvent
} from './types'

// Event emitter for agent events
type EventCallback = (event: AgentEvent) => void

class AgentRegistry {
  private agents: Map<string, AgentConfig> = new Map()
  private states: Map<string, AgentState> = new Map()
  private eventListeners: Set<EventCallback> = new Set()
  private requestQueue: AgentRequest[] = []

  /**
   * Register an agent with the system
   */
  register(config: AgentConfig): void {
    this.agents.set(config.id, config)
    this.states.set(config.id, {
      id: config.id,
      status: 'idle',
      messages: [],
      context: this.createDefaultContext()
    })
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string): AgentConfig | undefined {
    return this.agents.get(id)
  }

  /**
   * Get agent by role
   */
  getAgentByRole(role: AgentRole): AgentConfig | undefined {
    for (const agent of this.agents.values()) {
      if (agent.role === role) return agent
    }
    return undefined
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): AgentConfig[] {
    return Array.from(this.agents.values())
  }

  /**
   * Get agent state
   */
  getState(agentId: string): AgentState | undefined {
    return this.states.get(agentId)
  }

  /**
   * Update agent state
   */
  updateState(agentId: string, updates: Partial<AgentState>): void {
    const current = this.states.get(agentId)
    if (current) {
      const newState = { ...current, ...updates }
      this.states.set(agentId, newState)
      this.emit({
        type: 'status_change',
        agentId,
        data: newState,
        timestamp: new Date()
      })
    }
  }

  /**
   * Route request to appropriate agent based on complexity and content
   */
  async routeRequest(
    task: string,
    context: Partial<AgentContext>,
    complexity?: ComplexityLevel
  ): Promise<string> {
    // Determine complexity if not provided
    const taskComplexity = complexity || this.classifyComplexity(task)
    
    // Route based on task content and complexity
    const targetRole = this.determineTargetRole(task, taskComplexity)
    const agent = this.getAgentByRole(targetRole)
    
    if (!agent) {
      // Fallback to orchestrator
      const orchestrator = this.getAgentByRole('orchestrator')
      return orchestrator?.id || 'orchestrator'
    }
    
    return agent.id
  }

  /**
   * Classify task complexity using heuristics
   */
  private classifyComplexity(task: string): ComplexityLevel {
    const lowerTask = task.toLowerCase()
    
    // Trivial: Simple lookups, status checks
    if (
      lowerTask.includes('what is') ||
      lowerTask.includes('show me') ||
      lowerTask.includes('list') ||
      lowerTask.includes('status')
    ) {
      return 'trivial'
    }
    
    // Simple: Single operations
    if (
      lowerTask.includes('create issue') ||
      lowerTask.includes('close') ||
      lowerTask.includes('merge')
    ) {
      return 'simple'
    }
    
    // Moderate: Multi-step operations
    if (
      lowerTask.includes('review') ||
      lowerTask.includes('analyze') ||
      lowerTask.includes('compare')
    ) {
      return 'moderate'
    }
    
    // Complex: Requires understanding and planning
    if (
      lowerTask.includes('refactor') ||
      lowerTask.includes('migrate') ||
      lowerTask.includes('implement')
    ) {
      return 'complex'
    }
    
    // Expert: Architecture, security, optimization
    if (
      lowerTask.includes('architecture') ||
      lowerTask.includes('security audit') ||
      lowerTask.includes('optimize')
    ) {
      return 'expert'
    }
    
    return 'moderate' // Default
  }

  /**
   * Determine which agent role should handle the task
   */
  private determineTargetRole(task: string, complexity: ComplexityLevel): AgentRole {
    const lowerTask = task.toLowerCase()
    
    // GitHub-related tasks
    if (
      lowerTask.includes('repo') ||
      lowerTask.includes('issue') ||
      lowerTask.includes('pull request') ||
      lowerTask.includes('pr') ||
      lowerTask.includes('commit') ||
      lowerTask.includes('branch')
    ) {
      return 'github'
    }
    
    // DevOps tasks
    if (
      lowerTask.includes('workflow') ||
      lowerTask.includes('action') ||
      lowerTask.includes('deploy') ||
      lowerTask.includes('ci/cd') ||
      lowerTask.includes('pipeline')
    ) {
      return 'devops'
    }
    
    // Code analysis tasks
    if (
      lowerTask.includes('code') ||
      lowerTask.includes('function') ||
      lowerTask.includes('class') ||
      lowerTask.includes('file') ||
      lowerTask.includes('search')
    ) {
      return 'codebase'
    }
    
    // Documentation tasks
    if (
      lowerTask.includes('doc') ||
      lowerTask.includes('readme') ||
      lowerTask.includes('explain') ||
      lowerTask.includes('help')
    ) {
      return 'documentation'
    }
    
    // Complex tasks go to orchestrator
    if (complexity === 'complex' || complexity === 'expert') {
      return 'orchestrator'
    }
    
    return 'assistant'
  }

  /**
   * Send request between agents
   */
  async sendRequest(request: AgentRequest): Promise<AgentResponse> {
    this.requestQueue.push(request)
    
    const targetAgent = this.getAgent(request.toAgent)
    if (!targetAgent) {
      return {
        id: crypto.randomUUID(),
        requestId: request.id,
        fromAgent: request.toAgent,
        status: 'failed',
        payload: { error: `Agent ${request.toAgent} not found` },
        timestamp: new Date()
      }
    }
    
    // Update state to show agent is working
    this.updateState(request.toAgent, {
      status: 'thinking',
      currentTask: request.payload.task
    })
    
    // Return pending response - actual execution happens asynchronously
    return {
      id: crypto.randomUUID(),
      requestId: request.id,
      fromAgent: request.toAgent,
      status: 'success',
      payload: { result: 'Request accepted' },
      timestamp: new Date()
    }
  }

  /**
   * Subscribe to agent events
   */
  subscribe(callback: EventCallback): () => void {
    this.eventListeners.add(callback)
    return () => this.eventListeners.delete(callback)
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: AgentEvent): void {
    for (const listener of this.eventListeners) {
      try {
        listener(event)
      } catch (error) {
        console.error('Event listener error:', error)
      }
    }
  }

  /**
   * Create default context
   */
  private createDefaultContext(): AgentContext {
    return {
      sessionId: crypto.randomUUID(),
      environment: 'sandbox',
      sharedMemory: new Map()
    }
  }

  /**
   * Get model for complexity level
   */
  getModelForComplexity(config: AgentConfig, complexity: ComplexityLevel): string {
    return config.model[complexity]
  }
}

// Singleton instance
export const agentRegistry = new AgentRegistry()
