/**
 * AI Agent System Types
 * Based on knowledge-agent-template patterns
 */

// Agent complexity levels for smart routing
export type ComplexityLevel = 'trivial' | 'simple' | 'moderate' | 'complex' | 'expert'

// Agent role definitions
export type AgentRole =
  | 'orchestrator'    // Routes requests to appropriate agents
  | 'github'          // GitHub operations specialist
  | 'codebase'        // Code analysis and understanding
  | 'devops'          // CI/CD, workflows, deployments
  | 'documentation'   // Documentation search and generation
  | 'assistant'       // General purpose helper

// Agent status
export type AgentStatus = 'idle' | 'thinking' | 'executing' | 'waiting' | 'error' | 'complete'

// Tool definition compatible with AI SDK
export interface AgentTool {
  name: string
  description: string
  parameters: Record<string, {
    type: string
    description: string
    required?: boolean
    enum?: string[]
  }>
  execute: (params: Record<string, unknown>) => Promise<ToolResult>
}

// Tool execution result
export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
  duration?: number
}

// Message types for agent communication
export interface AgentMessage {
  id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  agentId?: string
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
  timestamp: Date
  metadata?: Record<string, unknown>
}

// Tool call structure
export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

// Agent configuration
export interface AgentConfig {
  id: string
  name: string
  role: AgentRole
  description: string
  systemPrompt: string
  tools: AgentTool[]
  maxSteps: number
  model: ModelConfig
  capabilities: string[]
  constraints?: string[]
}

// Model configuration for complexity routing
export interface ModelConfig {
  trivial: string
  simple: string
  moderate: string
  complex: string
  expert: string
}

// Agent state
export interface AgentState {
  id: string
  status: AgentStatus
  currentTask?: string
  messages: AgentMessage[]
  context: AgentContext
  startedAt?: Date
  completedAt?: Date
  error?: string
}

// Shared context between agents
export interface AgentContext {
  sessionId: string
  userId?: string
  accessToken?: string
  currentRepo?: {
    owner: string
    name: string
    branch?: string
  }
  workingDirectory?: string
  environment: 'sandbox' | 'production'
  sharedMemory: Map<string, unknown>
}

// Inter-agent communication protocol
export interface AgentRequest {
  id: string
  fromAgent: string
  toAgent: string
  type: 'query' | 'delegate' | 'inform' | 'request_tool'
  payload: {
    task: string
    context?: Record<string, unknown>
    priority?: 'low' | 'normal' | 'high' | 'critical'
    timeout?: number
  }
  timestamp: Date
}

export interface AgentResponse {
  id: string
  requestId: string
  fromAgent: string
  status: 'success' | 'partial' | 'failed' | 'delegated'
  payload: {
    result?: unknown
    error?: string
    delegatedTo?: string
    suggestions?: string[]
  }
  timestamp: Date
}

// Event types for real-time updates
export interface AgentEvent {
  type: 'status_change' | 'tool_start' | 'tool_end' | 'message' | 'error' | 'complete'
  agentId: string
  data: unknown
  timestamp: Date
}

// Workflow definition for multi-step tasks
export interface AgentWorkflow {
  id: string
  name: string
  description: string
  steps: WorkflowStep[]
  triggers?: WorkflowTrigger[]
}

export interface WorkflowStep {
  id: string
  agentRole: AgentRole
  task: string
  dependsOn?: string[]
  retryPolicy?: {
    maxRetries: number
    backoffMs: number
  }
  timeout?: number
}

export interface WorkflowTrigger {
  type: 'webhook' | 'schedule' | 'event' | 'manual'
  config: Record<string, unknown>
}

// Knowledge source for file-based search
export interface KnowledgeSource {
  id: string
  type: 'github_repo' | 'documentation' | 'api_spec' | 'custom'
  name: string
  url?: string
  syncedAt?: Date
  status: 'pending' | 'synced' | 'error'
  metadata?: Record<string, unknown>
}

// Sandbox configuration
export interface SandboxConfig {
  id: string
  status: 'creating' | 'ready' | 'busy' | 'terminated'
  snapshotRepo?: string
  allowedCommands: string[]
  blockedCommands: string[]
  timeout: number
  memoryLimit: number
}
