// Core CLI Types for GitHub Cloud CLI

// Pane Management
export interface Pane {
  id: string
  type: 'terminal' | 'output' | 'viewer'
  title: string
  parentId: string | null
  splitDirection: 'horizontal' | 'vertical' | null
  size: number // Percentage of parent
  isActive: boolean
  createdAt: number
}

export interface PaneTreeNode {
  pane: Pane
  children: PaneTreeNode[]
}

// Command System
export interface CommandOutput {
  id: string
  timestamp: number
  type: 'info' | 'success' | 'error' | 'warning' | 'stream' | 'table' | 'json'
  content: string
  isStreaming?: boolean
  metadata?: Record<string, unknown>
}

export interface CommandHistoryEntry {
  id: string
  command: string
  timestamp: number
  paneId: string
  outputs: CommandOutput[]
  status: 'pending' | 'running' | 'completed' | 'error'
  duration?: number
}

export interface CommandDefinition {
  name: string
  description: string
  usage: string
  subcommands?: CommandDefinition[]
  flags?: CommandFlag[]
  examples?: string[]
  handler: (args: ParsedCommand, context: CommandContext) => Promise<CommandResult>
}

export interface CommandFlag {
  name: string
  shorthand?: string
  description: string
  required?: boolean
  type: 'string' | 'boolean' | 'number'
  default?: string | boolean | number
}

export interface ParsedCommand {
  command: string
  subcommand?: string
  args: string[]
  flags: Record<string, string | boolean | number>
  raw: string
}

export interface CommandResult {
  success: boolean
  outputs: CommandOutput[]
  data?: unknown
}

export interface CommandContext {
  paneId: string
  user: GitHubUser | null
  token: string | null
  addOutput: (output: Omit<CommandOutput, 'id' | 'timestamp'>) => void
  streamOutput: (content: string) => void
}

// GitHub Types
export interface GitHubUser {
  id: number
  login: string
  name: string | null
  email: string | null
  avatarUrl: string
  bio: string | null
  publicRepos: number
  followers: number
  following: number
}

export interface GitHubRepo {
  id: number
  name: string
  fullName: string
  description: string | null
  private: boolean
  fork: boolean
  url: string
  htmlUrl: string
  cloneUrl: string
  sshUrl: string
  defaultBranch: string
  language: string | null
  stargazersCount: number
  forksCount: number
  openIssuesCount: number
  createdAt: string
  updatedAt: string
  pushedAt: string
  owner: {
    login: string
    avatarUrl: string
  }
}

export interface GitHubIssue {
  id: number
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed'
  url: string
  htmlUrl: string
  user: {
    login: string
    avatarUrl: string
  }
  labels: Array<{
    name: string
    color: string
  }>
  assignees: Array<{
    login: string
  }>
  milestone: {
    title: string
    number: number
  } | null
  comments: number
  createdAt: string
  updatedAt: string
  closedAt: string | null
}

export interface GitHubPullRequest {
  id: number
  number: number
  title: string
  body: string | null
  state: 'open' | 'closed' | 'merged'
  url: string
  htmlUrl: string
  diffUrl: string
  head: {
    ref: string
    sha: string
    repo: {
      fullName: string
    }
  }
  base: {
    ref: string
    sha: string
  }
  user: {
    login: string
    avatarUrl: string
  }
  draft: boolean
  merged: boolean
  mergeable: boolean | null
  mergedAt: string | null
  comments: number
  reviewComments: number
  commits: number
  additions: number
  deletions: number
  changedFiles: number
  createdAt: string
  updatedAt: string
}

export interface GitHubWorkflow {
  id: number
  name: string
  path: string
  state: 'active' | 'disabled_manually' | 'disabled_inactivity'
  url: string
  htmlUrl: string
  badgeUrl: string
  createdAt: string
  updatedAt: string
}

export interface GitHubWorkflowRun {
  id: number
  name: string
  status: 'queued' | 'in_progress' | 'completed' | 'waiting'
  conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | 'action_required' | null
  workflowId: number
  url: string
  htmlUrl: string
  headBranch: string
  headSha: string
  event: string
  runNumber: number
  runAttempt: number
  createdAt: string
  updatedAt: string
  runStartedAt: string
}

export interface GitHubGist {
  id: string
  url: string
  htmlUrl: string
  description: string | null
  public: boolean
  files: Record<string, {
    filename: string
    type: string
    language: string | null
    rawUrl: string
    size: number
    content?: string
  }>
  owner: {
    login: string
    avatarUrl: string
  }
  comments: number
  createdAt: string
  updatedAt: string
}

export interface GitHubRelease {
  id: number
  tagName: string
  name: string | null
  body: string | null
  draft: boolean
  prerelease: boolean
  url: string
  htmlUrl: string
  tarballUrl: string
  zipballUrl: string
  author: {
    login: string
    avatarUrl: string
  }
  assets: Array<{
    id: number
    name: string
    size: number
    downloadCount: number
    browserDownloadUrl: string
  }>
  createdAt: string
  publishedAt: string | null
}

export interface GitHubOrg {
  id: number
  login: string
  name: string | null
  description: string | null
  url: string
  htmlUrl: string
  avatarUrl: string
  membersCount?: number
  reposCount?: number
}

// Store Types
export interface CLIState {
  // Pane state
  panes: Record<string, Pane>
  paneTree: PaneTreeNode | null
  activePaneId: string | null
  
  // Command state
  commandHistory: Record<string, CommandHistoryEntry[]> // keyed by paneId
  
  // GitHub state
  user: GitHubUser | null
  token: string | null
  isAuthenticated: boolean
  
  // UI state
  sidebarCollapsed: boolean
  theme: 'dark' | 'light'
  
  // Current context
  currentRepo: string | null
  currentOrg: string | null
}

export interface CLIActions {
  // Pane actions
  createPane: (options: Partial<Pane>) => string
  splitPane: (paneId: string, direction: 'horizontal' | 'vertical') => string
  closePane: (paneId: string) => void
  setActivePane: (paneId: string) => void
  resizePane: (paneId: string, size: number) => void
  
  // Command actions
  executeCommand: (paneId: string, command: string) => Promise<void>
  addCommandOutput: (paneId: string, commandId: string, output: Omit<CommandOutput, 'id' | 'timestamp'>) => void
  clearHistory: (paneId: string) => void
  
  // Auth actions
  setUser: (user: GitHubUser | null) => void
  setToken: (token: string | null) => void
  logout: () => void
  
  // UI actions
  toggleSidebar: () => void
  setTheme: (theme: 'dark' | 'light') => void
  
  // Context actions
  setCurrentRepo: (repo: string | null) => void
  setCurrentOrg: (org: string | null) => void
}

export type CLIStore = CLIState & CLIActions

// SSE Event Types
export interface SSEEvent {
  type: 'output' | 'progress' | 'complete' | 'error'
  data: unknown
  timestamp: number
}
