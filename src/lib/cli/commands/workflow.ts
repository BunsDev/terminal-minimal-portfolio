// Workflow/Actions Commands
import type { CommandDefinition, CommandResult, ParsedCommand, CommandContext } from '../types'
import { GitHubService } from '../github-service'
import { parseRepoArg, parseNumberArg } from '../command-parser'

export const workflowCommands: CommandDefinition = {
  name: 'workflow',
  description: 'Manage GitHub Actions workflows',
  usage: 'gh workflow <subcommand> [flags]',
  subcommands: [
    { name: 'list', description: 'List workflows', usage: 'gh workflow list <repo>', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'run', description: 'Trigger a workflow', usage: 'gh workflow run <repo> <workflow> [flags]', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'view', description: 'View workflow runs', usage: 'gh run list <repo> [flags]', handler: async () => ({ success: true, outputs: [] }) }
  ],
  flags: [
    { name: 'limit', shorthand: 'L', description: 'Maximum number of items to fetch', type: 'number', default: 30 },
    { name: 'status', shorthand: 's', description: 'Filter by status: queued, in_progress, completed', type: 'string' },
    { name: 'ref', shorthand: 'r', description: 'Git ref to run workflow on', type: 'string' }
  ],
  examples: [
    'gh workflow list owner/repo',
    'gh run list owner/repo',
    'gh run list owner/repo --status=completed --limit=10',
    'gh workflow run owner/repo ci.yml --ref=main',
    'gh run view owner/repo 12345'
  ],
  handler: async (args, context) => {
    // Handle both 'workflow' and 'run' commands
    let subcommand = args.subcommand
    
    // If called as 'run', treat subcommand differently
    if (args.command === 'run') {
      if (!subcommand || subcommand === 'list') {
        subcommand = 'runs'
      } else if (subcommand === 'view') {
        subcommand = 'run-view'
      } else if (subcommand === 'watch') {
        subcommand = 'run-watch'
      } else if (subcommand === 'cancel') {
        subcommand = 'run-cancel'
      } else if (subcommand === 'rerun') {
        subcommand = 'run-rerun'
      }
    } else {
      subcommand = subcommand || 'list'
    }

    if (!context.token) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Authentication required. Please sign in with GitHub.'
        }]
      }
    }

    const github = new GitHubService(context.token)

    switch (subcommand) {
      case 'list':
        return handleWorkflowList(args, context, github)
      case 'run':
        return handleWorkflowRun(args, context, github)
      case 'runs':
        return handleRunList(args, context, github)
      case 'run-view':
      case 'view':
        return handleRunView(args, context, github)
      case 'run-watch':
      case 'watch':
        return handleRunWatch(args, context, github)
      case 'run-cancel':
      case 'cancel':
        return handleRunCancel(args, context, github)
      case 'run-rerun':
      case 'rerun':
        return handleRunRerun(args, context, github)
      default:
        return {
          success: false,
          outputs: [{
            type: 'error',
            content: `Unknown subcommand: ${subcommand}`
          }]
        }
    }
  }
}

async function handleWorkflowList(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    
    if (!repoArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository required. Usage: gh workflow list owner/repo'
        }]
      }
    }

    const parsed = parseRepoArg(repoArg)
    if (!parsed) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid repository format. Use owner/repo format.'
        }]
      }
    }

    const workflows = await github.listWorkflows(parsed.owner, parsed.repo)

    if (workflows.length === 0) {
      return {
        success: true,
        outputs: [{
          type: 'info',
          content: `No workflows found in ${repoArg}`
        }]
      }
    }

    const table = workflows.map(wf => {
      const state = wf.state === 'active' ? 'ACTIVE' : 'DISABLED'
      const name = wf.name.slice(0, 35) + (wf.name.length > 35 ? '...' : '')
      return `${wf.id.toString().padEnd(12)} ${state.padEnd(10)} ${name.padEnd(37)} ${wf.path}`
    }).join('\n')

    return {
      success: true,
      outputs: [{
        type: 'table',
        content: `${'ID'.padEnd(12)} ${'STATE'.padEnd(10)} ${'NAME'.padEnd(37)} PATH\n${table}`,
        metadata: { workflows }
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to list workflows: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleWorkflowRun(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    const workflowArg = args.args[1]
    
    if (!repoArg || !workflowArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository and workflow required. Usage: gh workflow run owner/repo workflow.yml --ref=main'
        }]
      }
    }

    const parsed = parseRepoArg(repoArg)
    if (!parsed) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid repository format. Use owner/repo format.'
        }]
      }
    }

    const ref = (args.flags.ref as string) || (args.flags.r as string) || 'main'

    await github.triggerWorkflow(parsed.owner, parsed.repo, workflowArg, ref)

    return {
      success: true,
      outputs: [{
        type: 'success',
        content: `Triggered workflow ${workflowArg} on ${ref}

Use "gh run list ${repoArg}" to see the status.
`
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to trigger workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleRunList(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    
    if (!repoArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository required. Usage: gh run list owner/repo'
        }]
      }
    }

    const parsed = parseRepoArg(repoArg)
    if (!parsed) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid repository format. Use owner/repo format.'
        }]
      }
    }

    const status = args.flags.status as 'queued' | 'in_progress' | 'completed' | undefined
    const limit = (args.flags.limit as number) || (args.flags.L as number) || 30

    const runs = await github.listWorkflowRuns(parsed.owner, parsed.repo, {
      status,
      per_page: Math.min(limit, 100)
    })

    if (runs.length === 0) {
      return {
        success: true,
        outputs: [{
          type: 'info',
          content: `No workflow runs found in ${repoArg}`
        }]
      }
    }

    const table = runs.map(run => {
      let status = run.status.toUpperCase()
      if (run.conclusion) {
        status = run.conclusion.toUpperCase()
      }
      const statusIcon = getStatusIcon(run.status, run.conclusion)
      const name = run.name.slice(0, 30) + (run.name.length > 30 ? '...' : '')
      const date = new Date(run.createdAt).toLocaleDateString()
      return `${run.id.toString().padEnd(12)} ${statusIcon} ${status.padEnd(12)} ${name.padEnd(32)} ${run.headBranch.padEnd(20)} ${date}`
    }).join('\n')

    return {
      success: true,
      outputs: [{
        type: 'table',
        content: `${'ID'.padEnd(12)}   ${'STATUS'.padEnd(12)} ${'NAME'.padEnd(32)} ${'BRANCH'.padEnd(20)} DATE\n${table}`,
        metadata: { runs }
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to list runs: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleRunView(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    const runIdArg = args.args[1]
    
    if (!repoArg || !runIdArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository and run ID required. Usage: gh run view owner/repo 12345'
        }]
      }
    }

    const parsed = parseRepoArg(repoArg)
    if (!parsed) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid repository format. Use owner/repo format.'
        }]
      }
    }

    const runId = parseNumberArg(runIdArg)
    if (!runId) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid run ID.'
        }]
      }
    }

    const run = await github.getWorkflowRun(parsed.owner, parsed.repo, runId)

    let status = run.status
    if (run.conclusion) {
      status = run.conclusion
    }
    const statusIcon = getStatusIcon(run.status, run.conclusion)

    const content = `
${run.name} #${run.runNumber}
${'='.repeat(Math.min(run.name.length + 10, 60))}

Status: ${statusIcon} ${status.toUpperCase()}
Event: ${run.event}
Branch: ${run.headBranch}
Commit: ${run.headSha.slice(0, 7)}

Attempt: ${run.runAttempt}
Started: ${new Date(run.runStartedAt).toLocaleString()}
Updated: ${new Date(run.updatedAt).toLocaleString()}

View on GitHub: ${run.htmlUrl}
`

    return {
      success: true,
      outputs: [{
        type: 'info',
        content,
        metadata: { run }
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to view run: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleRunWatch(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  const repoArg = args.args[0]
  const runIdArg = args.args[1]
  
  if (!repoArg || !runIdArg) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: 'Repository and run ID required. Usage: gh run watch owner/repo 12345'
      }]
    }
  }

  // Return data that signals SSE streaming should be used
  return {
    success: true,
    outputs: [{
      type: 'info',
      content: 'Starting watch mode... (updates every 5 seconds)'
    }],
    data: { 
      action: 'watch-run',
      repo: repoArg,
      runId: runIdArg
    }
  }
}

async function handleRunCancel(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    const runIdArg = args.args[1]
    
    if (!repoArg || !runIdArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository and run ID required. Usage: gh run cancel owner/repo 12345'
        }]
      }
    }

    const parsed = parseRepoArg(repoArg)
    if (!parsed) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid repository format. Use owner/repo format.'
        }]
      }
    }

    const runId = parseNumberArg(runIdArg)
    if (!runId) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid run ID.'
        }]
      }
    }

    await github.cancelWorkflowRun(parsed.owner, parsed.repo, runId)

    return {
      success: true,
      outputs: [{
        type: 'success',
        content: `Cancelled workflow run ${runId}`
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to cancel run: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleRunRerun(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    const runIdArg = args.args[1]
    
    if (!repoArg || !runIdArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository and run ID required. Usage: gh run rerun owner/repo 12345'
        }]
      }
    }

    const parsed = parseRepoArg(repoArg)
    if (!parsed) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid repository format. Use owner/repo format.'
        }]
      }
    }

    const runId = parseNumberArg(runIdArg)
    if (!runId) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid run ID.'
        }]
      }
    }

    await github.rerunWorkflow(parsed.owner, parsed.repo, runId)

    return {
      success: true,
      outputs: [{
        type: 'success',
        content: `Re-running workflow run ${runId}

Use "gh run view ${repoArg} ${runId}" to see the status.
`
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to rerun workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

function getStatusIcon(status: string, conclusion: string | null): string {
  if (conclusion) {
    switch (conclusion) {
      case 'success': return '*'
      case 'failure': return 'X'
      case 'cancelled': return '-'
      case 'skipped': return '-'
      case 'timed_out': return '!'
      default: return '?'
    }
  }
  switch (status) {
    case 'queued': return '~'
    case 'in_progress': return '>'
    case 'waiting': return '.'
    default: return '?'
  }
}
