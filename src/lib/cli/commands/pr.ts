// Pull Request Commands
import type { CommandDefinition, CommandResult, ParsedCommand, CommandContext } from '../types'
import { GitHubService } from '../github-service'
import { parseRepoArg, parseNumberArg } from '../command-parser'

export const prCommands: CommandDefinition = {
  name: 'pr',
  description: 'Manage pull requests',
  usage: 'gh pr <subcommand> [flags]',
  subcommands: [
    { name: 'list', description: 'List pull requests', usage: 'gh pr list <repo> [flags]', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'view', description: 'View a pull request', usage: 'gh pr view <repo> <number>', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'create', description: 'Create a pull request', usage: 'gh pr create <repo> --title <title> --head <branch> --base <branch>', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'merge', description: 'Merge a pull request', usage: 'gh pr merge <repo> <number>', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'close', description: 'Close a pull request', usage: 'gh pr close <repo> <number>', handler: async () => ({ success: true, outputs: [] }) },
    { name: 'diff', description: 'View pull request diff', usage: 'gh pr diff <repo> <number>', handler: async () => ({ success: true, outputs: [] }) }
  ],
  flags: [
    { name: 'state', shorthand: 's', description: 'Filter by state: open, closed, all', type: 'string', default: 'open' },
    { name: 'limit', shorthand: 'L', description: 'Maximum number of items to fetch', type: 'number', default: 30 },
    { name: 'title', shorthand: 't', description: 'PR title', type: 'string' },
    { name: 'body', shorthand: 'b', description: 'PR body', type: 'string' },
    { name: 'head', shorthand: 'H', description: 'Source branch', type: 'string' },
    { name: 'base', shorthand: 'B', description: 'Target branch', type: 'string' },
    { name: 'draft', shorthand: 'd', description: 'Create as draft', type: 'boolean' },
    { name: 'squash', description: 'Squash merge', type: 'boolean' },
    { name: 'rebase', description: 'Rebase merge', type: 'boolean' }
  ],
  examples: [
    'gh pr list owner/repo',
    'gh pr list owner/repo --state=all',
    'gh pr view owner/repo 123',
    'gh pr create owner/repo --title="Feature" --head=feature-branch --base=main',
    'gh pr merge owner/repo 123 --squash'
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
      case 'merge':
        return handleMerge(args, context, github)
      case 'close':
        return handleClose(args, context, github)
      case 'diff':
        return handleDiff(args, context, github)
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
          content: 'Repository required. Usage: gh pr list owner/repo'
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

    const prs = await github.listPullRequests(parsed.owner, parsed.repo, {
      state: state || 'open',
      per_page: Math.min(limit, 100)
    })

    if (prs.length === 0) {
      return {
        success: true,
        outputs: [{
          type: 'info',
          content: `No pull requests found in ${repoArg}`
        }]
      }
    }

    const table = prs.map(pr => {
      let state = pr.state.toUpperCase()
      if (pr.merged) state = 'MERGED'
      if (pr.draft) state = 'DRAFT'
      const title = pr.title.slice(0, 45) + (pr.title.length > 45 ? '...' : '')
      const branch = `${pr.head.ref} -> ${pr.base.ref}`
      return `#${pr.number.toString().padEnd(6)} ${state.padEnd(7)} ${title.padEnd(47)} ${branch}`
    }).join('\n')

    return {
      success: true,
      outputs: [{
        type: 'table',
        content: `${'NUMBER'.padEnd(7)} ${'STATE'.padEnd(7)} ${'TITLE'.padEnd(47)} BRANCH\n${table}`,
        metadata: { prs }
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to list pull requests: ${error instanceof Error ? error.message : 'Unknown error'}`
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
          content: 'Repository and PR number required. Usage: gh pr view owner/repo 123'
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

    const prNumber = parseNumberArg(numberArg)
    if (!prNumber) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid PR number.'
        }]
      }
    }

    const pr = await github.getPullRequest(parsed.owner, parsed.repo, prNumber)

    let state = pr.state.toUpperCase()
    if (pr.merged) state = 'MERGED'
    if (pr.draft) state = 'DRAFT'

    const content = `
#${pr.number}: ${pr.title}
${'='.repeat(Math.min(pr.title.length + 10, 60))}

State: ${state}
Author: ${pr.user.login}
Branch: ${pr.head.ref} -> ${pr.base.ref}

Changes: +${pr.additions} -${pr.deletions} in ${pr.changedFiles} files
Commits: ${pr.commits}
Comments: ${pr.comments} | Reviews: ${pr.reviewComments}

Mergeable: ${pr.mergeable === null ? 'Unknown' : pr.mergeable ? 'Yes' : 'No'}

Created: ${new Date(pr.createdAt).toLocaleString()}
Updated: ${new Date(pr.updatedAt).toLocaleString()}
${pr.mergedAt ? `Merged: ${new Date(pr.mergedAt).toLocaleString()}` : ''}

${pr.body || 'No description provided.'}

View on GitHub: ${pr.htmlUrl}
`

    return {
      success: true,
      outputs: [{
        type: 'info',
        content,
        metadata: { pr }
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to view pull request: ${error instanceof Error ? error.message : 'Unknown error'}`
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
          content: 'Repository required. Usage: gh pr create owner/repo --title="Title" --head=branch --base=main'
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
    const head = (args.flags.head as string) || (args.flags.H as string)
    const base = (args.flags.base as string) || (args.flags.B as string) || 'main'
    const draft = args.flags.draft === true || args.flags.d === true

    if (!title) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'PR title required. Use --title="Your title"'
        }]
      }
    }

    if (!head) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Source branch required. Use --head=branch-name'
        }]
      }
    }

    const pr = await github.createPullRequest(parsed.owner, parsed.repo, {
      title,
      body,
      head,
      base,
      draft
    })

    return {
      success: true,
      outputs: [{
        type: 'success',
        content: `Created pull request #${pr.number}: ${pr.title}

${pr.head.ref} -> ${pr.base.ref}

View at: ${pr.htmlUrl}
`
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to create pull request: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleMerge(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    const numberArg = args.args[1]
    
    if (!repoArg || !numberArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository and PR number required. Usage: gh pr merge owner/repo 123'
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

    const prNumber = parseNumberArg(numberArg)
    if (!prNumber) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid PR number.'
        }]
      }
    }

    let mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge'
    if (args.flags.squash) mergeMethod = 'squash'
    if (args.flags.rebase) mergeMethod = 'rebase'

    const result = await github.mergePullRequest(parsed.owner, parsed.repo, prNumber, {
      merge_method: mergeMethod
    })

    if (result.merged) {
      return {
        success: true,
        outputs: [{
          type: 'success',
          content: `Merged pull request #${prNumber}\n${result.message}`
        }]
      }
    } else {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: `Failed to merge: ${result.message}`
        }]
      }
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to merge pull request: ${error instanceof Error ? error.message : 'Unknown error'}`
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
          content: 'Repository and PR number required. Usage: gh pr close owner/repo 123'
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

    const prNumber = parseNumberArg(numberArg)
    if (!prNumber) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid PR number.'
        }]
      }
    }

    const pr = await github.closePullRequest(parsed.owner, parsed.repo, prNumber)

    return {
      success: true,
      outputs: [{
        type: 'success',
        content: `Closed pull request #${pr.number}: ${pr.title}`
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to close pull request: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}

async function handleDiff(args: ParsedCommand, context: CommandContext, github: GitHubService): Promise<CommandResult> {
  try {
    const repoArg = args.args[0]
    const numberArg = args.args[1]
    
    if (!repoArg || !numberArg) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Repository and PR number required. Usage: gh pr diff owner/repo 123'
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

    const prNumber = parseNumberArg(numberArg)
    if (!prNumber) {
      return {
        success: false,
        outputs: [{
          type: 'error',
          content: 'Invalid PR number.'
        }]
      }
    }

    const pr = await github.getPullRequest(parsed.owner, parsed.repo, prNumber)

    return {
      success: true,
      outputs: [{
        type: 'info',
        content: `Pull Request #${pr.number} Diff Summary

Changes: +${pr.additions} -${pr.deletions}
Files Changed: ${pr.changedFiles}
Commits: ${pr.commits}

View full diff at: ${pr.diffUrl}
`
      }]
    }
  } catch (error) {
    return {
      success: false,
      outputs: [{
        type: 'error',
        content: `Failed to get PR diff: ${error instanceof Error ? error.message : 'Unknown error'}`
      }]
    }
  }
}
