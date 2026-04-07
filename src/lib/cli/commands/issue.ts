// Issue Commands
import type { CommandDefinition, CommandResult, ParsedCommand, CommandContext } from '../types'
import { GitHubService } from '../github-service'
import { parseRepoArg, parseNumberArg } from '../command-parser'

export const issueCommands: CommandDefinition = {
  name: 'issue',
  description: 'Manage issues',
  usage: 'gh issue <subcommand> [flags]',
  subcommands: [
    { name: 'list', description: 'List issues', usage: 'gh issue list <repo> [flags]', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'view', description: 'View an issue', usage: 'gh issue view <repo> <number>', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'create', description: 'Create an issue', usage: 'gh issue create <repo> --title <title>', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'close', description: 'Close an issue', usage: 'gh issue close <repo> <number>', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'reopen', description: 'Reopen an issue', usage: 'gh issue reopen <repo> <number>', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'edit', description: 'Edit an issue', usage: 'gh issue edit <repo> <number> [flags]', handler: async () => ({ success: true, outputs: [] }) }
  ],
  flags: [
    { name: 'state', shorthand: 's', description: 'Filter by state: open, closed, all', type: 'string', default: 'open' },
    { name: 'limit', shorthand: 'L', description: 'Maximum number of items to fetch', type: 'number', default: 30 },
    { name: 'label', shorthand: 'l', description: 'Filter by label', type: 'string' },
    { name: 'title', shorthand: 't', description: 'Issue title', type: 'string' },
    { name: 'body', shorthand: 'b', description: 'Issue body', type: 'string' }
  ],
  examples: [
    'gh issue list owner/repo',
    'gh issue list owner/repo --state=all --limit=10',
    'gh issue view owner/repo 123',
    'gh issue create owner/repo --title="Bug report" --body="Description"',
    'gh issue close owner/repo 123'
  ],
  handler: async (args, context) => {
    const subcommand = args.subcommand || 'list'

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
        return handleList(args, context, github)
      case 'view':
        return handleView(args, context, github)
      case 'create':
        return handleCreate(args, context, github)
      case 'close':
        return handleClose(args, context, github)
      case 'reopen':
        return handleReopen(args, context, github)
      case 'edit':
        return handleEdit(args, context, github)
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

async function handleList(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    
    if (!repoArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository required. Usage: gh issue list owner/repo'
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

    const state = args.flags.state as 'open' | 'closed' | 'all' | undefined
    const limit = (args.flags.limit as number) || (args.flags.L as number) || 30
    const labels = args.flags.label as string | undefined

    const issues = await github.listIssues(parsed.owner, parsed.repo, {
      state: state || 'open',
      per_page: Math.min(limit, 100),
      labels
    })

    if (issues.length === 0) {
      return {
        success: true,
        outputs: [{
          type: 'info',
          content: `No issues found in ${repoArg}`
        }]
      }
    }

    const table = issues.map(issue => {
      const state = issue.state === 'open' ? 'OPEN' : 'CLOSED'
      const title = issue.title.slice(0, 50) + (issue.title.length > 50 ? '...' : '')
      const labels = issue.labels.map(l => l.name).slice(0, 2).join(', ')
      return `#${issue.number.toString().padEnd(6)} ${state.padEnd(7)} ${title.padEnd(52)} ${labels}`
    }).join('\n')

    return {
      success: true,
      outputs: [{
        type: 'table',
        content: `${'NUMBER'.padEnd(7)} ${'STATE'.padEnd(7)} ${'TITLE'.padEnd(52)} LABELS\n${table}`,
        metadata: { issues }
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to list issues: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleView(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    const numberArg = args.args[1]
    
    if (!repoArg || !numberArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository and issue number required. Usage: gh issue view owner/repo 123'
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

    const issueNumber = parseNumberArg(numberArg)
    if (!issueNumber) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid issue number.'
        }]
      }
    }

    const issue = await github.getIssue(parsed.owner, parsed.repo, issueNumber)

    const labels = issue.labels.length > 0 
      ? issue.labels.map(l => l.name).join(', ') 
      : 'None'
    
    const assignees = issue.assignees.length > 0 
      ? issue.assignees.map(a => a.login).join(', ') 
      : 'None'

    const content = `
#${issue.number}: ${issue.title}
${'='.repeat(Math.min(issue.title.length + 10, 60))}

State: ${issue.state.toUpperCase()}
Author: ${issue.user.login}
Labels: ${labels}
Assignees: ${assignees}
Comments: ${issue.comments}

Created: ${new Date(issue.createdAt).toLocaleString()}
Updated: ${new Date(issue.updatedAt).toLocaleString()}
${issue.closedAt ? `Closed: ${new Date(issue.closedAt).toLocaleString()}` : ''}

${issue.body || 'No description provided.'}

View on GitHub: ${issue.htmlUrl}
`

    return {
      success: true,
      outputs: [{
        type: 'info',
        content,
        metadata: { issue }
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to view issue: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleCreate(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    
    if (!repoArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository required. Usage: gh issue create owner/repo --title="Title"'
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

    const title = (args.flags.title as string) || (args.flags.t as string)
    const body = (args.flags.body as string) || (args.flags.b as string)

    if (!title) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Issue title required. Use --title="Your title"'
        }]
      }
    }

    const issue = await github.createIssue(parsed.owner, parsed.repo, {
      title,
      body
    })

    return {
      success: true,
      outputs: [{
        type: 'success',
        content: `Created issue #${issue.number}: ${issue.title}

View at: ${issue.htmlUrl}
`
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to create issue: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleClose(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    const numberArg = args.args[1]
    
    if (!repoArg || !numberArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository and issue number required. Usage: gh issue close owner/repo 123'
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

    const issueNumber = parseNumberArg(numberArg)
    if (!issueNumber) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid issue number.'
        }]
      }
    }

    const issue = await github.closeIssue(parsed.owner, parsed.repo, issueNumber)

    return {
      success: true,
      outputs: [{
        type: 'success',
        content: `Closed issue #${issue.number}: ${issue.title}`
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to close issue: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleReopen(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    const numberArg = args.args[1]
    
    if (!repoArg || !numberArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository and issue number required. Usage: gh issue reopen owner/repo 123'
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

    const issueNumber = parseNumberArg(numberArg)
    if (!issueNumber) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid issue number.'
        }]
      }
    }

    const issue = await github.reopenIssue(parsed.owner, parsed.repo, issueNumber)

    return {
      success: true,
      outputs: [{
        type: 'success',
        content: `Reopened issue #${issue.number}: ${issue.title}`
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to reopen issue: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleEdit(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    const numberArg = args.args[1]
    
    if (!repoArg || !numberArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository and issue number required. Usage: gh issue edit owner/repo 123 --title="New title"'
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

    const issueNumber = parseNumberArg(numberArg)
    if (!issueNumber) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid issue number.'
        }]
      }
    }

    const title = (args.flags.title as string) || (args.flags.t as string)
    const body = (args.flags.body as string) || (args.flags.b as string)

    if (!title && !body) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'At least one of --title or --body required.'
        }]
      }
    }

    const issue = await github.updateIssue(parsed.owner, parsed.repo, issueNumber, {
      title,
      body
    })

    return {
      success: true,
      outputs: [{
        type: 'success',
        content: `Updated issue #${issue.number}: ${issue.title}`
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to edit issue: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}
