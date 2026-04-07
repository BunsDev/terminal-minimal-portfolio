/**
 * Orchestrator Agent
 * Central coordinator that routes requests and manages multi-agent workflows
 */

import { BaseAgent } from './base-agent'
import type { AgentConfig, AgentTool, AgentRole, ComplexityLevel } from './types'
import { agentRegistry } from './registry'

const DEFAULT_MODELS = {
  trivial: 'openai/gpt-4o-mini',
  simple: 'openai/gpt-4o-mini',
  moderate: 'openai/gpt-4o',
  complex: 'openai/gpt-4o',
  expert: 'anthropic/claude-opus-4.6'
}

export class OrchestratorAgent extends BaseAgent {
  constructor() {
    const tools = createOrchestratorTools()
    
    const config: AgentConfig = {
      id: 'orchestrator-agent',
      name: 'Orchestrator Agent',
      role: 'orchestrator',
      description: 'Central coordinator that routes requests to specialized agents, manages workflows, and synthesizes results from multiple agents.',
      systemPrompt: `You are the Orchestrator Agent - the central coordinator for a multi-agent system.

Your responsibilities:
1. Analyze incoming requests and determine complexity
2. Route tasks to the most appropriate specialized agent
3. Coordinate multi-step workflows across agents
4. Synthesize results from multiple agents
5. Handle failures gracefully with fallbacks

Available specialized agents:
- GitHub Agent: Repository, issues, PRs, workflows
- Codebase Agent: File search, code analysis
- DevOps Agent: CI/CD, deployments, infrastructure
- Documentation Agent: Docs search, explanation
- Assistant Agent: General help, fallback

Routing strategy:
- Simple queries → direct to specialized agent
- Complex queries → break down and coordinate
- Unknown domains → gather info, then route

Always explain your routing decisions and provide status updates during multi-step operations.`,
      tools,
      maxSteps: 20,
      model: DEFAULT_MODELS,
      capabilities: [
        'task_routing',
        'workflow_coordination',
        'result_synthesis',
        'error_handling',
        'complexity_classification'
      ]
    }

    super(config)
  }

  /**
   * Execute orchestration logic
   */
  protected async execute(input: string): Promise<string> {
    // Classify complexity
    const complexity = this.classifyTaskComplexity(input)
    
    // Determine target agent(s)
    const targets = this.analyzeTaskTargets(input)
    
    // Single agent task
    if (targets.length === 1 && complexity !== 'complex' && complexity !== 'expert') {
      return this.routeToAgent(input, targets[0], complexity)
    }
    
    // Multi-agent or complex task
    if (targets.length > 1 || complexity === 'complex' || complexity === 'expert') {
      return this.coordinateMultiAgent(input, targets, complexity)
    }
    
    // Unknown or general - handle directly
    return this.handleDirectly(input)
  }

  /**
   * Classify task complexity
   */
  private classifyTaskComplexity(input: string): ComplexityLevel {
    const lowerInput = input.toLowerCase()
    const wordCount = input.split(/\s+/).length
    
    // Trivial: Very short, simple queries
    if (wordCount < 5 && (
      lowerInput.includes('list') ||
      lowerInput.includes('show') ||
      lowerInput.includes('status')
    )) {
      return 'trivial'
    }
    
    // Simple: Single clear action
    if (wordCount < 15 && !lowerInput.includes(' and ') && !lowerInput.includes(' then ')) {
      if (
        lowerInput.includes('create') ||
        lowerInput.includes('delete') ||
        lowerInput.includes('update')
      ) {
        return 'simple'
      }
    }
    
    // Complex: Multiple steps or analysis
    if (
      lowerInput.includes(' and ') ||
      lowerInput.includes(' then ') ||
      lowerInput.includes('analyze') ||
      lowerInput.includes('compare') ||
      lowerInput.includes('refactor')
    ) {
      return 'complex'
    }
    
    // Expert: Architecture, security, optimization
    if (
      lowerInput.includes('architect') ||
      lowerInput.includes('security') ||
      lowerInput.includes('optimize') ||
      lowerInput.includes('migrate')
    ) {
      return 'expert'
    }
    
    return 'moderate'
  }

  /**
   * Analyze which agents should handle the task
   */
  private analyzeTaskTargets(input: string): AgentRole[] {
    const lowerInput = input.toLowerCase()
    const targets: AgentRole[] = []
    
    // GitHub-related
    if (
      lowerInput.includes('repo') ||
      lowerInput.includes('issue') ||
      lowerInput.includes('pull request') ||
      lowerInput.includes('pr ') ||
      lowerInput.includes('commit') ||
      lowerInput.includes('branch') ||
      lowerInput.includes('merge')
    ) {
      targets.push('github')
    }
    
    // Codebase-related
    if (
      lowerInput.includes('search') ||
      lowerInput.includes('find') ||
      lowerInput.includes('code') ||
      lowerInput.includes('file') ||
      lowerInput.includes('function') ||
      lowerInput.includes('analyze')
    ) {
      targets.push('codebase')
    }
    
    // DevOps-related
    if (
      lowerInput.includes('workflow') ||
      lowerInput.includes('action') ||
      lowerInput.includes('deploy') ||
      lowerInput.includes('ci') ||
      lowerInput.includes('cd') ||
      lowerInput.includes('pipeline')
    ) {
      targets.push('devops')
    }
    
    // Documentation-related
    if (
      lowerInput.includes('doc') ||
      lowerInput.includes('readme') ||
      lowerInput.includes('explain') ||
      lowerInput.includes('how to')
    ) {
      targets.push('documentation')
    }
    
    // Default to assistant if no specific target
    if (targets.length === 0) {
      targets.push('assistant')
    }
    
    return targets
  }

  /**
   * Route to a single agent
   */
  private async routeToAgent(
    input: string,
    target: AgentRole,
    complexity: ComplexityLevel
  ): Promise<string> {
    const agent = agentRegistry.getAgentByRole(target)
    
    if (!agent) {
      return `No agent available for ${target}. Processing with general assistant.`
    }
    
    const model = this.getModel(complexity)
    
    return `**Routing to ${agent.name}**

Task: ${input}
Complexity: ${complexity}
Model: ${model}

_Delegating to specialized agent..._

---

The ${agent.name} will handle this request. It specializes in:
${agent.capabilities.map(c => `- ${c.replace(/_/g, ' ')}`).join('\n')}

Use the Cloud CLI to interact directly with the ${target} agent.`
  }

  /**
   * Coordinate multi-agent workflow
   */
  private async coordinateMultiAgent(
    input: string,
    targets: AgentRole[],
    complexity: ComplexityLevel
  ): Promise<string> {
    const steps = this.planWorkflow(input, targets)
    
    let response = `**Multi-Agent Workflow**

Task: ${input}
Complexity: ${complexity}
Agents involved: ${targets.join(', ')}

**Execution Plan:**
`
    
    steps.forEach((step, index) => {
      response += `${index + 1}. **${step.agent}**: ${step.task}\n`
    })
    
    response += `
---

**Coordination Strategy:**
- Steps will execute in order
- Results from each step inform the next
- Errors will trigger appropriate fallbacks

To execute this workflow, use the Cloud CLI with your GitHub credentials.`
    
    return response
  }

  /**
   * Plan workflow steps
   */
  private planWorkflow(
    input: string,
    targets: AgentRole[]
  ): Array<{ agent: string; task: string }> {
    const steps: Array<{ agent: string; task: string }> = []
    const lowerInput = input.toLowerCase()
    
    // Information gathering first
    if (targets.includes('codebase')) {
      steps.push({
        agent: 'Codebase Agent',
        task: 'Search and analyze relevant code'
      })
    }
    
    // GitHub operations
    if (targets.includes('github')) {
      if (lowerInput.includes('issue')) {
        steps.push({
          agent: 'GitHub Agent',
          task: 'Handle issue operations'
        })
      }
      if (lowerInput.includes('pr') || lowerInput.includes('pull')) {
        steps.push({
          agent: 'GitHub Agent',
          task: 'Handle pull request operations'
        })
      }
    }
    
    // DevOps operations
    if (targets.includes('devops')) {
      steps.push({
        agent: 'DevOps Agent',
        task: 'Handle CI/CD and deployment operations'
      })
    }
    
    // Documentation
    if (targets.includes('documentation')) {
      steps.push({
        agent: 'Documentation Agent',
        task: 'Generate or update documentation'
      })
    }
    
    return steps
  }

  /**
   * Handle directly without delegation
   */
  private handleDirectly(input: string): Promise<string> {
    return Promise.resolve(`I'm the Orchestrator Agent, coordinating the multi-agent system.

**Your request:** ${input}

**Available Agents:**
- **GitHub Agent** - Repository, issues, PRs, workflows
- **Codebase Agent** - File search, code analysis  
- **DevOps Agent** - CI/CD, deployments
- **Documentation Agent** - Docs and explanations

**How to proceed:**
1. Be more specific about what you need
2. Mention the domain (GitHub, code, deploy, docs)
3. I'll route to the right specialist

**Examples:**
- "List my GitHub repositories"
- "Search for useState in the codebase"
- "Create a CI workflow for Node.js"
- "Explain how authentication works"`)
  }
}

/**
 * Create orchestrator tools
 */
function createOrchestratorTools(): AgentTool[] {
  return [
    {
      name: 'route_task',
      description: 'Route a task to a specialized agent',
      parameters: {
        task: { type: 'string', description: 'Task description', required: true },
        target_agent: { type: 'string', description: 'Target agent role', required: true },
        priority: { type: 'string', description: 'Task priority', enum: ['low', 'normal', 'high', 'critical'] }
      },
      execute: async (params) => ({
        success: true,
        data: `Routed to ${params.target_agent}`
      })
    },
    {
      name: 'classify_complexity',
      description: 'Classify task complexity for model routing',
      parameters: {
        task: { type: 'string', description: 'Task to classify', required: true }
      },
      execute: async () => ({
        success: true,
        data: 'moderate'
      })
    },
    {
      name: 'create_workflow',
      description: 'Create a multi-step workflow',
      parameters: {
        name: { type: 'string', description: 'Workflow name', required: true },
        steps: { type: 'string', description: 'JSON array of workflow steps', required: true }
      },
      execute: async () => ({
        success: true,
        data: 'Workflow created'
      })
    },
    {
      name: 'get_agent_status',
      description: 'Get status of an agent',
      parameters: {
        agent_id: { type: 'string', description: 'Agent ID', required: true }
      },
      execute: async () => ({
        success: true,
        data: { status: 'idle' }
      })
    },
    {
      name: 'synthesize_results',
      description: 'Combine results from multiple agents',
      parameters: {
        results: { type: 'string', description: 'JSON array of results', required: true }
      },
      execute: async () => ({
        success: true,
        data: 'Results synthesized'
      })
    }
  ]
}
