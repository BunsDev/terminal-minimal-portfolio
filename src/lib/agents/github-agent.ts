/**
 * GitHub Agent
 * Specialized agent for GitHub operations
 */

import { BaseAgent } from './base-agent'
import type { AgentConfig, AgentTool, ToolResult } from './types'
import { GitHubService } from '../cli/github-service'

const DEFAULT_MODELS = {
  trivial: 'openai/gpt-4o-mini',
  simple: 'openai/gpt-4o-mini',
  moderate: 'openai/gpt-4o',
  complex: 'openai/gpt-4o',
  expert: 'anthropic/claude-opus-4.6'
}

export class GitHubAgent extends BaseAgent {
  private github: GitHubService | null = null

  constructor(accessToken?: string) {
    const tools = createGitHubTools()
    
    const config: AgentConfig = {
      id: 'github-agent',
      name: 'GitHub Operations Agent',
      role: 'github',
      description: 'Specialized agent for GitHub repository management, issues, pull requests, and collaboration workflows.',
      systemPrompt: `You are a GitHub operations specialist. You help users manage their GitHub repositories, issues, pull requests, and workflows.

Your capabilities include:
- Repository management (create, clone, fork, delete)
- Issue tracking (create, update, close, search)
- Pull request workflows (create, review, merge)
- Branch management
- Release management
- Organization and team operations

Always provide clear, actionable responses. When executing operations, confirm the action before proceeding with destructive operations.

Available tools: ${tools.map(t => t.name).join(', ')}`,
      tools,
      maxSteps: 10,
      model: DEFAULT_MODELS,
      capabilities: [
        'repo_management',
        'issue_tracking',
        'pull_requests',
        'branch_operations',
        'releases',
        'organizations'
      ],
      constraints: [
        'Confirm before destructive operations',
        'Respect rate limits',
        'Never expose tokens in responses'
      ]
    }

    super(config)
    
    if (accessToken) {
      this.github = new GitHubService(accessToken)
    }
  }

  /**
   * Set GitHub access token
   */
  setAccessToken(token: string): void {
    this.github = new GitHubService(token)
    this.state.context.accessToken = token
  }

  /**
   * Execute GitHub-specific operations
   */
  protected async execute(input: string): Promise<string> {
    if (!this.github) {
      return 'GitHub access token not configured. Please authenticate first.'
    }

    const lowerInput = input.toLowerCase()

    // Parse intent from input
    if (lowerInput.includes('list') && lowerInput.includes('repo')) {
      return this.listRepositories()
    }

    if (lowerInput.includes('create') && lowerInput.includes('issue')) {
      return this.handleCreateIssue(input)
    }

    if (lowerInput.includes('list') && lowerInput.includes('issue')) {
      return this.handleListIssues(input)
    }

    if (lowerInput.includes('create') && lowerInput.includes('pr')) {
      return this.handleCreatePR(input)
    }

    if (lowerInput.includes('list') && (lowerInput.includes('pr') || lowerInput.includes('pull request'))) {
      return this.handleListPRs(input)
    }

    if (lowerInput.includes('workflow') || lowerInput.includes('action')) {
      return this.handleWorkflows(input)
    }

    // Default: describe capabilities
    return this.describeCapabilities()
  }

  private async listRepositories(): Promise<string> {
    try {
      const repos = await this.github!.listUserRepos()
      if (repos.length === 0) {
        return 'No repositories found.'
      }
      
      const repoList = repos.slice(0, 10).map(r => 
        `- ${r.full_name} ${r.private ? '(private)' : '(public)'} - ${r.description || 'No description'}`
      ).join('\n')
      
      return `Found ${repos.length} repositories:\n\n${repoList}${repos.length > 10 ? `\n\n... and ${repos.length - 10} more` : ''}`
    } catch (error) {
      return `Failed to list repositories: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  private async handleCreateIssue(input: string): Promise<string> {
    // Extract repo and title from input
    const repoMatch = input.match(/(?:in|on|for)\s+([^\s]+\/[^\s]+)/i)
    const titleMatch = input.match(/(?:titled?|called?|named?)\s+["']([^"']+)["']/i)
    
    if (!repoMatch) {
      return 'Please specify a repository (e.g., "create issue in owner/repo titled \'Bug fix\'")'
    }
    
    const [owner, repo] = repoMatch[1].split('/')
    const title = titleMatch?.[1] || 'New Issue'
    
    try {
      const issue = await this.github!.createIssue(owner, repo, title)
      return `Created issue #${issue.number}: ${issue.title}\nURL: ${issue.html_url}`
    } catch (error) {
      return `Failed to create issue: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  private async handleListIssues(input: string): Promise<string> {
    const repoMatch = input.match(/(?:in|on|for)\s+([^\s]+\/[^\s]+)/i)
    
    if (!repoMatch) {
      return 'Please specify a repository (e.g., "list issues in owner/repo")'
    }
    
    const [owner, repo] = repoMatch[1].split('/')
    
    try {
      const issues = await this.github!.listIssues(owner, repo)
      if (issues.length === 0) {
        return 'No open issues found.'
      }
      
      const issueList = issues.slice(0, 10).map(i => 
        `- #${i.number}: ${i.title} (${i.state})`
      ).join('\n')
      
      return `Found ${issues.length} issues:\n\n${issueList}`
    } catch (error) {
      return `Failed to list issues: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  private async handleCreatePR(input: string): Promise<string> {
    return 'To create a PR, please provide: repository, head branch, base branch, and title. Example: "create pr in owner/repo from feature-branch to main titled \'New feature\'"'
  }

  private async handleListPRs(input: string): Promise<string> {
    const repoMatch = input.match(/(?:in|on|for)\s+([^\s]+\/[^\s]+)/i)
    
    if (!repoMatch) {
      return 'Please specify a repository (e.g., "list prs in owner/repo")'
    }
    
    const [owner, repo] = repoMatch[1].split('/')
    
    try {
      const prs = await this.github!.listPullRequests(owner, repo)
      if (prs.length === 0) {
        return 'No open pull requests found.'
      }
      
      const prList = prs.slice(0, 10).map(p => 
        `- #${p.number}: ${p.title} (${p.state}) by ${p.user?.login}`
      ).join('\n')
      
      return `Found ${prs.length} pull requests:\n\n${prList}`
    } catch (error) {
      return `Failed to list pull requests: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  private async handleWorkflows(input: string): Promise<string> {
    const repoMatch = input.match(/(?:in|on|for)\s+([^\s]+\/[^\s]+)/i)
    
    if (!repoMatch) {
      return 'Please specify a repository (e.g., "list workflows in owner/repo")'
    }
    
    const [owner, repo] = repoMatch[1].split('/')
    
    try {
      const workflows = await this.github!.listWorkflows(owner, repo)
      if (workflows.length === 0) {
        return 'No workflows found.'
      }
      
      const workflowList = workflows.map(w => 
        `- ${w.name} (${w.state})`
      ).join('\n')
      
      return `Found ${workflows.length} workflows:\n\n${workflowList}`
    } catch (error) {
      return `Failed to list workflows: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }

  private describeCapabilities(): string {
    return `I'm the GitHub Operations Agent. I can help you with:

**Repository Management**
- List, create, fork, and manage repositories
- View repository details and statistics

**Issue Tracking**
- Create, update, and close issues
- Search and filter issues
- Add labels and assignees

**Pull Requests**
- Create and review pull requests
- Merge or close PRs
- View PR status and checks

**Workflows & Actions**
- List and trigger workflows
- View workflow run status
- Manage workflow permissions

**Releases**
- Create and manage releases
- Upload release assets

Try commands like:
- "list my repositories"
- "list issues in owner/repo"
- "create issue in owner/repo titled 'Bug report'"
- "list workflows in owner/repo"`
  }
}

/**
 * Create GitHub-specific tools
 */
function createGitHubTools(): AgentTool[] {
  return [
    {
      name: 'list_repos',
      description: 'List repositories for the authenticated user',
      parameters: {
        type: { type: 'string', description: 'Filter by type: all, owner, public, private, member', enum: ['all', 'owner', 'public', 'private', 'member'] },
        sort: { type: 'string', description: 'Sort by: created, updated, pushed, full_name', enum: ['created', 'updated', 'pushed', 'full_name'] }
      },
      execute: async () => ({ success: true, data: 'Tool executed via agent' })
    },
    {
      name: 'get_repo',
      description: 'Get details of a specific repository',
      parameters: {
        owner: { type: 'string', description: 'Repository owner', required: true },
        repo: { type: 'string', description: 'Repository name', required: true }
      },
      execute: async () => ({ success: true, data: 'Tool executed via agent' })
    },
    {
      name: 'create_issue',
      description: 'Create a new issue in a repository',
      parameters: {
        owner: { type: 'string', description: 'Repository owner', required: true },
        repo: { type: 'string', description: 'Repository name', required: true },
        title: { type: 'string', description: 'Issue title', required: true },
        body: { type: 'string', description: 'Issue body/description' }
      },
      execute: async () => ({ success: true, data: 'Tool executed via agent' })
    },
    {
      name: 'list_issues',
      description: 'List issues in a repository',
      parameters: {
        owner: { type: 'string', description: 'Repository owner', required: true },
        repo: { type: 'string', description: 'Repository name', required: true },
        state: { type: 'string', description: 'Filter by state', enum: ['open', 'closed', 'all'] }
      },
      execute: async () => ({ success: true, data: 'Tool executed via agent' })
    },
    {
      name: 'create_pull_request',
      description: 'Create a new pull request',
      parameters: {
        owner: { type: 'string', description: 'Repository owner', required: true },
        repo: { type: 'string', description: 'Repository name', required: true },
        title: { type: 'string', description: 'PR title', required: true },
        head: { type: 'string', description: 'Head branch', required: true },
        base: { type: 'string', description: 'Base branch', required: true },
        body: { type: 'string', description: 'PR description' }
      },
      execute: async () => ({ success: true, data: 'Tool executed via agent' })
    },
    {
      name: 'list_workflows',
      description: 'List GitHub Actions workflows',
      parameters: {
        owner: { type: 'string', description: 'Repository owner', required: true },
        repo: { type: 'string', description: 'Repository name', required: true }
      },
      execute: async () => ({ success: true, data: 'Tool executed via agent' })
    },
    {
      name: 'trigger_workflow',
      description: 'Trigger a workflow dispatch event',
      parameters: {
        owner: { type: 'string', description: 'Repository owner', required: true },
        repo: { type: 'string', description: 'Repository name', required: true },
        workflow_id: { type: 'string', description: 'Workflow ID or filename', required: true },
        ref: { type: 'string', description: 'Git ref (branch/tag)', required: true }
      },
      execute: async () => ({ success: true, data: 'Tool executed via agent' })
    }
  ]
}
