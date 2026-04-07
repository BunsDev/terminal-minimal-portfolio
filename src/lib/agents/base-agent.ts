/**
 * Base Agent Class
 * Foundation for all specialized agents
 */

import type {
  AgentConfig,
  AgentState,
  AgentMessage,
  AgentTool,
  ToolResult,
  AgentContext,
  ComplexityLevel
} from './types'
import { agentRegistry } from './registry'

export abstract class BaseAgent {
  protected config: AgentConfig
  protected state: AgentState

  constructor(config: AgentConfig) {
    this.config = config
    this.state = {
      id: config.id,
      status: 'idle',
      messages: [],
      context: {
        sessionId: crypto.randomUUID(),
        environment: 'sandbox',
        sharedMemory: new Map()
      }
    }
    
    // Register with the central registry
    agentRegistry.register(config)
  }

  /**
   * Process a user request
   */
  async process(
    input: string,
    context?: Partial<AgentContext>
  ): Promise<AgentMessage> {
    this.updateStatus('thinking')
    this.state.startedAt = new Date()
    
    // Merge context
    if (context) {
      this.state.context = { ...this.state.context, ...context }
    }
    
    // Add user message
    const userMessage: AgentMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }
    this.state.messages.push(userMessage)
    
    try {
      // Execute agent-specific logic
      const response = await this.execute(input)
      
      // Add assistant response
      const assistantMessage: AgentMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        agentId: this.config.id,
        timestamp: new Date()
      }
      this.state.messages.push(assistantMessage)
      
      this.updateStatus('complete')
      this.state.completedAt = new Date()
      
      return assistantMessage
    } catch (error) {
      this.updateStatus('error')
      this.state.error = error instanceof Error ? error.message : 'Unknown error'
      
      return {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Error: ${this.state.error}`,
        agentId: this.config.id,
        timestamp: new Date()
      }
    }
  }

  /**
   * Execute agent-specific logic - to be implemented by subclasses
   */
  protected abstract execute(input: string): Promise<string>

  /**
   * Execute a tool
   */
  protected async executeTool(
    toolName: string,
    params: Record<string, unknown>
  ): Promise<ToolResult> {
    const tool = this.config.tools.find(t => t.name === toolName)
    if (!tool) {
      return { success: false, error: `Tool ${toolName} not found` }
    }
    
    this.updateStatus('executing')
    const startTime = Date.now()
    
    try {
      const result = await tool.execute(params)
      return {
        ...result,
        duration: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
        duration: Date.now() - startTime
      }
    }
  }

  /**
   * Delegate task to another agent
   */
  protected async delegate(
    targetRole: string,
    task: string,
    context?: Record<string, unknown>
  ): Promise<string> {
    const targetAgent = agentRegistry.getAgentByRole(targetRole as any)
    if (!targetAgent) {
      return `No agent available for role: ${targetRole}`
    }
    
    const response = await agentRegistry.sendRequest({
      id: crypto.randomUUID(),
      fromAgent: this.config.id,
      toAgent: targetAgent.id,
      type: 'delegate',
      payload: { task, context },
      timestamp: new Date()
    })
    
    return response.status === 'success'
      ? `Delegated to ${targetAgent.name}`
      : `Delegation failed: ${response.payload.error}`
  }

  /**
   * Update agent status
   */
  protected updateStatus(status: AgentState['status']): void {
    this.state.status = status
    agentRegistry.updateState(this.config.id, { status })
  }

  /**
   * Get the appropriate model based on task complexity
   */
  protected getModel(complexity: ComplexityLevel): string {
    return agentRegistry.getModelForComplexity(this.config, complexity)
  }

  /**
   * Add a tool dynamically
   */
  addTool(tool: AgentTool): void {
    this.config.tools.push(tool)
  }

  /**
   * Get agent configuration
   */
  getConfig(): AgentConfig {
    return this.config
  }

  /**
   * Get current state
   */
  getState(): AgentState {
    return this.state
  }

  /**
   * Reset agent state
   */
  reset(): void {
    this.state = {
      id: this.config.id,
      status: 'idle',
      messages: [],
      context: {
        sessionId: crypto.randomUUID(),
        environment: 'sandbox',
        sharedMemory: new Map()
      }
    }
  }
}
